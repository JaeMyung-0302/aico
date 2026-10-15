import type { Post } from '@miri-pet/shared'
import { Image } from 'expo-image'
import { useState } from 'react'
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import AppText from '@/design-system/components/AppText'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'

type PostImagesProps = {
  images: Post['images']
  height: number
  onPress?: () => void
}

// 가로로 넘기는 사진(최대 10장) + "1/3" 배지
const PostImages = ({ images, height, onPress }: PostImagesProps) => {
  const { width } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width)))
  }
  if (images.length === 0) return null
  return (
    <View style={{ height }}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScrollEnd}>
        {images.map((image, position) => (
          <Pressable
            key={image.url}
            accessibilityRole={onPress ? 'button' : 'image'}
            accessibilityLabel={`사진 ${position + 1}/${images.length}`}
            disabled={!onPress}
            onPress={onPress}
          >
            <Image
              source={{ uri: image.url }}
              placeholder={{ uri: image.thumbUrl }}
              style={{ width, height }}
              contentFit="cover"
            />
          </Pressable>
        ))}
      </ScrollView>
      {images.length > 1 ? (
        <View style={styles.badge} pointerEvents="none">
          <AppText variant="captionStrong" color="surface">{`${index + 1}/${images.length}`}</AppText>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.scrim,
  },
})

export default PostImages
