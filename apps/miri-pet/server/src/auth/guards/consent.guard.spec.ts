import { Controller, ForbiddenException, Get, type ExecutionContext } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Reflector } from '@nestjs/core'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { Test } from '@nestjs/testing'
import { createFakePrisma, type FakePrisma } from '../../../test/helpers/fake-prisma'
import { PrismaService } from '../../prisma/prisma.service'
import { AllowWithoutConsent, Authenticated } from '../decorators/authenticated.decorator'
import { ConsentGuard } from './consent.guard'
import { type AuthenticatedRequest, JwtAuthGuard } from './jwt-auth.guard'

const USER_ID = '0199e3a0-0000-7000-8000-000000000001'

@Controller('sample')
@Authenticated()
class SampleController {
  @Get('strict')
  strict(): string {
    return 'ok'
  }

  @Get('open')
  @AllowWithoutConsent()
  open(): string {
    return 'ok'
  }
}

const contextFor = (req: Partial<AuthenticatedRequest>, handler: keyof SampleController): ExecutionContext => {
  const host = new ExecutionContextHost([req, {}, jest.fn()], SampleController, SampleController.prototype[handler])
  return host
}

// 공유 REQUIRED_CONSENT_KINDS = TERMS·PRIVACY
const ALL_REQUIRED = ['TERMS', 'PRIVACY'].map((kind) => ({ kind }))

describe('ConsentGuard', () => {
  let prisma: FakePrisma
  let guard: ConsentGuard

  beforeEach(async () => {
    prisma = createFakePrisma()
    const moduleRef = await Test.createTestingModule({
      providers: [ConsentGuard, Reflector, { provide: PrismaService, useValue: prisma }],
    }).compile()
    guard = moduleRef.get(ConsentGuard)
  })

  it('필수 동의가 모두 있으면 통과', async () => {
    prisma.consent.findMany.mockResolvedValue(ALL_REQUIRED)
    const req = { authUser: { id: USER_ID, role: 'USER' as const } }
    await expect(guard.canActivate(contextFor(req, 'strict'))).resolves.toBe(true)
    expect(prisma.consent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID, withdrawnAt: null }),
      }),
    )
  })

  it('필수 동의가 하나라도 없으면 403 { code: CONSENT_REQUIRED }', async () => {
    prisma.consent.findMany.mockResolvedValue([{ kind: 'TERMS' }])
    const req = { authUser: { id: USER_ID, role: 'USER' as const } }
    const error: unknown = await guard.canActivate(contextFor(req, 'strict')).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ForbiddenException)
    expect(error instanceof ForbiddenException && error.getResponse()).toMatchObject({ code: 'CONSENT_REQUIRED' })
  })

  it('@AllowWithoutConsent() 라우트는 동의를 조회하지 않고 통과', async () => {
    const req = { authUser: { id: USER_ID, role: 'USER' as const } }
    await expect(guard.canActivate(contextFor(req, 'open'))).resolves.toBe(true)
    expect(prisma.consent.findMany).not.toHaveBeenCalled()
  })

  it('JwtAuthGuard 없이 쓰이면(authUser 없음) 403이 아니라 401', async () => {
    await expect(guard.canActivate(contextFor({}, 'strict'))).rejects.toMatchObject({ status: 401 })
  })
})

describe('@Authenticated()', () => {
  it('JwtAuthGuard → ConsentGuard 순서로 가드를 건다', () => {
    const guards: unknown = Reflect.getMetadata(GUARDS_METADATA, SampleController)
    expect(guards).toEqual([JwtAuthGuard, ConsentGuard])
  })
})
