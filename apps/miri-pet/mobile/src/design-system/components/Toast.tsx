import { StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { RADIUS } from '../tokens/radius'
import { SPACING } from '../tokens/spacing'
import AppText from './AppText'

type ToastProps = {
  message: string | null
}

// 화면 하단에 짧은 안내를 띄운다. 표시 시간은 호출 쪽 상태가 관리한다
const Toast = ({ message }: ToastProps) => {
  if (!message) return null
  return (
    <View accessibilityLiveRegion="polite" style={styles.toast}>
      <AppText variant="calloutStrong" color="surface">
        {message}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: 100,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.ink,
  },
})

export default Toast
