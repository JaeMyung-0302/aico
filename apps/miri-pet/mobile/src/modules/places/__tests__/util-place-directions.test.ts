import * as Linking from 'expo-linking'
import { openDirections } from '../util-place-directions'

jest.mock('expo-linking', () => ({ openURL: jest.fn() }))

const PLACE = { name: '숲길 카페', lat: 37.5447, lng: 127.0565 }

describe('openDirections', () => {
  beforeEach(() => jest.mocked(Linking.openURL).mockReset())

  it('네이버지도 앱이 있으면 앱으로 연다', async () => {
    jest.mocked(Linking.openURL).mockResolvedValue(true)
    await expect(openDirections(PLACE)).resolves.toBe('naver')
    expect(Linking.openURL).toHaveBeenCalledTimes(1)
    expect(jest.mocked(Linking.openURL).mock.calls[0]?.[0]).toBe(
      `nmap://place?lat=37.5447&lng=127.0565&name=${encodeURIComponent('숲길 카페')}&appname=com.aico.miripet`,
    )
  })

  it('네이버지도가 없으면 카카오맵, 둘 다 없으면 웹', async () => {
    jest
      .mocked(Linking.openURL)
      .mockRejectedValueOnce(new Error('no naver'))
      .mockRejectedValueOnce(new Error('no kakao'))
      .mockResolvedValueOnce(true)
    await expect(openDirections(PLACE)).resolves.toBe('web')
    expect(jest.mocked(Linking.openURL).mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/^nmap:\/\//),
      'kakaomap://look?p=37.5447,127.0565',
      `https://map.kakao.com/link/map/${encodeURIComponent('숲길 카페')},37.5447,127.0565`,
    ])
  })

  it('카카오맵 앱이 열리면 거기서 멈춘다', async () => {
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error('no naver')).mockResolvedValueOnce(true)
    await expect(openDirections(PLACE)).resolves.toBe('kakao')
  })

  it('웹까지 실패하면 null', async () => {
    jest.mocked(Linking.openURL).mockRejectedValue(new Error('none'))
    await expect(openDirections(PLACE)).resolves.toBeNull()
  })
})
