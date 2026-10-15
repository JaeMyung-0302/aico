import { NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { DevLoginGuard } from './guards/dev-login.guard'
import { SessionService } from './session.service'

const TOKENS = { accessToken: 'a', refreshToken: 'r', accessTokenExpiresIn: 900 }

describe('AuthController', () => {
  const auth = { socialLogin: jest.fn(), devLogin: jest.fn() }
  const sessions = { rotate: jest.fn(), revoke: jest.fn() }
  let controller: AuthController

  beforeEach(async () => {
    jest.resetAllMocks()
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: SessionService, useValue: sessions },
        { provide: ConfigService, useValue: new ConfigService({ isDevLoginEnabled: false }) },
      ],
    }).compile()
    controller = moduleRef.get(AuthController)
  })

  it('POST /auth/kakao, /auth/google은 제공자를 붙여 위임한다', async () => {
    auth.socialLogin.mockResolvedValue({ ...TOKENS, isNewUser: true })
    await controller.kakao({ idToken: 'k' })
    await controller.google({ idToken: 'g', deviceLabel: 'Pixel' })
    expect(auth.socialLogin).toHaveBeenNthCalledWith(1, 'KAKAO', { idToken: 'k' })
    expect(auth.socialLogin).toHaveBeenNthCalledWith(2, 'GOOGLE', { idToken: 'g', deviceLabel: 'Pixel' })
  })

  it('POST /auth/refresh는 회전된 토큰을 isNewUser=false로 돌려준다', async () => {
    sessions.rotate.mockResolvedValue(TOKENS)
    await expect(controller.refresh({ refreshToken: 'r0' })).resolves.toEqual({ ...TOKENS, isNewUser: false })
    expect(sessions.rotate).toHaveBeenCalledWith('r0')
  })

  it('POST /auth/logout은 해당 refresh 세션을 폐기한다', async () => {
    sessions.revoke.mockResolvedValue(undefined)
    await controller.logout({ refreshToken: 'r0' })
    expect(sessions.revoke).toHaveBeenCalledWith('r0')
  })

  it('POST /auth/dev는 AuthService.devLogin에 위임한다', async () => {
    auth.devLogin.mockResolvedValue({ ...TOKENS, isNewUser: false })
    await controller.dev({ nickname: '테스터' })
    expect(auth.devLogin).toHaveBeenCalledWith({ nickname: '테스터' })
  })
})

describe('DevLoginGuard', () => {
  it('isDevLoginEnabled=false면 라우트가 없는 것처럼 404', () => {
    const guard = new DevLoginGuard(new ConfigService({ isDevLoginEnabled: false }))
    expect(() => guard.canActivate()).toThrow(NotFoundException)
  })

  it('isDevLoginEnabled=true면 통과', () => {
    const guard = new DevLoginGuard(new ConfigService({ isDevLoginEnabled: true }))
    expect(guard.canActivate()).toBe(true)
  })
})
