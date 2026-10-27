import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { uniqueViolation } from '../../test/helpers/prisma-errors'
import { PrismaService } from '../prisma/prisma.service'
import { AuthService, DEV_SUB_PREFIX } from './auth.service'
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
    it('처음 보는 (provider, sub)면 프로필 없이 User+AuthAccount를 만들고 isNewUser=true', async () => {
      prisma.authAccount.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: USER_ID, status: 'ACTIVE' })

      const result = await service.socialLogin('KAKAO', { idToken: 'id-token', deviceLabel: 'iPhone' })

      expect(verifier.verify).toHaveBeenCalledWith('KAKAO', 'id-token')
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { authAccounts: { create: { provider: 'KAKAO', providerSub: 'kakao-1' } } },
        select: { id: true, status: true },
      })
      expect(sessions.issue).toHaveBeenCalledWith(USER_ID, 'iPhone')
      expect(result).toEqual({ ...TOKENS, isNewUser: true })
    })

    it('이미 연결된 계정이면 기존 User로 로그인하고 isNewUser=false', async () => {
      prisma.authAccount.findUnique.mockResolvedValue({ user: { id: USER_ID, status: 'ACTIVE' } })

      const result = await service.socialLogin('KAKAO', { idToken: 'id-token' })

      expect(prisma.user.create).not.toHaveBeenCalled()
      expect(sessions.issue).toHaveBeenCalledWith(USER_ID, undefined)
      expect(result.isNewUser).toBe(false)
    })

    it('탈퇴(DELETED) 계정은 403', async () => {
      prisma.authAccount.findUnique.mockResolvedValue({ user: { id: USER_ID, status: 'DELETED' } })
      await expect(service.socialLogin('KAKAO', { idToken: 't' })).rejects.toBeInstanceOf(ForbiddenException)
      expect(sessions.issue).not.toHaveBeenCalled()
    })

    it('id_token 검증 실패는 그대로 401이고 DB를 보지 않는다', async () => {
      verifier.verify.mockRejectedValue(new UnauthorizedException())
      await expect(service.socialLogin('KAKAO', { idToken: 'bad' })).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prisma.authAccount.findUnique).not.toHaveBeenCalled()
    })

    it('동시 가입 경쟁으로 유니크 위반이 나면 먼저 만들어진 계정으로 로그인한다', async () => {
      prisma.authAccount.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ user: { id: USER_ID, status: 'ACTIVE' } })
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
    it('devKey를 실제 카카오 sub(숫자)와 겹치지 않는 dev: 접두 sub로 쓴다', async () => {
      expect(DEV_SUB_PREFIX).toBe('dev:')
      prisma.authAccount.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: USER_ID, status: 'ACTIVE' })

      const result = await service.devLogin({ devKey: 'alice' })

      expect(verifier.verify).not.toHaveBeenCalled()
      expect(prisma.user.create.mock.calls[0][0].data).toEqual({
        authAccounts: { create: { provider: 'KAKAO', providerSub: 'dev:alice' } },
      })
      expect(sessions.issue).toHaveBeenCalledWith(USER_ID, 'dev')
      expect(result.isNewUser).toBe(true)
    })

    it('같은 devKey면 기존 사용자로 로그인', async () => {
      prisma.authAccount.findUnique.mockResolvedValue({ user: { id: USER_ID, status: 'ACTIVE' } })
      const result = await service.devLogin({ devKey: 'alice' })
      expect(prisma.authAccount.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { provider_providerSub: { provider: 'KAKAO', providerSub: 'dev:alice' } },
        }),
      )
      expect(result.isNewUser).toBe(false)
    })
  })
})
