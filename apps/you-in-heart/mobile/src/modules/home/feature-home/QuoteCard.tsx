import type { Quote } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { formatQuoteDay } from '@/modules/quote/util-quote/format-quote-date'

const metaOf = (quote: Quote): string => {
  const day = formatQuoteDay(quote.saidAt ?? quote.createdAt)
  return quote.speakerLabel ? `${quote.speakerLabel} · ${day}` : day
}

// SCR-03 간직한 문구 카드: 보관함의 문구 하나(날마다 바뀐다). 없으면 보관함 안내. 누르면 문구 보관함
const QuoteCard = ({ quote }: { quote: Quote | null }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={quote?.text ? `간직한 문구 ${quote.text}` : '간직한 문구 아직 간직한 문구가 없어요'}
    onPress={() => router.push('/quotes')}
    style={styles.card}
  >
    <View style={styles.label}>
      <View style={styles.dot} />
      <AppText variant="micro" color="ink3" style={styles.labelText}>
        간직한 문구
      </AppText>
    </View>
    <AppText variant="title" style={styles.quote} numberOfLines={3}>
      {quote?.text ?? '아직 간직한 문구가 없어요'}
    </AppText>
    <AppText variant="caption" color="ink2">
      {quote ? metaOf(quote) : '카톡에서 마음에 남은 말을 문구 보관함에 담아 두세요'}
    </AppText>
  </Pressable>
)

const styles = StyleSheet.create({
  card: { gap: SPACING[2], padding: 18, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.accent },
  labelText: { fontSize: 12 },
  quote: { fontSize: 17, lineHeight: 26 },
})

export default QuoteCard
