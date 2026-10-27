import type { ReactNode } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }

// 테스트에서 useSafeAreaInsets를 쓰는 컴포넌트(BottomSheet, AppHeader)를 렌더할 때 감싼다
export const SafeAreaTestProvider = ({ children }: { children: ReactNode }) => (
  <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>
)
