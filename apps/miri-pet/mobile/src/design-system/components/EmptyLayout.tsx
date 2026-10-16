import { StyleSheet, View } from 'react-native'
import { COLORS } from '../tokens/colors'
import { SPACING } from '../tokens/spacing'
import AppText from './AppText'

type EmptyLayoutProps = {
  title: string
  description?: string
}

const EmptyLayout = ({ title, description }: EmptyLayoutProps) => (
  <View style={styles.wrap}>
    <AppText variant="title3">{title}</AppText>
    {description ? (
      <AppText variant="callout" color="ink2" style={styles.center}>
        {description}
      </AppText>
    ) : null}
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
})

export default EmptyLayout
