import { ConflictException, type ExecutionContext, ForbiddenException } from '@nestjs/common'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../test/helpers/fake-prisma'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import { CoupleGuard, type CoupleRequest } from './couple.guard'
import { ALLOW_DURING_UNLINKING_KEY } from './decorators/allow-during-unlinking.decorator'
import { ALLOW_WITHOUT_COUPLE_KEY } from './decorators/allow-without-couple.decorator'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'
const COUPLE_ID = '0199e3a0-0000-7000-8000-0000000000c1'

class Probe {}

const contextFor = (req: Partial<CoupleRequest>, metadata: Record<string, boolean> = {}): ExecutionContext => {
  const handler = () => undefined
  Object.entries(metadata).forEach(([key, value]) => Reflect.defineMetadata(key, value, handler))
  return new ExecutionContextHost([req, {}, jest.fn()], Probe, handler)
}

const requestOf = (method: string, isAuthed = true): Partial<CoupleRequest> =>
  isAuthed ? { method, headers: {}, authUser: { id: USER_ID } } : { method, headers: {} }

describe('CoupleGuard', () => {
  let prisma: FakePrisma
  let jwt: { canActivate: jest.Mock }
  let guard: CoupleGuard

  const membership = (status: 'ACTIVE' | 'UNLINKING') => ({ couple: { id: COUPLE_ID, status } })

  beforeEach(async () => {
    prisma = createFakePrisma()
    jwt = { canActivate: jest.fn() }
    const moduleRef = await Test.createTestingModule({
      providers: [CoupleGuard, { provide: JwtAuthGuard, useValue: jwt }, { provide: PrismaService, useValue: prisma }],
    }).compile()
    guard = moduleRef.get(CoupleGuard)
  })

  it('@AllowWithoutCouple 라우트는 인증·DB 조회 없이 통과(공개 라우트·/me 등)', async () => {
    const req = requestOf('POST', false)
    await expect(guard.canActivate(contextFor(req, { [ALLOW_WITHOUT_COUPLE_KEY]: true }))).resolves.toBe(true)
    expect(jwt.canActivate).not.toHaveBeenCalled()
    expect(prisma.coupleMember.findUnique).not.toHaveBeenCalled()
  })

  it('인증 전이면 JwtAuthGuard를 먼저 돌린다(전역 가드는 라우트 가드보다 먼저 실행)', async () => {
    const req = requestOf('GET', false)
    jwt.canActivate.mockImplementation(async () => {
      Object.assign(req, { authUser: { id: USER_ID } })
      return true
    })
    prisma.coupleMember.findUnique.mockResolvedValue(membership('ACTIVE'))
    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true)
    expect(jwt.canActivate).toHaveBeenCalledTimes(1)
    expect(req.couple).toEqual({ id: COUPLE_ID, status: 'ACTIVE' })
  })

  it('커플이 없으면 403', async () => {
    prisma.coupleMember.findUnique.mockResolvedValue(null)
    await expect(guard.canActivate(contextFor(requestOf('GET')))).rejects.toBeInstanceOf(ForbiddenException)
    expect(prisma.coupleMember.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      select: { couple: { select: { id: true, status: true } } },
    })
  })

  it('UNLINKING: GET·HEAD는 통과, POST·PATCH·PUT·DELETE는 409', async () => {
    prisma.coupleMember.findUnique.mockResolvedValue(membership('UNLINKING'))
    await expect(guard.canActivate(contextFor(requestOf('GET')))).resolves.toBe(true)
    await expect(guard.canActivate(contextFor(requestOf('HEAD')))).resolves.toBe(true)
    await Promise.all(
      ['POST', 'PATCH', 'PUT', 'DELETE'].map((method) =>
        expect(guard.canActivate(contextFor(requestOf(method)))).rejects.toBeInstanceOf(ConflictException),
      ),
    )
  })

  it('UNLINKING이어도 @AllowDuringUnlinking 라우트(export·reconnect)는 통과', async () => {
    prisma.coupleMember.findUnique.mockResolvedValue(membership('UNLINKING'))
    const context = contextFor(requestOf('POST'), { [ALLOW_DURING_UNLINKING_KEY]: true })
    await expect(guard.canActivate(context)).resolves.toBe(true)
  })

  it('클라이언트가 보낸 coupleId는 읽지 않는다', async () => {
    prisma.coupleMember.findUnique.mockResolvedValue(membership('ACTIVE'))
    const req: Partial<CoupleRequest> = {
      ...requestOf('GET'),
      params: { coupleId: 'other' },
      query: { coupleId: 'other' },
    }
    await guard.canActivate(contextFor(req))
    expect(req.couple?.id).toBe(COUPLE_ID)
  })
})
