import { MAX_PHOTOS_PER_ENTRY, type Photo } from '@you-in-heart/shared'
import { Image } from 'expo-image'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import { type UploadItem, uploadProgress } from '@/modules/media/data-access-media/upload-queue-store'
import type { LibraryAsset } from '@/modules/media/util-pick-assets/pick-assets'

type ComposePhotoStripProps = {
  existingPhotos: readonly Photo[]
  assets: readonly LibraryAsset[]
  // 저장 뒤: 자산 id → 업로드 항목
  uploadsByAsset: ReadonlyMap<string, UploadItem>
  isLocked: boolean
  onAddPress: () => void
  onRetryPress: () => void
}

const THUMB = 96

const UploadOverlay = ({ item, onRetryPress }: { item: UploadItem; onRetryPress: () => void }) => {
  if (item.status === 'done') {
    return (
      <View style={styles.badge}>
        <Icon name="check" size={14} color="bg" strokeWidth={2.2} />
      </View>
    )
  }
  if (item.status === 'failed') {
    return (
      <View style={styles.veil}>
        {item.failure === 'RETRYABLE' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="다시 올리기" onPress={onRetryPress} style={styles.retry}>
            <Icon name="retry" size={20} color="danger" />
          </Pressable>
        ) : (
          <Icon name="alert" size={20} color="danger" />
        )}
      </View>
    )
  }
  return (
    <View style={styles.track}>
      <View style={[styles.bar, { width: `${Math.round(uploadProgress(item) * 100)}%` }]} />
    </View>
  )
}

// SCR-05 사진 줄: 96px 정사각 썸네일 + "사진 추가 N/20". 저장 뒤에는 장마다 완료·진행·실패(다시 올리기)를 겹쳐 보여준다
const ComposePhotoStrip = ({
  existingPhotos,
  assets,
  uploadsByAsset,
  isLocked,
  onAddPress,
  onRetryPress,
}: ComposePhotoStripProps) => {
  const count = existingPhotos.length + assets.length
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
      {existingPhotos.map((photo, index) => (
        <Image
          key={photo.id}
          source={photo.thumbUrl ? { uri: photo.thumbUrl, cacheKey: `${photo.id}:t` } : null}
          style={[styles.thumb, { backgroundColor: PHOTO_PLACEHOLDER[index % PHOTO_PLACEHOLDER.length] }]}
          contentFit="cover"
        />
      ))}
      {assets.map((asset, index) => {
        const item = uploadsByAsset.get(asset.id)
        const tone = PHOTO_PLACEHOLDER[(existingPhotos.length + index) % PHOTO_PLACEHOLDER.length]
        return (
          <View key={asset.id} style={[styles.thumb, { backgroundColor: tone }]}>
            <Image source={{ uri: asset.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
            {item ? <UploadOverlay item={item} onRetryPress={onRetryPress} /> : null}
          </View>
        )
      })}
      {isLocked ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`사진 추가 ${count}/${MAX_PHOTOS_PER_ENTRY}`}
          accessibilityState={{ disabled: count >= MAX_PHOTOS_PER_ENTRY }}
          disabled={count >= MAX_PHOTOS_PER_ENTRY}
          onPress={onAddPress}
          style={styles.add}
        >
          <Icon name="plus" size={20} color="ink2" />
          <AppText variant="micro" color="ink2" style={styles.addLabel}>
            {`${count}/${MAX_PHOTOS_PER_ENTRY}`}
          </AppText>
        </Pressable>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  strip: { gap: SPACING[2] },
  thumb: { width: THUMB, height: THUMB, borderRadius: RADIUS.md, overflow: 'hidden' },
  add: {
    width: THUMB,
    height: THUMB,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    backgroundColor: COLORS.bg,
  },
  addLabel: { fontSize: 12 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.photoBadge,
  },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.photoVeil },
  retry: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    borderRadius: TOUCH_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  track: { position: 'absolute', left: 10, right: 10, bottom: 10, height: 4, borderRadius: 2, backgroundColor: COLORS.photoVeil },
  bar: { height: 4, borderRadius: 2, backgroundColor: COLORS.ink },
})

export default ComposePhotoStrip
