import { StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import { SPACING } from '../tokens/spacing'
import AppText from './AppText'

type ToastProps = {
  message: string | null
}

// 화면 하단에 짧은 안내를 띄운다 (SCR-18 오프라인 배너와 같은 진한 바탕). 표시 시간은 호출 쪽 상태가 관리한다
const Toast = ({ message }: ToastProps) => {
  if (!message) return null
  return (
    <View accessibilityLiveRegion="polite" style={styles.toast}>
      <AppText variant="caption" color="bg">
        {message}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: SPACING[4],
    right: SPACING[4],
    bottom: 100,
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[4],
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.ink,
  },
})

export default Toast
