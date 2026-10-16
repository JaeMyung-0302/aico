import type { Post } from '@miri-pet/shared'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import AppText from '@/design-system/components/AppText'
import Avatar from '@/design-system/components/Avatar'
import Icon from '@/design-system/components/Icon'
import { COLORS } from '@/design-system/tokens/colors'
import { RADIUS } from '@/design-system/tokens/radius'
import { SPACING, TOUCH_TARGET } from '@/design-system/tokens/spacing'
import ShareToDmButton from '@/modules/dm/ui-share-to-dm/ShareToDmButton'
import { useToggleLike } from '@/modules/social/data-access-social/useToggleLike'
import { formatRelativeTime } from '@/shared/format/format-relative-time'
import PostImages from './PostImages'
import PostMenu from './PostMenu'

type PostCardProps = {
  post: Post
  isMine: boolean
  // 상세 화면(05)에서는 사진·댓글을 눌러도 이동하지 않는다
  isDetail?: boolean
  onDeleted?: () => void
}

const FEED_IMAGE_HEIGHT = 360

// 05 장소 칩: 태그된 장소 상세로
const PlaceChip = ({ place }: { place: NonNullable<Post['place']> }) => (
  <Pressable
    accessibilityRole="link"
    accessibilityLabel={`장소 ${place.name} 보기`}
    onPress={() => router.push(`/places/${place.id}`)}
    hitSlop={SPACING.sm}
    style={styles.placeChip}
  >
    <AppText variant="captionStrong" color="onPrimarySoft" numberOfLines={1}>
      {place.name}
    </AppText>
  </Pressable>
)

const likeLabel = ({ likeCount, isLiked }: Pick<Post, 'likeCount' | 'isLiked'>) =>
  `좋아요 ${likeCount}개, ${isLiked ? '좋아요 취소' : '좋아요 누르기'}`

// 04 피드·05 상세 공통 카드: 작성자 · 사진 · 좋아요/댓글 · 글
const PostCard = ({ post, isMine, isDetail = false, onDeleted }: PostCardProps) => {
  const toggleLike = useToggleLike()
  const openDetail = isDetail ? undefined : () => router.push(`/posts/${post.id}`)
  const openAuthor = () => router.push(`/users/${post.author.id}`)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${post.author.nickname} 프로필`}
          onPress={openAuthor}
        >
          <Avatar name={post.author.nickname} uri={post.author.avatarUrl} />
        </Pressable>
        <View style={styles.headerText}>
          <AppText variant="calloutStrong" numberOfLines={1}>
            {post.author.nickname}
          </AppText>
          <AppText variant="caption" color="ink3" numberOfLines={1}>
            {post.pets.map((pet) => pet.name).join(' · ')}
          </AppText>
        </View>
        <PostMenu post={post} isMine={isMine} onDeleted={onDeleted} />
      </View>
      <PostImages images={post.images} height={FEED_IMAGE_HEIGHT} onPress={openDetail} />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={likeLabel(post)}
          onPress={() => toggleLike(post)}
          style={styles.action}
        >
          <Icon name={post.isLiked ? 'heartFilled' : 'heart'} color={post.isLiked ? 'danger' : 'ink'} />
          <AppText variant="calloutStrong">{post.likeCount}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`댓글 ${post.commentCount}개 보기`}
          disabled={isDetail}
          onPress={openDetail}
          style={styles.action}
        >
          <Icon name="chat" />
          <AppText variant="calloutStrong">{post.commentCount}</AppText>
        </Pressable>
        {isMine ? null : <ShareToDmButton post={post} />}
      </View>
      {post.caption ? (
        <AppText variant="callout" style={styles.caption}>
          <AppText variant="calloutStrong">{post.author.nickname}</AppText> {post.caption}
        </AppText>
      ) : null}
      {post.place ? <PlaceChip place={post.place} /> : null}
      <AppText variant="caption" color="ink3" style={styles.time}>
        {formatRelativeTime(post.createdAt)}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md - 2,
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.sm,
  },
  headerText: { flex: 1 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  action: {
    minHeight: TOUCH_TARGET,
    paddingHorizontal: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  caption: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xxs, paddingBottom: SPACING.xs },
  placeChip: {
    alignSelf: 'flex-start',
    height: 28,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySoft,
    justifyContent: 'center',
  },
  time: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md + 2 },
})

export default PostCard
