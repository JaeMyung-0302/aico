import * as Linking from 'expo-linking'

type Destination = { name: string; lat: number; lng: number }
export type DirectionsTarget = 'naver' | 'kakao' | 'web'

const APP_NAME = 'com.aico.miripet'

const candidates = ({ name, lat, lng }: Destination): readonly [DirectionsTarget, string][] => [
  ['naver', `nmap://place?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}&appname=${APP_NAME}`],
  ['kakao', `kakaomap://look?p=${lat},${lng}`],
  ['web', `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`],
]

// 네이버지도 앱 → 카카오맵 앱 → 웹 순서로 연다. 앱이 없으면 openURL이 실패하므로 다음 후보로 넘어간다
export const openDirections = async (destination: Destination): Promise<DirectionsTarget | null> => {
  for (const [target, url] of candidates(destination)) {
    try {
      await Linking.openURL(url)
      return target
    } catch {
      // 다음 후보로
    }
  }
  return null
}
