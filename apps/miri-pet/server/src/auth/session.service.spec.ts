import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { PrismaService } from '../prisma/prisma.service'
import { DmRealtime } from '../realtime/dm-realtime'
import { ACCESS_TOKEN_TTL_SECONDS, hashRefreshToken, REFRESH_REUSE_GRACE_MS, SessionService } from './session.service'

const USER = { id: '0199e3a0-0000-7000-8000-000000000001', role: 'USER' as const }
const DAY_MS = 86_400_000

const activeSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'session-1',
  userId: USER.id,
  revokedAt: null,
  expiresAt: new Date(Date.now() + DAY_MS),
  deviceLabel: 'iPhone',
  user: { id: USER.id, role: 'USER', status: 'ACTIVE' },
  ...overrides,
})

describe('SessionService', () => {
  let prisma: FakePrisma
  let service: SessionService
  let jwt: JwtService
  const realtime = { disconnectUser: jest.fn() }

  beforeEach(async () => {
    realtime.disconnectUser.mockReset()
    prisma = createFakePrisma()
    jwt = new JwtService({ secret: 'unit-test-secret' })
    const moduleRef = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: DmRealtime, useValue: realtime },
      ],
    }).compile()
    service = moduleRef.get(SessionService)
    prisma.session.create.mockResolvedValue({ id: 'session-new' })
  })

  describe('issue', () => {
    it('15분 access JWT와 불투명 refresh를 발급하고 DB에는 해시만 저장한다', async () => {
      const tokens = await service.issue(USER, 'Pixel')
      expect(tokens.accessTokenExpiresIn).toBe(ACCESS_TOKEN_TTL_SECONDS)
      const payload = await service.verifyAccessToken(tokens.accessToken)
      expect(payload).toEqual({ sub: USER.id, role: 'USER' })

      const data = prisma.session.create.mock.calls[0][0].data
      expect(data.refreshTokenHash).toBe(hashRefreshToken(tokens.refreshToken))
      expect(data.refreshTokenHash).not.toBe(tokens.refreshToken)
      expect(data.deviceLabel).toBe('Pixel')
      const ttlDays = (data.expiresAt.getTime() - Date.now()) / DAY_MS
      expect(ttlDays).toBeGreaterThan(29.9)
      expect(ttlDays).toBeLessThanOrEqual(30)
    })

    it('발급할 때마다 다른 refresh를 만든다', async () => {
      const a = await service.issue(USER)
      const b = await service.issue(USER)
      expect(a.refreshToken).not.toBe(b.refreshToken)
    })
  })

  describe('verifyAccessToken', () => {
    it('다른 secret으로 서명된 토큰은 401', async () => {
      const forged = await new JwtService({ secret: 'other' }).signAsync({ sub: USER.id, role: 'USER' })
      await expect(service.verifyAccessToken(forged)).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('만료된 토큰은 401', async () => {
      const expired = await jwt.signAsync({ sub: USER.id, role: 'USER' }, { expiresIn: -10 })
      await expect(service.verifyAccessToken(expired)).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('같은 secret이어도 HS256이 아닌 알고리즘(HS512)으로 서명되면 401', async () => {
      const otherAlg = await jwt.signAsync({ sub: USER.id, role: 'USER' }, { algorithm: 'HS512' })
      await expect(service.verifyAccessToken(otherAlg)).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('소켓용: 검증된 토큰의 만료 시각(exp, 초)을 함께 돌려준다', async () => {
      const token = await jwt.signAsync({ sub: USER.id, role: 'USER' }, { expiresIn: 60 })
      const verified = await service.verifyAccessTokenWithExpiry(token)
      expect(verified).toEqual({ sub: USER.id, role: 'USER', exp: expect.any(Number) })
      expect(verified.exp * 1000 - Date.now()).toBeGreaterThan(55_000)
    })

    it('소켓용: exp가 없는 토큰은 401(만료 시각에 끊을 수 없다)', async () => {
      const noExp = await jwt.signAsync({ sub: USER.id, role: 'USER' })
      await expect(service.verifyAccessTokenWithExpiry(noExp)).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('sub·role 형식이 아니면 401', async () => {
      const weird = await jwt.signAsync({ foo: 'bar' })
      await expect(service.verifyAccessToken(weird)).rejects.toBeInstanceOf(UnauthorizedException)
    })
  })

  describe('rotate', () => {
    it('유효한 refresh면 이전 세션을 폐기하고 새 토큰을 발급한다', async () => {
      prisma.session.findUnique.mockResolvedValue(activeSession())
      prisma.session.updateMany.mockResolvedValue({ count: 1 })

      const tokens = await service.rotate('old-refresh')

      expect(prisma.session.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { refreshTokenHash: hashRefreshToken('old-refresh') } }),
      )
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: 'session-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      })
      expect(prisma.session.create.mock.calls[0][0].data.deviceLabel).toBe('iPhone')
      expect(tokens.refreshToken).not.toBe('old-refresh')
    })

    it('없는 refresh는 401', async () => {
      prisma.session.findUnique.mockResolvedValue(null)
      await expect(service.rotate('nope')).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it('유예 시간은 10초다', () => {
      expect(REFRESH_REUSE_GRACE_MS).toBe(10_000)
    })

    it('회전된 지 10초 이내의 refresh 재사용은 401이지만 전 세션 폐기는 하지 않는다(동시 refresh 유예)', async () => {
      prisma.session.findUnique.mockResolvedValue(activeSession({ revokedAt: new Date(Date.now() - 5_000) }))

      await expect(service.rotate('just-rotated')).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prisma.session.updateMany).not.toHaveBeenCalled()
      expect(prisma.session.create).not.toHaveBeenCalled()
    })

    it('유예(10초)가 지난 뒤 회전된 refresh를 재사용하면 그 사용자 세션을 전부 폐기하고 401', async () => {
      prisma.session.findUnique.mockResolvedValue(activeSession({ revokedAt: new Date(Date.now() - 11_000) }))
      prisma.session.updateMany.mockResolvedValue({ count: 3 })

      await expect(service.rotate('reused')).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: USER.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      })
      expect(prisma.session.create).not.toHaveBeenCalled()
    })

    it('동시 요청으로 회전 경쟁에서 지면(count 0) 방금 회전된 것이므로 401만, 전 세션 폐기는 하지 않는다', async () => {
      prisma.session.findUnique.mockResolvedValue(activeSession())
      prisma.session.updateMany.mockResolvedValueOnce({ count: 0 })

      await expect(service.rotate('raced')).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prisma.session.updateMany).toHaveBeenCalledTimes(1)
      expect(prisma.session.create).not.toHaveBeenCalled()
    })

    it('만료된 refresh는 401', async () => {
      prisma.session.findUnique.mockResolvedValue(activeSession({ expiresAt: new Date(Date.now() - 1000) }))
      await expect(service.rotate('expired')).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prisma.session.create).not.toHaveBeenCalled()
    })

    it('정지·탈퇴 사용자는 401', async () => {
      prisma.session.findUnique.mockResolvedValue(
        activeSession({ user: { id: USER.id, role: 'USER', status: 'SUSPENDED' } }),
      )
      await expect(service.rotate('suspended')).rejects.toBeInstanceOf(UnauthorizedException)
      expect(prisma.session.create).not.toHaveBeenCalled()
    })
  })

  describe('revoke / revokeAll', () => {
    it('logout: 해당 refresh 세션만 폐기하고 그 사용자의 DM 소켓을 끊는다(LOW-1)', async () => {
      prisma.session.findUnique.mockResolvedValue({ id: 'session-1', userId: USER.id })
      prisma.session.updateMany.mockResolvedValue({ count: 1 })
      await service.revoke('some-refresh')
      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { refreshTokenHash: hashRefreshToken('some-refresh') },
        select: { id: true, userId: true },
      })
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { id: 'session-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      })
      expect(realtime.disconnectUser).toHaveBeenCalledWith(USER.id)
    })

    it('logout: 없는·이미 폐기된 refresh는 에러 없이 아무것도 끊지 않는다', async () => {
      prisma.session.findUnique.mockResolvedValueOnce(null)
      await service.revoke('unknown-refresh')
      expect(prisma.session.updateMany).not.toHaveBeenCalled()
      prisma.session.findUnique.mockResolvedValueOnce({ id: 'session-1', userId: USER.id })
      prisma.session.updateMany.mockResolvedValueOnce({ count: 0 })
      await service.revoke('revoked-refresh')
      expect(realtime.disconnectUser).not.toHaveBeenCalled()
    })

    it('revokeAll: 사용자의 살아있는 세션을 전부 폐기한다', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 2 })
      await service.revokeAll(USER.id)
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: USER.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      })
      // 정지·토큰 재사용 감지 → 열린 DM 소켓도 끊는다(LOW-1)
      expect(realtime.disconnectUser).toHaveBeenCalledWith(USER.id)
    })
  })

  it('hashRefreshToken은 SHA-256 hex(64자)이고 결정적이다', () => {
    expect(hashRefreshToken('abc')).toMatch(/^[0-9a-f]{64}$/)
    expect(hashRefreshToken('abc')).toBe(hashRefreshToken('abc'))
  })
})
