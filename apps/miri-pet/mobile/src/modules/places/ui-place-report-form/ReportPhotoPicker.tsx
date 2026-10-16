import { MAX_PLACE_REPORT_IMAGES } from '@miri-pet/shared'
import { Image } from 'expo-image'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'

export type ReportPhotoPickerProps = {
  photos: readonly PickedImage[]
  onAdd: () => void
  onRemove: (index: number) => void
}

const TILE = TOUCH_TARGET * 2

// 11 "안내문 사진 첨부(선택)": 최대 3장. 운영자만 보는 비공개 사진이고, 위치 정보(EXIF)는 서버가 지운다
const ReportPhotoPicker = ({ photos, onAdd, onRemove }: ReportPhotoPickerProps) => (
  <View style={styles.wrap}>
    <View style={styles.titleRow}>
      <AppText variant="captionStrong" color="ink2">
        안내문 사진 첨부(선택)
      </AppText>
      <AppText variant="caption" color="ink3">{`${photos.length} / ${MAX_PLACE_REPORT_IMAGES}`}</AppText>
    </View>
    <View style={styles.row}>
      {photos.map((image, index) => (
        <View key={`${image.uri}-${index}`} style={styles.tile}>
          <Image
            accessibilityLabel={`안내문 사진 ${index + 1}`}
            source={{ uri: image.uri }}
            style={styles.image}
            contentFit="cover"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`사진 ${index + 1} 빼기`}
            onPress={() => onRemove(index)}
            hitSlop={SPACING.sm}
            style={styles.remove}
          >
            <Icon name="close" size={14} color="surface" />
          </Pressable>
        </View>
      ))}
      {photos.length < MAX_PLACE_REPORT_IMAGES ? (
        <Pressable accessibilityRole="button" accessibilityLabel="안내문 사진 추가" onPress={onAdd} style={styles.add}>
          <Icon name="camera" color="ink3" />
        </Pressable>
      ) : null}
    </View>
    <AppText variant="caption" color="ink3">
      운영자 확인용으로만 쓰이고, 검수가 끝나면 지워져요
    </AppText>
  </View>
)

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: SPACING.sm },
  tile: { width: TILE, height: TILE, borderRadius: RADIUS.md, overflow: 'hidden' },
  image: { width: TILE, height: TILE },
  remove: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: SPACING.xl + SPACING.xxs,
    height: SPACING.xl + SPACING.xxs,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: TILE,
    height: TILE,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default ReportPhotoPicker
