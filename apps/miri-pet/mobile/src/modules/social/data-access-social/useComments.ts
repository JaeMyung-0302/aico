import type { Post } from '@miri-pet/shared'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patchPostInCache, postQueryKey } from '@/modules/posts/data-access-posts/post-cache'
import { createComment, deleteComment, fetchComments } from './social-api'

export const commentsQueryKey = (postId: string) => ['posts', postId, 'comments'] as const

// 첫 페이지 커서. 반환 타입을 명시해 pageParam이 string | null로 추론되게 한다
const firstCursor = (): string | null => null

export const useComments = (postId: string) =>
  useInfiniteQuery({
    queryKey: commentsQueryKey(postId),
    queryFn: ({ pageParam }) => fetchComments(postId, pageParam),
    initialPageParam: firstCursor(),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

// 댓글 수는 서버 카운터와 같게 ±1 반영하고 목록은 다시 받는다
const useCommentCountSync = (postId: string) => {
  const queryClient = useQueryClient()
  return async (delta: number) => {
    const post = queryClient.getQueryData<Post>(postQueryKey(postId))
    if (post) patchPostInCache(queryClient, postId, { commentCount: Math.max(0, post.commentCount + delta) })
    await queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) })
  }
}

export const useCreateComment = (postId: string) => {
  const syncCount = useCommentCountSync(postId)
  return useMutation({ mutationFn: (body: string) => createComment(postId, body), onSuccess: () => syncCount(1) })
}

export const useDeleteComment = (postId: string) => {
  const syncCount = useCommentCountSync(postId)
  return useMutation({ mutationFn: (commentId: string) => deleteComment(commentId), onSuccess: () => syncCount(-1) })
}
