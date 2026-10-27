import { redirectSystemPath } from '@/app/+native-intent'

jest.mock('expo-share-intent', () => ({ getShareExtensionKey: () => 'youinheartShareKey' }))

describe('+native-intent redirectSystemPath (plan 4D.1)', () => {
  it('공유 확장 딥링크는 루트로 보낸다(이후 useShareRouting 이 연다)', () => {
    expect(redirectSystemPath({ path: 'youinheart://dataUrl=youinheartShareKey#text', initial: true })).toBe('/')
  })

  it('다른 딥링크는 그대로 둔다', () => {
    expect(redirectSystemPath({ path: '/diary/abc', initial: false })).toBe('/diary/abc')
  })
})
