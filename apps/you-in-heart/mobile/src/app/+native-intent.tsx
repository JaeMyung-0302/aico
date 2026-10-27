import { getShareExtensionKey } from 'expo-share-intent'

// 공유 확장이 여는 딥링크(youinheart://dataUrl=youinheartShareKey…)는 화면 경로가 아니다.
// 첫 화면은 인증 게이트가 정하고, 받은 공유는 루트의 useShareRouting 이 이어서 연다
export const redirectSystemPath = ({ path }: { path: string; initial: boolean }): string => {
  try {
    return path.includes(`dataUrl=${getShareExtensionKey()}`) ? '/' : path
  } catch {
    return '/'
  }
}
