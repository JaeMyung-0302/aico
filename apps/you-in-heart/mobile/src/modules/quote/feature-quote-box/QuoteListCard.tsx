import type { Quote } from '@you-in-heart/shared'
import { Image } from 'expo-image'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { TYPOGRAPHY } from '@/design-system/tokens/typography'
import { formatQuoteDateTime, formatQuoteDay } from '../util-quote/format-quote-date'

type QuoteListCardProps = { quote: Quote; onMorePress: () => void }

const MoreButton = ({ onPress }: { onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel="문구 더보기" onPress={onPress} style={styles.more}>
    <Icon name="more" size={18} color="ink3" />
  </Pressable>
)

// SCR-13 스크린샷 카드: 썸네일(서명 URL 1시간 → cacheKey 는 quoteId) + 메모 + "스크린샷 · 보낸 사람"
const ScreenshotCard = ({ quote, onMorePress }: QuoteListCardProps) => (
  <View style={[styles.card, styles.shotCard]}>
    <Image
      testID={`quote-shot-${quote.id}`}
      source={quote.screenshotThumbUrl ? { uri: quote.screenshotThumbUrl, cacheKey: `${quote.id}:st` } : null}
      style={styles.shot}
      contentFit="cover"
    />
    {quote.memo ? (
      <AppText variant="label" color="ink2">
        {quote.memo}
      </AppText>
    ) : null}
    <View style={styles.meta}>
      <AppText variant="micro" color="ink3" style={styles.metaText}>
        {quote.speakerLabel ? `스크린샷 · ${quote.speakerLabel}` : '스크린샷'}
      </AppText>
      <AppText variant="micro" color="ink3" style={styles.metaText}>
        {formatQuoteDay(quote.createdAt)}
      </AppText>
      <MoreButton onPress={onMorePress} />
    </View>
  </View>
)

// SCR-13 텍스트 카드: 따옴표 + 세리프 17 본문 + 보낸 사람·보낸 시각
const QuoteListCard = ({ quote, onMorePress }: QuoteListCardProps) => {
  if (quote.source === 'SCREENSHOT') return <ScreenshotCard quote={quote} onMorePress={onMorePress} />
  return (
    <View style={styles.card}>
      <Icon name="quote" size={20} color="accent" />
      <AppText style={styles.text}>{quote.text}</AppText>
      {quote.memo ? (
        <AppText variant="caption" color="ink2">
          {quote.memo}
        </AppText>
      ) : null}
      <View style={styles.meta}>
        <AppText variant="micro" color="ink3" style={styles.metaText}>
          {quote.speakerLabel ?? ''}
        </AppText>
        <AppText variant="micro" color="ink3" style={styles.metaText}>
          {formatQuoteDateTime(quote.saidAt ?? quote.createdAt)}
        </AppText>
        <MoreButton onPress={onMorePress} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { padding: SPACING[5], borderRadius: RADIUS.lg, backgroundColor: COLORS.surface, gap: SPACING[3] },
  shotCard: { backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border },
  shot: { height: 150, borderRadius: 10, backgroundColor: PHOTO_PLACEHOLDER[2] },
  text: { ...TYPOGRAPHY.title, fontSize: 17, lineHeight: 27 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  metaText: { flex: 1, fontSize: 12 },
  more: { width: TOUCH_TARGET, height: 28, alignItems: 'flex-end', justifyContent: 'center' },
})

export default QuoteListCard
