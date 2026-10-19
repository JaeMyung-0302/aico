import { StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { SPACING } from '../tokens/spacing'
import AppText from './AppText'
import Button from './Button'

type EmptyLayoutProps = {
  title: string
  description?: string
  // 불러오기 실패 화면: 있으면 "다시 시도" 버튼을 보여준다
  onRetry?: () => void
}

const EmptyLayout = ({ title, description, onRetry }: EmptyLayoutProps) => (
  <View style={styles.wrap}>
    <AppText variant="title3">{title}</AppText>
    {description ? (
      <AppText variant="callout" color="ink2" style={styles.center}>
        {description}
      </AppText>
    ) : null}
    {onRetry ? <Button label="다시 시도" variant="secondary" size="md" onPress={onRetry} style={styles.retry} /> : null}
  </View>
)

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.xxl,
    backgroundColor: COLORS.ground,
  },
  center: { textAlign: 'center' },
  retry: { marginTop: SPACING.sm, paddingHorizontal: SPACING.xl },
})

export default EmptyLayout
