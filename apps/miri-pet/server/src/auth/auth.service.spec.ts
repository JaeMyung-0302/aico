import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { uniqueViolation } from '../../test/helpers/prisma-errors'
import { PrismaService } from '../prisma/prisma.service'
import { AuthService } from './auth.service'
import { IdTokenVerifier } from './id-token-verifier'
import { SessionService } from './session.service'

const TOKENS = { accessToken: 'a', refreshToken: 'r', accessTokenExpiresIn: 900 }
const USER_ID = '0199e3a0-0000-7000-8000-000000000001'

describe('AuthService', () => {
  let prisma: FakePrisma
  let service: AuthService
  const verifier = { verify: jest.fn() }
  const sessions = { issue: jest.fn() }

  beforeEach(async () => {
    jest.resetAllMocks()
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: IdTokenVerifier, useValue: verifier },
        { provide: SessionService, useValue: sessions },
      ],
    }).compile()
    service = moduleRef.get(AuthService)
    sessions.issue.mockResolvedValue(TOKENS)
    verifier.verify.mockResolvedValue({ provider: 'KAKAO', sub: 'kakao-1' })
  })

  describe('socialLogin', () => {
    it('처음 보는 (provider, sub)면 User+AuthAccount를 만들고 isNewUser=true', async () => {
      prisma.authAccount.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: USER_ID, role: 'USER', status: 'ACTIVE' })

      const result = await service.socialLogin('KAKAO', { idToken: 'id-token', deviceLabel: 'iPhone' })

      expect(verifier.verify).toHaveBeenCalledWith('KAKAO', 'id-token')
      const data = prisma.user.create.mock.calls[0][0].data
      expect(data.authAccounts).toEqual({ create: { provider: 'KAKAO', providerSub: 'kakao-1' } })
      expect(data.nickname).toMatch(/^[0-9A-Za-z가-힣._]{2,20}$/)
      expect(sessions.issue).toHaveBeenCalledWith({ id: USER_ID, role: 'USER' }, 'iPhone')
      expect(result).toEqual({ ...TOKENS, isNewUser: true })
    })

    it('이미 연결된 계정이면 기존 User로 로그인하고 isNewUser=false', async () => {
      prisma.authAccount.findUnique.mockResolvedValue({ user: { id: USER_ID, role: 'USER', status: 'ACTIVE' } })

      const result = await service.socialLogin('KAKAO', { idToken: 'id-token' })

      expect(prisma.user.create).not.toHaveBeenCalled()
      expect(sessions.issue).toHaveBeenCalledWith({ id: USER_ID, role: 'USER' }, undefined)
      expect(result.isNewUser).toBe(false)
    })

    it('정지된 계정은 403', async () => {
      prisma.authAccount.findUnique.mockResolvedValue({ user: { id: USER_ID, role: 'USER', status: 'SUSPENDED' } })
      await expect(service.socialLogin('KAKAO', { idToken: 't' })).rejects.toBeInstanceOf(ForbiddenException)
      expect(sessions.issue).not.toHaveBeenCalled()
    })

    it('id_token 검증 실패는 그대로 401', async () => {
      verifier.verify.mockRejectedValue(new UnauthorizedException())
      await expect(service.socialLogin('GOOGLE', { idToken: 'bad' })).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('동시 가입 경쟁으로 유니크 위반이 나면 먼저 만들어진 계정으로 로그인한다', async () => {
      prisma.authAccount.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ user: { id: USER_ID, role: 'USER', status: 'ACTIVE' } })
      prisma.user.create.mockRejectedValue(uniqueViolation('provider_providerSub'))

      const result = await service.socialLogin('KAKAO', { idToken: 't' })
      expect(result.isNewUser).toBe(false)
    })

    it('유니크 위반 외의 DB 에러는 다시 던진다', async () => {
      prisma.authAccount.findUnique.mockResolvedValue(null)
      prisma.user.create.mockRejectedValue(new Error('db down'))
      await expect(service.socialLogin('KAKAO', { idToken: 't' })).rejects.toThrow('db down')
    })
  })

  describe('devLogin', () => {
    it('닉네임 사용자가 없으면 만들고 isNewUser=true', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: USER_ID, role: 'USER', status: 'ACTIVE' })

      const result = await service.devLogin({ nickname: '테스터' })

      expect(prisma.user.create).toHaveBeenCalledWith({ data: { nickname: '테스터' } })
      expect(result.isNewUser).toBe(true)
    })

    it('있으면 그 사용자로 로그인', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: 'USER', status: 'ACTIVE' })
      const result = await service.devLogin({ nickname: '테스터' })
      expect(sessions.issue).toHaveBeenCalledWith({ id: USER_ID, role: 'USER' }, 'dev')
      expect(result.isNewUser).toBe(false)
    })

    it('ADMIN 계정은 dev 로그인 불가 — 비활성화된 라우트와 같은 404', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: 'ADMIN', status: 'ACTIVE' })
      await expect(service.devLogin({ nickname: '운영자' })).rejects.toBeInstanceOf(NotFoundException)
      expect(sessions.issue).not.toHaveBeenCalled()
    })

    it('ACTIVE가 아닌 사용자는 403', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: 'USER', status: 'DELETED' })
      await expect(service.devLogin({ nickname: '테스터' })).rejects.toBeInstanceOf(ForbiddenException)
    })
  })
})
