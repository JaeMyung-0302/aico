import type { BucketItem, DiaryEntry } from '@you-in-heart/shared'
import { Image } from 'expo-image'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import BottomSheet from '@/design-system/components/BottomSheet'
import Button from '@/design-system/components/Button'
import Icon from '@/design-system/components/Icon'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import { useTimeline } from '@/modules/timeline/data-access-timeline/useTimeline'

const RECENT_COUNT = 5
const AUTO_DAY_TITLE = '그날의 사진'

type BucketDoneSheetProps = {
  item: BucketItem
  isSaving: boolean
  errorMessage: string | null
  onClose: () => void
  // entryId null = 연결 없이 완료
  onComplete: (entryId: string | null) => void
  onWriteNew: () => void
}

type EntryOptionProps = { entry: DiaryEntry; index: number; isSelected: boolean; onPress: () => void }

const EntryOption = ({ entry, index, isSelected, onPress }: EntryOptionProps) => {
  const title = entry.title ?? AUTO_DAY_TITLE
  const date = entry.happenedOn.replaceAll('-', '. ')
  const photo = entry.photos[0]
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${title} ${date}`}
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[styles.option, isSelected ? styles.optionOn : null]}
    >
      <Image
        source={photo?.thumbUrl ? { uri: photo.thumbUrl, cacheKey: `${photo.id}:t` } : null}
        style={[styles.thumb, { backgroundColor: PHOTO_PLACEHOLDER[index % PHOTO_PLACEHOLDER.length] }]}
        contentFit="cover"
      />
      <View style={styles.texts}>
        <AppText variant="labelStrong">{title}</AppText>
        <AppText variant="micro" color="ink2" style={styles.date}>
          {date}
        </AppText>
      </View>
    </Pressable>
  )
}

// SCR-12 "완료 → 기록과 연결": 최근 기록 중 하나를 고르거나, 연결 없이 완료하거나, 새 기록을 쓴다
const BucketDoneSheet = ({ item, isSaving, errorMessage, onClose, onComplete, onWriteNew }: BucketDoneSheetProps) => {
  const timeline = useTimeline(null)
  const recent = (timeline.data?.pages[0]?.items ?? []).slice(0, RECENT_COUNT)
  const [entryId, setEntryId] = useState<string | null>(null)
  return (
    <BottomSheet isVisible onClose={onClose}>
      <View style={styles.head}>
        <View style={styles.badge}>
          <Icon name="check" size={22} color="accent" />
        </View>
        <AppText variant="title" style={styles.center} accessibilityRole="header">
          {`${item.title}, 해냈어요`}
        </AppText>
        <AppText variant="caption" color="ink2">
          그날의 기록과 이어둘까요?
        </AppText>
      </View>
      <View style={styles.options}>
        {recent.map((entry, index) => (
          <EntryOption
            key={entry.id}
            entry={entry}
            index={index}
            isSelected={entry.id === entryId}
            onPress={() => setEntryId(entry.id === entryId ? null : entry.id)}
          />
        ))}
        <Pressable accessibilityRole="button" accessibilityLabel="새 기록 쓰기" onPress={onWriteNew} style={styles.option}>
          <View style={[styles.thumb, styles.newThumb]}>
            <Icon name="plus" size={20} color="ink3" />
          </View>
          <AppText variant="label">새 기록 쓰기</AppText>
        </Pressable>
      </View>
      {errorMessage ? (
        <AppText variant="caption" color="danger" accessibilityRole="alert">
          {errorMessage}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button
          label="연결 없이 완료"
          variant="outline"
          disabled={isSaving}
          onPress={() => onComplete(null)}
          style={styles.action}
        />
        <Button
          label="연결하기"
          disabled={entryId === null}
          isLoading={isSaving}
          onPress={() => onComplete(entryId)}
          style={styles.action}
        />
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 6, paddingVertical: SPACING[2] },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blush,
  },
  center: { textAlign: 'center', fontSize: 20, marginTop: 6 },
  options: { gap: SPACING[2] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionOn: { borderWidth: 1.5, borderColor: COLORS.accent, backgroundColor: COLORS.blush },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  newThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  texts: { flex: 1 },
  date: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: SPACING[2], marginTop: SPACING[1] },
  action: { flex: 1, height: 52 },
})

export default BucketDoneSheet
