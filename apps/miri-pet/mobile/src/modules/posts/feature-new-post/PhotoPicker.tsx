import { MAX_POST_IMAGES } from '@miri-pet/shared'
import { Image } from 'expo-image'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'

export type PhotoItem = { key: string; image: PickedImage }

type PhotoPickerProps = {
  photos: readonly PhotoItem[]
  onAdd: () => void
  onRemove: (key: string) => void
}

const TILE = 88

// 06 사진: 최대 10장, 첫 장이 대표. 위치 정보(EXIF)는 서버가 지운다
const PhotoPicker = ({ photos, onAdd, onRemove }: PhotoPickerProps) => (
  <View style={styles.wrap}>
    <View style={styles.titleRow}>
      <AppText variant="captionStrong" color="ink2">
        사진
      </AppText>
      <AppText variant="caption" color="ink3">{`${photos.length} / ${MAX_POST_IMAGES}`}</AppText>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {photos.map(({ key, image }, index) => (
        <View key={key} style={styles.tile}>
          <Image source={{ uri: image.uri }} style={styles.image} contentFit="cover" />
          {index === 0 ? (
            <View style={styles.cover}>
              <AppText variant="captionStrong" color="surface">
                대표
              </AppText>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`사진 ${index + 1} 빼기`}
            onPress={() => onRemove(key)}
            hitSlop={SPACING.sm}
            style={styles.remove}
          >
            <Icon name="close" size={14} color="surface" />
          </Pressable>
        </View>
      ))}
      {photos.length < MAX_POST_IMAGES ? (
        <Pressable accessibilityRole="button" accessibilityLabel="사진 추가" onPress={onAdd} style={styles.add}>
          <Icon name="camera" color="ink3" />
        </Pressable>
      ) : null}
    </ScrollView>
    <AppText variant="caption" color="ink3">
      사진 속 위치 정보는 올릴 때 자동으로 지워져요
    </AppText>
  </View>
)

const styles = StyleSheet.create({
  wrap: { gap: SPACING.sm },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { gap: SPACING.sm },
  tile: { width: TILE, height: TILE, borderRadius: RADIUS.md, overflow: 'hidden' },
  image: { width: TILE, height: TILE },
  cover: {
    position: 'absolute',
    left: SPACING.xs,
    bottom: SPACING.xs,
    paddingHorizontal: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.scrim,
  },
  remove: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
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

export default PhotoPicker
