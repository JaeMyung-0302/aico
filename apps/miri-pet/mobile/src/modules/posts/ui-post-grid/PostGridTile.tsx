import type { Post } from '@miri-pet/shared'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native'
import { COLORS } from '@/design-system/tokens/colors'

export const GRID_COLUMNS = 3
export const GRID_GAP = 2

// 17 프로필 게시물 그리드 한 칸(대표 사진 썸네일)
const PostGridTile = ({ post }: { post: Post }) => {
  const { width } = useWindowDimensions()
  const size = (width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  const thumb = post.images[0]?.thumbUrl
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`게시물 보기, 좋아요 ${post.likeCount}개`}
      onPress={() => router.push(`/posts/${post.id}`)}
      style={[styles.tile, { width: size, height: size }]}
    >
      {thumb ? <Image source={{ uri: thumb }} style={styles.image} contentFit="cover" /> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tile: { backgroundColor: COLORS.primarySoft, marginBottom: GRID_GAP },
  image: { flex: 1 },
})

export default PostGridTile
