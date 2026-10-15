import type { LikeResult, Post } from '@miri-pet/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { patchPostInCache } from '@/modules/posts/data-access-posts/post-cache'
import { likePost, unlikePost } from './social-api'

type ToggleVariables = { postId: string; shouldLike: boolean; previous: LikeResult }

// 누르는 즉시 반영(낙관적) → 서버 결과로 맞추고, 실패하면 이전 값으로 되돌린다
export const useToggleLike = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ postId, shouldLike }: ToggleVariables) => (shouldLike ? likePost(postId) : unlikePost(postId)),
    onMutate: ({ postId, shouldLike, previous }: ToggleVariables) => {
      patchPostInCache(queryClient, postId, {
        isLiked: shouldLike,
        likeCount: Math.max(0, previous.likeCount + (shouldLike ? 1 : -1)),
      })
    },
    onSuccess: (result, { postId }) => patchPostInCache(queryClient, postId, result),
    onError: (_error, { postId, previous }) => patchPostInCache(queryClient, postId, previous),
  })
  return (post: Pick<Post, 'id' | 'isLiked' | 'likeCount'>) =>
    mutation.mutate({
      postId: post.id,
      shouldLike: !post.isLiked,
      previous: { isLiked: post.isLiked, likeCount: post.likeCount },
    })
}
