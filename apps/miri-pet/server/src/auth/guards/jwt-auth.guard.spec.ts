import { type ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { createFakePrisma, type FakePrisma } from '../../../test/helpers/fake-prisma'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { Test } from '@nestjs/testing'
import { PrismaService } from '../../prisma/prisma.service'
import { SessionService } from '../session.service'
import { resolveCurrentUser } from '../decorators/current-user.decorator'
import { type AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard'

const USER_ID = '0199e3a0-0000-7000-8000-000000000001'

const contextFor = (req: Partial<AuthenticatedRequest>): ExecutionContext =>
  new ExecutionContextHost([req, {}, jest.fn()])

describe('JwtAuthGuard', () => {
  let prisma: FakePrisma
  const sessions = { verifyAccessToken: jest.fn() }
  let guard: JwtAuthGuard

  beforeEach(async () => {
    jest.resetAllMocks()
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: SessionService, useValue: sessions },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    guard = moduleRef.get(JwtAuthGuard)
  })

  it('Bearer 토큰이 유효하고 ACTIVE 사용자면 req.authUser를 채우고 통과', async () => {
    sessions.verifyAccessToken.mockResolvedValue({ sub: USER_ID, role: 'USER' })
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: 'USER', status: 'ACTIVE' })
    const req: Partial<AuthenticatedRequest> = { headers: { authorization: 'Bearer good' } }

    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
    expect(sessions.verifyAccessToken).toHaveBeenCalledWith('good')
    expect(req.authUser).toEqual({ id: USER_ID, role: 'USER' })
  })

  it('Authorization 헤더가 없으면 401', async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('Bearer 형식이 아니면 401', async () => {
    const req = { headers: { authorization: 'Basic abc' } }
    await expect(guard.canActivate(contextFor(req))).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('토큰은 유효해도 탈퇴·정지된 사용자면 401', async () => {
    sessions.verifyAccessToken.mockResolvedValue({ sub: USER_ID, role: 'USER' })
    prisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: 'USER', status: 'DELETED' })
    const req = { headers: { authorization: 'Bearer good' } }
    await expect(guard.canActivate(contextFor(req))).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('사용자가 없으면 401', async () => {
    sessions.verifyAccessToken.mockResolvedValue({ sub: USER_ID, role: 'USER' })
    prisma.user.findUnique.mockResolvedValue(null)
    const req = { headers: { authorization: 'Bearer good' } }
    await expect(guard.canActivate(contextFor(req))).rejects.toBeInstanceOf(UnauthorizedException)
  })
})

describe('resolveCurrentUser', () => {
  it('가드가 채운 authUser를 돌려준다', () => {
    const user = { id: USER_ID, role: 'USER' as const }
    expect(resolveCurrentUser(undefined, contextFor({ authUser: user }))).toEqual(user)
  })

  it('가드 없이 쓰이면 401', () => {
    expect(() => resolveCurrentUser(undefined, contextFor({}))).toThrow(UnauthorizedException)
  })
})
