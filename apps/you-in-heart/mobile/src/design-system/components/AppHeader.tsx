import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS } from '../tokens/colors'
import { SPACING, TOUCH_TARGET } from '../tokens/spacing'
import AppText from './AppText'
import Icon from './Icon'

type AppHeaderProps = {
  title?: string
  hasBack?: boolean
  // 기본 동작(router.back) 대신 실행할 뒤로 가기
  onBackPress?: () => void
  right?: ReactNode
}

// 스택에 이 화면 하나뿐이면(딥링크 콜드 스타트) 홈으로 대체한다 — 뒤로가 먹통이 되지 않게
const handleBackPress = () => {
  if (router.canGoBack()) router.back()
  else router.replace('/')
}

// SCR-02·16 상단: 44px, 가운데 제목(16 bold), 테두리 없음
const AppHeader = ({ title, hasBack = true, onBackPress, right }: AppHeaderProps) => {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + SPACING[2] }]}>
      <View style={styles.side}>
        {hasBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            onPress={onBackPress ?? handleBackPress}
            style={styles.icon}
          >
            <Icon name="back" />
          </Pressable>
        ) : null}
      </View>
      <AppText variant="bodyStrong" style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </AppText>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[3],
    paddingBottom: SPACING[1],
    backgroundColor: COLORS.bg,
  },
  side: { width: TOUCH_TARGET, height: TOUCH_TARGET },
  right: { alignItems: 'flex-end' },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 16 },
})

export default AppHeader
