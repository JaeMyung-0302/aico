import { ConfigService } from '@nestjs/config'
import { ConfigController } from './config.controller'

const controllerWith = (isGpsEnabled: boolean | undefined) =>
  new ConfigController(new ConfigService(isGpsEnabled === undefined ? {} : { isGpsEnabled }))

describe('ConfigController', () => {
  it('GET /config → isGpsEnabled 플래그', () => {
    expect(controllerWith(true).getConfig()).toEqual({ isGpsEnabled: true })
    expect(controllerWith(false).getConfig()).toEqual({ isGpsEnabled: false })
  })

  it('설정이 없으면 false(위치기반서비스 신고 전 기본값)', () => {
    expect(controllerWith(undefined).getConfig()).toEqual({ isGpsEnabled: false })
  })
})
