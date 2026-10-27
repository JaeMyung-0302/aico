import { Stack } from 'expo-router'
import { ShareIntentProvider } from 'expo-share-intent'

// 0B 스파이크용 최소 레이아웃. Phase 0F에서 인증 게이트·폰트·QueryClient를 붙인다
const RootLayout = () => (
  <ShareIntentProvider>
    <Stack screenOptions={{ headerShown: false }} />
  </ShareIntentProvider>
)

export default RootLayout
