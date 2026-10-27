import { StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'

// SCR-03 간직한 문구 카드. 문구는 Phase 4 에서 생기므로 지금은 늘 빈 상태(보관함 안내)
// TODO(4C.5): 저장한 문구 하나를 보여주고 누르면 문구 보관함으로 간다
const QuoteCard = () => (
  <View style={styles.card}>
    <View style={styles.label}>
      <View style={styles.dot} />
      <AppText variant="micro" color="ink3" style={styles.labelText}>
        간직한 문구
      </AppText>
    </View>
    <AppText variant="title" style={styles.quote}>
      아직 간직한 문구가 없어요
    </AppText>
    <AppText variant="caption" color="ink2">
      카톡에서 마음에 남은 말을 문구 보관함에 담아 두세요
    </AppText>
  </View>
)

const styles = StyleSheet.create({
  card: { gap: SPACING[2], padding: 18, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  labelText: { fontSize: 12 },
  quote: { fontSize: 17, lineHeight: 26 },
})

export default QuoteCard
