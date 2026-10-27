import type { Photo } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { Image } from 'expo-image'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { COLORS, PHOTO_PLACEHOLDER } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'

export const CAROUSEL_HEIGHT = 440

// SCR-06 위쪽 사진 캐러셀(440): 표시용 이미지 + 점 표시. 누르면 SCR-09 뷰어
const PhotoCarousel = ({ photos }: { photos: readonly Photo[] }) => {
  const { width } = useWindowDimensions()
  const [index, setIndex] = useState(0)
  return (
    <View style={styles.wrap}>
      <FlatList
        data={photos}
        keyExtractor={(photo) => photo.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: position }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`사진 ${position + 1} / ${photos.length} 크게 보기`}
            onPress={() => router.push(`/photos/${item.id}`)}
          >
            <Image
              testID={`diary-photo-${item.id}`}
              source={item.displayUrl ? { uri: item.displayUrl, cacheKey: `${item.id}:d` } : null}
              style={{
                width,
                height: CAROUSEL_HEIGHT,
                backgroundColor: PHOTO_PLACEHOLDER[position % PHOTO_PLACEHOLDER.length],
              }}
              contentFit="cover"
            />
          </Pressable>
        )}
      />
      {photos.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {photos.map((photo, position) => (
            <View key={photo.id} style={[styles.dot, position === index ? styles.dotOn : null]} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { height: CAROUSEL_HEIGHT, backgroundColor: COLORS.surface },
  dots: {
    position: 'absolute',
    bottom: SPACING[4],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.photoVeil },
  dotOn: { backgroundColor: COLORS.bg },
})

export default PhotoCarousel
