import type { Post } from '@miri-pet/shared'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Button from '@/design-system/components/Button'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING } from '@/design-system/tokens/spacing'
import { usePlacePosts } from '@/modules/posts/data-access-posts/usePosts'

const COLUMNS = 3
const GAP = SPACING.xs

const PostTile = ({ post, size }: { post: Post; size: number }) => {
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

// 10 여기서 찍은 게시물: 개수는 불러온 만큼(다음 페이지가 있으면 +) — 별도 count 쿼리 없이 싸게
const PlacePostsSection = ({ placeId }: { placeId: string }) => {
  const posts = usePlacePosts(placeId)
  const [width, setWidth] = useState(0)
  const items = posts.data?.pages.flatMap((page) => page.items) ?? []
  const countLabel = `${items.length}${posts.hasNextPage ? '+' : ''}`
  const size = Math.max(0, (width - GAP * (COLUMNS - 1)) / COLUMNS)

  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)
  const handleMorePress = () => {
    if (!posts.isFetchingNextPage) posts.fetchNextPage().catch(() => undefined)
  }

  if (posts.isError) return null

  return (
    <View style={styles.section}>
      <AppText variant="bodyStrong" accessibilityRole="header" accessibilityLabel={`여기서 찍은 게시물 ${countLabel}`}>
        여기서 찍은 게시물{' '}
        <AppText variant="callout" color="ink3">
          {countLabel}
        </AppText>
      </AppText>
      {posts.isPending ? <ActivityIndicator color={COLORS.primary} /> : null}
      {posts.isSuccess && items.length === 0 ? (
        <AppText variant="callout" color="ink2">
          아직 이 장소에서 찍은 게시물이 없어요
        </AppText>
      ) : null}
      <View style={styles.grid} onLayout={handleLayout}>
        {items.map((post) => (
          <PostTile key={post.id} post={post} size={size} />
        ))}
      </View>
      {posts.hasNextPage ? (
        <Button
          label="게시물 더 보기"
          variant="secondary"
          size="md"
          isLoading={posts.isFetchingNextPage}
          onPress={handleMorePress}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: SPACING.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { borderRadius: RADIUS.sm, overflow: 'hidden', backgroundColor: COLORS.primarySoft },
  image: { flex: 1 },
})

export default PlacePostsSection
