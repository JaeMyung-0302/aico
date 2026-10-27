import type { DiaryEntry, Photo } from '@you-in-heart/shared'
import { Image } from 'expo-image'
import { type ImageStyle, Pressable, type StyleProp, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { formatShortDiaryDate } from '@/modules/diary/util-diary/format-diary-date'

type TimelineCardProps = {
  entry: DiaryEntry
  authorName: string
  onPress: () => void
}

const AUTO_DAY_TITLE = '그날의 사진'
const ROW = 110
const GAP = 4

const tone = (index: number) => PHOTO_PLACEHOLDER[index % PHOTO_PLACEHOLDER.length]

type ThumbProps = { photo: Photo; index: number; style: StyleProp<ImageStyle> }

// 큰 칸(첫 장)은 표시용(d), 작은 칸은 썸네일(t). cacheKey 로 서명 URL 이 바뀌어도 캐시를 다시 쓴다
const Thumb = ({ photo, index, style }: ThumbProps) => {
  const isLarge = index === 0
  const uri = isLarge ? (photo.displayUrl ?? photo.thumbUrl) : photo.thumbUrl
  return (
    <Image
      testID={`timeline-photo-${photo.id}`}
      source={uri ? { uri, cacheKey: `${photo.id}:${isLarge && photo.displayUrl ? 'd' : 't'}` } : null}
      style={[style, { backgroundColor: tone(index) }]}
      contentFit="cover"
    />
  )
}

// 1장: 200 높이 한 장 / 2장: 나란히 / 3장 이상: 큰 1장(2fr) + 작은 2장(1fr)
const PhotoMosaic = ({ photos }: { photos: readonly Photo[] }) => {
  const [first, second, third] = photos
  if (!first) return null
  if (!second) return <Thumb photo={first} index={0} style={styles.single} />
  if (!third) {
    return (
      <View style={styles.pair}>
        <Thumb photo={first} index={0} style={[styles.flex, styles.left]} />
        <Thumb photo={second} index={1} style={[styles.flex, styles.right]} />
      </View>
    )
  }
  return (
    <View style={styles.pair}>
      <Thumb photo={first} index={0} style={[styles.big, styles.left]} />
      <View style={styles.column}>
        <Thumb photo={second} index={1} style={[styles.small, styles.topRight]} />
        <Thumb photo={third} index={2} style={[styles.small, styles.bottomRight]} />
      </View>
    </View>
  )
}

// SCR-07 카드: 사진 모자이크 → 제목 + 날짜 → 발췌 2줄 → 작성자 (장소는 Phase 2)
const TimelineCard = ({ entry, authorName, onPress }: TimelineCardProps) => {
  const photos = entry.photos.filter((photo) => photo.status === 'READY')
  const title = entry.title ?? (entry.kind === 'AUTO_DAY' ? AUTO_DAY_TITLE : '')
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title || entry.body.slice(0, 20)} ${formatShortDiaryDate(entry.happenedOn)}`}
      onPress={onPress}
      style={styles.card}
    >
      <PhotoMosaic photos={photos} />
      <View style={styles.titleRow}>
        <AppText variant="bodyStrong" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="micro" color="ink3" style={styles.meta}>
          {formatShortDiaryDate(entry.happenedOn)}
        </AppText>
      </View>
      {entry.body ? (
        <AppText variant="label" color="ink2" numberOfLines={2}>
          {entry.body}
        </AppText>
      ) : null}
      <AppText variant="micro" color="ink3" style={styles.meta}>
        {authorName}
      </AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  single: { height: 200, borderRadius: RADIUS.md },
  pair: { flexDirection: 'row', gap: GAP, height: ROW * 2 + GAP },
  flex: { flex: 1 },
  column: { flex: 1, gap: GAP },
  big: { flex: 2 },
  small: { flex: 1 },
  left: { borderTopLeftRadius: RADIUS.md, borderBottomLeftRadius: RADIUS.md, borderRadius: GAP },
  right: { borderTopRightRadius: RADIUS.md, borderBottomRightRadius: RADIUS.md, borderRadius: GAP },
  topRight: { borderRadius: GAP, borderTopRightRadius: RADIUS.md },
  bottomRight: { borderRadius: GAP, borderBottomRightRadius: RADIUS.md },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: SPACING[2] },
  title: { flex: 1, fontSize: 16 },
  meta: { fontSize: 12 },
})

export default TimelineCard
