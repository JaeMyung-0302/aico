import { Logger } from '@nestjs/common'
import { DmRealtime } from './dm-realtime'

const USER_ID = '0199e3a0-0000-7000-8000-0000000000a1'

describe('DmRealtime(보안 리뷰 LOW-1: 로그아웃·정지·탈퇴 시 소켓 끊기)', () => {
  afterEach(() => jest.restoreAllMocks())

  it('게이트웨이가 등록한 disconnector로 그 사용자의 소켓을 끊는다', () => {
    const realtime = new DmRealtime()
    const disconnect = jest.fn()
    realtime.register(disconnect)
    realtime.disconnectUser(USER_ID)
    expect(disconnect).toHaveBeenCalledWith(USER_ID)
  })

  it('게이트웨이가 없으면(운영자 CLI 등) 아무것도 하지 않는다', () => {
    expect(() => new DmRealtime().disconnectUser(USER_ID)).not.toThrow()
  })

  it('끊기 실패는 로그만 남긴다(로그아웃·정지 자체는 성공)', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    const realtime = new DmRealtime()
    realtime.register(() => {
      throw new Error('adapter down')
    })
    expect(() => realtime.disconnectUser(USER_ID)).not.toThrow()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('adapter down'))
  })
})
