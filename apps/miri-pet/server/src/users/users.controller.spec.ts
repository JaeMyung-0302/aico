import { GUARDS_METADATA } from '@nestjs/common/constants'
import { Test } from '@nestjs/testing'
import { ALLOW_WITHOUT_CONSENT_KEY } from '../auth/decorators/authenticated.decorator'
import { ConsentGuard } from '../auth/guards/consent.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserThrottleGuard } from '../common/throttle/user-throttle.guard'
import { AccountDeletionService } from './account-deletion.service'
import { ConsentService } from './consent.service'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

const ME = { id: '0199e3a0-0000-7000-8000-0000000000a1', role: 'USER' as const }
const OTHER = '0199e3a0-0000-7000-8000-0000000000b1'

describe('UsersController', () => {
  const users = { getMe: jest.fn(), updateMe: jest.fn(), getProfile: jest.fn() }
  const consents = { submit: jest.fn(), list: jest.fn(), update: jest.fn() }
  const deletion = { deleteAccount: jest.fn() }
  let controller: UsersController

  beforeEach(async () => {
    jest.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: users },
        { provide: ConsentService, useValue: consents },
        { provide: AccountDeletionService, useValue: deletion },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ConsentGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UserThrottleGuard)
      .useValue({ canActivate: () => true })
      .compile()
    controller = moduleRef.get(UsersController)
  })

  it('GET/PATCH /me, GET /users/:id, POST /me/consents, DELETE /me를 로그인 사용자 기준으로 위임한다', async () => {
    users.getMe.mockResolvedValue({ id: ME.id })
    users.updateMe.mockResolvedValue({ id: ME.id })
    users.getProfile.mockResolvedValue({ id: OTHER })

    await expect(controller.getMe(ME)).resolves.toEqual({ id: ME.id })
    await expect(controller.updateMe(ME, { bio: 'hi' })).resolves.toEqual({ id: ME.id })
    await expect(controller.getProfile(ME, OTHER)).resolves.toEqual({ id: OTHER })
    const consentBody = { isAge14OrOlder: true, consents: [{ kind: 'TERMS' as const, version: 'v1' }] }
    await controller.submitConsents(ME, consentBody)
    await controller.deleteMe(ME)

    expect(users.updateMe).toHaveBeenCalledWith(ME.id, { bio: 'hi' })
    expect(users.getProfile).toHaveBeenCalledWith(ME.id, OTHER)
    expect(consents.submit).toHaveBeenCalledWith(ME.id, consentBody)
    expect(deletion.deleteAccount).toHaveBeenCalledWith(ME.id)
  })

  it('GET /me/consents, PATCH /me/consents/:kind를 로그인 사용자 기준으로 위임한다', async () => {
    consents.list.mockResolvedValue([])
    consents.update.mockResolvedValue([])
    await expect(controller.listConsents(ME)).resolves.toEqual([])
    await expect(controller.updateConsent(ME, 'LOCATION', { agreed: false })).resolves.toEqual([])
    expect(consents.list).toHaveBeenCalledWith(ME.id)
    expect(consents.update).toHaveBeenCalledWith(ME.id, 'LOCATION', false)
  })

  it('동의 전에도 열린 라우트는 GET/PATCH /me, POST /me/consents, DELETE /me뿐이다', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, UsersController)).toEqual([JwtAuthGuard, ConsentGuard])
    const open = (['getMe', 'updateMe', 'submitConsents', 'deleteMe', 'getProfile', 'listConsents', 'updateConsent'] as const).filter(
      (name) => Reflect.getMetadata(ALLOW_WITHOUT_CONSENT_KEY, UsersController.prototype[name]) === true,
    )
    expect(open).toEqual(['getMe', 'updateMe', 'submitConsents', 'deleteMe'])
  })
})
