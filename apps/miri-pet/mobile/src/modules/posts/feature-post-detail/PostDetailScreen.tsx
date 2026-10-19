import type { Comment } from '@miri-pet/shared'
import { router } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native'
import AppHeader from '@/design-system/components/AppHeader'
import AppText from '@/design-system/components/AppText'
import KeyboardAvoider from '@/design-system/components/KeyboardAvoider'
import EmptyLayout from '@/design-system/components/EmptyLayout'
import { COLORS } from '@/design-system/tokens/colors'
import { SPACING } from '@/design-system/tokens/spacing'
import PostCard from '@/modules/feed/ui-post-card/PostCard'
import { useComments, useCreateComment, useDeleteComment } from '@/modules/social/data-access-social/useComments'
import CommentInput from '@/modules/social/ui-comment-list/CommentInput'
import CommentRow from '@/modules/social/ui-comment-list/CommentRow'
import { useMe } from '@/modules/user/data-access-me/useMe'
import { isNotFoundError } from '@/shared/api/is-not-found-error'
import { usePost } from '../data-access-posts/usePosts'

type PostDetailScreenProps = { postId: string }

const goBack = () => {
  if (router.canGoBack()) router.back()
}

// 05 게시물 상세: 카드 + 댓글(오래된순) + 하단 입력
const PostDetailScreen = ({ postId }: PostDetailScreenProps) => {
  const me = useMe()
  const post = usePost(postId)
  const comments = useComments(postId)
  const createComment = useCreateComment(postId)
  const deleteComment = useDeleteComment(postId)
  const [notice, setNotice] = useState<string | null>(null)

  if (post.isError) {
    return (
      <View style={styles.screen}>
        <AppHeader title="게시물" />
        {isNotFoundError(post.error) ? (
          <EmptyLayout title="게시물을 찾을 수 없어요" description="삭제됐거나 볼 수 없는 게시물이에요." />
        ) : (
          <EmptyLayout
            title="게시물을 불러오지 못했어요"
            description="네트워크 연결을 확인하고 다시 시도해 주세요."
            onRetry={() => {
              post.refetch().catch(() => undefined)
            }}
          />
        )}
      </View>
    )
  }

  const myId = me.data?.id
  const isMyPost = post.data?.author.id === myId
  const items: Comment[] = comments.data?.pages.flatMap((page) => page.items) ?? []

  const handleSubmit = async (body: string) => {
    setNotice(null)
    try {
      await createComment.mutateAsync(body)
      return true
    } catch {
      setNotice('댓글을 남기지 못했어요')
      return false
    }
  }
  const handleDelete = (commentId: string) => {
    deleteComment.mutate(commentId, { onError: () => setNotice('댓글을 지우지 못했어요') })
  }

  const header = post.data ? (
    <View style={styles.header}>
      <PostCard post={post.data} isMine={isMyPost} isDetail onDeleted={goBack} />
      <AppText variant="captionStrong" color="ink2" style={styles.count}>{`댓글 ${post.data.commentCount}`}</AppText>
    </View>
  ) : (
    <ActivityIndicator style={styles.loading} color={COLORS.primary} />
  )

  return (
    <KeyboardAvoider style={styles.screen}>
      <AppHeader title="게시물" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <CommentRow
            comment={item}
            isPostAuthor={item.author.id === post.data?.author.id}
            canDelete={isMyPost || item.author.id === myId}
            onDelete={handleDelete}
          />
        )}
        ItemSeparatorComponent={Separator}
        onEndReached={() => {
          if (comments.hasNextPage && !comments.isFetchingNextPage) comments.fetchNextPage().catch(() => undefined)
        }}
        contentContainerStyle={styles.content}
      />
      {notice ? (
        <AppText variant="callout" color="danger" style={styles.notice} accessibilityLiveRegion="polite">
          {notice}
        </AppText>
      ) : null}
      {post.data ? <CommentInput isSubmitting={createComment.isPending} onSubmit={handleSubmit} /> : null}
    </KeyboardAvoider>
  )
}

const Separator = () => <View style={styles.separator} />

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  header: { paddingBottom: SPACING.md },
  count: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs },
  loading: { marginTop: SPACING.xxxl },
  content: { paddingBottom: SPACING.lg },
  separator: { height: SPACING.md },
  notice: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xs },
})

export default PostDetailScreen
