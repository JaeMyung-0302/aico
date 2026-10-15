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
  // 기본 동작(router.back) 대신 실행할 뒤로 가기 (예: 동의 화면에서 로그아웃)
  onBackPress?: () => void
  right?: ReactNode
}

const handleBackPress = () => {
  if (router.canGoBack()) router.back()
}

const AppHeader = ({ title, hasBack = true, onBackPress, right }: AppHeaderProps) => {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + SPACING.xs }]}>
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
      <AppText variant="title3" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      {right}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs + 2,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, paddingHorizontal: SPACING.xs },
})

export default AppHeader
