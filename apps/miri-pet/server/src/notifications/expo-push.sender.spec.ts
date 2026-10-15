import { ConfigService } from '@nestjs/config'
import { ExpoPushSender } from './expo-push.sender'
import type { PushMessage } from './push.service'

// expo-server-sdk(ESM, 네트워크)를 통째로 대역으로 바꾼다
const mockExpo = {
  chunkPushNotifications: jest.fn(),
  sendPushNotificationsAsync: jest.fn(),
  chunkPushNotificationReceiptIds: jest.fn(),
  getPushNotificationReceiptsAsync: jest.fn(),
}
const mockExpoConstructor = jest.fn<typeof mockExpo, [{ accessToken?: string }]>(() => mockExpo)

jest.mock('expo-server-sdk', () => ({
  Expo: jest.fn().mockImplementation((options: { accessToken?: string }) => mockExpoConstructor(options)),
}))

const message = (to: string): PushMessage => ({ to, title: 't', body: 'b', sound: 'default' })

describe('ExpoPushSender', () => {
  beforeEach(() => jest.clearAllMocks())

  it('청크를 순서대로 보내 티켓 순서를 메시지 순서와 맞춘다', async () => {
    const sender = new ExpoPushSender(new ConfigService({ expoAccessToken: '' }))
    const [a, b, c] = [message('A'), message('B'), message('C')]
    mockExpo.chunkPushNotifications.mockReturnValue([[a, b], [c]])
    mockExpo.sendPushNotificationsAsync
      .mockResolvedValueOnce([
        { status: 'ok', id: '1' },
        { status: 'ok', id: '2' },
      ])
      .mockResolvedValueOnce([{ status: 'ok', id: '3' }])

    await expect(sender.send([a, b, c])).resolves.toEqual([
      { status: 'ok', id: '1' },
      { status: 'ok', id: '2' },
      { status: 'ok', id: '3' },
    ])
    expect(mockExpo.sendPushNotificationsAsync.mock.calls).toEqual([[[a, b]], [[c]]])
    // 빈 토큰이면 accessToken 없이 만든다
    expect(mockExpoConstructor).toHaveBeenCalledWith({ accessToken: undefined })
  })

  it('receipt 청크 결과를 하나로 합치고, 클라이언트는 한 번만 만든다', async () => {
    const sender = new ExpoPushSender(new ConfigService({ expoAccessToken: 'expo-token' }))
    mockExpo.chunkPushNotificationReceiptIds.mockReturnValue([['r1'], ['r2']])
    mockExpo.getPushNotificationReceiptsAsync
      .mockResolvedValueOnce({ r1: { status: 'ok' } })
      .mockResolvedValueOnce({ r2: { status: 'error', message: 'gone' } })

    await expect(sender.getReceipts(['r1', 'r2'])).resolves.toEqual({
      r1: { status: 'ok' },
      r2: { status: 'error', message: 'gone' },
    })
    mockExpo.chunkPushNotifications.mockReturnValue([])
    await sender.send([])
    expect(mockExpoConstructor).toHaveBeenCalledTimes(1)
    expect(mockExpoConstructor).toHaveBeenCalledWith({ accessToken: 'expo-token' })
  })
})
