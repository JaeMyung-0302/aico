import type { Photo } from '@you-in-heart/shared'
import { toKstDate } from '@you-in-heart/shared'
import { useMutation } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppText from '@/design-system/components/AppText'
import Icon, { type IconName } from '@/design-system/components/Icon'
import Toast from '@/design-system/components/Toast'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { useDiaryEntry } from '@/modules/diary/data-access-diary/useDiaryEntry'
import { useToast } from '@/shared/hooks/use-toast'
import { saveDisplayToLibrary, saveOriginalToLibrary, SavePermissionError } from '../data-access-album/save-photo'
import { usePhoto } from '../data-access-album/usePhotos'
import OriginalSaveSheet from './OriginalSaveSheet'

type SaveKind = 'original' | 'display'

const toSaveMessage = (error: unknown): string =>
  error instanceof SavePermissionError ? '설정에서 사진 저장을 허용해 주세요' : '저장하지 못했어요. 잠시 후 다시 시도해 주세요'

// "2026. 10. 25 · 2 / 3" — 촬영 날짜(KST)와 같은 기록 안에서 몇 번째 사진인지
const useViewerCaption = (photo: Photo | undefined): string => {
  const entry = useDiaryEntry(photo?.entryId ?? null)
  if (!photo) return ''
  const date = photo.takenAt ? toKstDate(photo.takenAt).replaceAll('-', '. ') : null
  const ready = entry.data?.photos.filter((item) => item.status === 'READY') ?? []
  const position = ready.findIndex((item) => item.id === photo.id)
  const order = position >= 0 ? `${position + 1} / ${ready.length}` : null
  return [date, order].filter(Boolean).join(' · ')
}

const BarAction = ({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}>
    <Icon name={icon} color="bg" />
    <AppText variant="micro" color="line">
      {label}
    </AppText>
  </Pressable>
)

// SCR-09 사진 뷰어: 표시용 이미지(위치 없음). 원본 저장은 위치 고지 시트를 확인해야 원본 URL 을 받는다
const PhotoViewerScreen = ({ photoId }: { photoId: string }) => {
  const insets = useSafeAreaInsets()
  const photo = usePhoto(photoId)
  const caption = useViewerCaption(photo.data)
  const [isNoticeVisible, setIsNoticeVisible] = useState(false)
  const toast = useToast()
  const save = useMutation({
    mutationFn: (kind: SaveKind) =>
      kind === 'original' || !photo.data ? saveOriginalToLibrary(photoId) : saveDisplayToLibrary(photo.data),
    onSuccess: () => toast.show('사진 보관함에 저장했어요'),
    onError: (error) => toast.show(toSaveMessage(error)),
    onSettled: () => setIsNoticeVisible(false),
  })
  const displayUrl = photo.data?.displayUrl

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={() => router.back()} style={styles.icon}>
          <Icon name="close" color="bg" />
        </Pressable>
        <AppText variant="caption" color="line">
          {caption}
        </AppText>
        <View style={styles.icon} />
      </View>
      <View style={styles.stage}>
        {displayUrl ? (
          <Image
            testID="viewer-image"
            source={{ uri: displayUrl, cacheKey: `${photoId}:d` }}
            style={styles.image}
            contentFit="contain"
          />
        ) : null}
      </View>
      <View style={[styles.bar, { paddingBottom: insets.bottom + SPACING[4] }]}>
        {photo.data ? (
          <BarAction icon="timeline" label="기록 보기" onPress={() => router.push(`/diary/${photo.data.entryId}`)} />
        ) : null}
        <BarAction icon="download" label="원본 저장" onPress={() => setIsNoticeVisible(true)} />
      </View>
      <OriginalSaveSheet
        isVisible={isNoticeVisible}
        isSaving={save.isPending}
        onClose={() => setIsNoticeVisible(false)}
        onSaveDisplay={() => save.mutate('display')}
        onSaveOriginal={() => save.mutate('original')}
      />
      <Toast message={toast.message} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.night },
  top: { height: 52, paddingHorizontal: SPACING[3], flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: TOUCH_TARGET, height: TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1, justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  bar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: SPACING[4], paddingHorizontal: SPACING.screen },
  action: { alignItems: 'center', gap: SPACING[1], minWidth: 56, minHeight: TOUCH_TARGET },
})

export default PhotoViewerScreen
