import type { Place } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SHADOW } from '@/design-system/tokens/shadow'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { usePlaceEntries } from '../data-access-place/usePlaces'
import EntryThumbCard from '../ui-entry-thumb/EntryThumbCard'

const PREVIEW_COUNT = 3

type PlacePreviewSheetProps = { place: Place; onClose: () => void }

// SCR-10 핀을 누르면 지도 아래에 뜨는 시트: 장소 이름, 기록 수, 최근 기록 3개
const PlacePreviewSheet = ({ place, onClose }: PlacePreviewSheetProps) => {
  const entries = usePlaceEntries(place.id)
  const items = entries.data?.pages.flatMap((page) => page.items) ?? []
  const hasMore = entries.hasNextPage === true
  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.head}>
        <AppText variant="heading" accessibilityRole="header" style={styles.name} numberOfLines={1}>
          {place.name}
        </AppText>
        {entries.data ? (
          <AppText variant="micro" color="ink3" style={styles.count}>
            {`기록 ${items.length}${hasMore ? '+' : ''}개`}
          </AppText>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.close}>
          <Icon name="close" size={18} color="ink3" />
        </Pressable>
      </View>
      {entries.isError ? (
        <AppText variant="caption" color="ink2">
          기록을 불러오지 못했어요
        </AppText>
      ) : null}
      {entries.data && items.length === 0 ? (
        <AppText variant="caption" color="ink2">
          아직 이곳에 이어진 기록이 없어요
        </AppText>
      ) : null}
      <View style={styles.cards}>
        {items.slice(0, PREVIEW_COUNT).map((entry, index) => (
          <EntryThumbCard key={entry.id} entry={entry} index={index} onPress={() => router.push(`/diary/${entry.id}`)} />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="모두 보기"
        onPress={() => router.push(`/places/${place.id}`)}
        style={styles.more}
      >
        <AppText variant="captionStrong" color="accent">
          모두 보기
        </AppText>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 14,
    paddingTop: SPACING[3],
    paddingHorizontal: SPACING.screen,
    paddingBottom: SPACING[5],
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    backgroundColor: COLORS.bg,
    ...SHADOW[1],
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.line },
  head: { flexDirection: 'row', alignItems: 'center', gap: SPACING[2] },
  name: { flex: 1 },
  count: { fontSize: 12 },
  close: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  cards: { flexDirection: 'row', gap: SPACING[2] },
  more: { alignSelf: 'flex-end', minHeight: TOUCH_TARGET, justifyContent: 'center' },
})

export default PlacePreviewSheet
