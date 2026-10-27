import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { FONT_FAMILY } from '@/design-system/tokens/typography'

const DISMISSED_KEY = 'home:widget-hint-dismissed'

// 한 번 닫으면 이 기기에서는 다시 보이지 않는다. 저장값을 읽기 전에는 숨겨 둔다(깜빡임 방지)
const useWidgetHint = () => {
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    let isActive = true
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((value) => {
        if (isActive) setIsVisible(value !== '1')
      })
      .catch(() => undefined)
    return () => {
      isActive = false
    }
  }, [])
  const dismiss = () => {
    setIsVisible(false)
    AsyncStorage.setItem(DISMISSED_KEY, '1').catch(() => undefined)
  }
  return { isVisible, dismiss }
}

// SCR-03 위젯 추가 안내
const WidgetHint = () => {
  const { isVisible, dismiss } = useWidgetHint()
  if (!isVisible) return null
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <AppText variant="captionStrong" style={styles.badgeText}>
          D+
        </AppText>
      </View>
      <View style={styles.texts}>
        <AppText variant="labelStrong">홈 화면에 D-day 위젯 추가</AppText>
        <AppText variant="micro" color="ink2" style={styles.caption}>
          홈 화면을 길게 눌러 위젯을 추가해 보세요
        </AppText>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="안내 닫기" onPress={dismiss} style={styles.close}>
        <Icon name="close" size={18} color="ink3" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: FONT_FAMILY.serifBold },
  texts: { flex: 1, gap: 2 },
  caption: { fontSize: 12 },
  close: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
})

export default WidgetHint
