import type { DiaryEntry } from '@you-in-heart/shared'
import { Image } from 'expo-image'
import { Pressable, StyleSheet } from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'

const AUTO_DAY_TITLE = '그날의 사진'

export const entryTitle = (entry: DiaryEntry): string => entry.title ?? AUTO_DAY_TITLE
export const entryDotDate = (entry: DiaryEntry): string => entry.happenedOn.replaceAll('-', '. ')

type EntryThumbCardProps = { entry: DiaryEntry; index: number; onPress: () => void }

// SCR-10 핀 시트의 기록 카드: 첫 사진 썸네일(cacheKey 로 서명 URL 이 바뀌어도 캐시) + 제목 + 날짜
const EntryThumbCard = ({ entry, index, onPress }: EntryThumbCardProps) => {
  const photo = entry.photos[0]
  const title = entryTitle(entry)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} ${entryDotDate(entry)}`}
      onPress={onPress}
      style={styles.card}
    >
      <Image
        source={photo?.thumbUrl ? { uri: photo.thumbUrl, cacheKey: `${photo.id}:t` } : null}
        style={[styles.thumb, { backgroundColor: PHOTO_PLACEHOLDER[index % PHOTO_PLACEHOLDER.length] }]}
        contentFit="cover"
      />
      <AppText variant="captionStrong" style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
      <AppText variant="micro" color="ink3">
        {entryDotDate(entry)}
      </AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 6 },
  thumb: { height: 88, borderRadius: RADIUS.md, backgroundColor: COLORS.surface },
  title: { fontSize: 12 },
})

export default EntryThumbCard
