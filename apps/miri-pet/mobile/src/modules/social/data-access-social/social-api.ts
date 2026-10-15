import {
  type Comment,
  type CommentPage,
  commentPageSchema,
  commentSchema,
  type FollowResult,
  followResultSchema,
  type LikeResult,
  likeResultSchema,
  type UserPage,
  userPageSchema,
} from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'

const cursorParams = (cursor: string | null) => (cursor ? { cursor } : {})

// 좋아요는 PUT/DELETE 멱등 — 두 번 눌러도 서버 카운터는 1번만 바뀐다
export const likePost = (postId: string): Promise<LikeResult> =>
  requestApi({ method: 'PUT', url: `/posts/${postId}/like`, schema: likeResultSchema })

export const unlikePost = (postId: string): Promise<LikeResult> =>
  requestApi({ method: 'DELETE', url: `/posts/${postId}/like`, schema: likeResultSchema })

export const fetchComments = (postId: string, cursor: string | null): Promise<CommentPage> =>
  requestApi({
    method: 'GET',
    url: `/posts/${postId}/comments`,
    params: cursorParams(cursor),
    schema: commentPageSchema,
  })

export const createComment = (postId: string, body: string): Promise<Comment> =>
  requestApi({ method: 'POST', url: `/posts/${postId}/comments`, data: { body }, schema: commentSchema })

export const deleteComment = (commentId: string): Promise<void> =>
  requestApi({ method: 'DELETE', url: `/comments/${commentId}` })

export const followUser = (userId: string): Promise<FollowResult> =>
  requestApi({ method: 'PUT', url: `/users/${userId}/follow`, schema: followResultSchema })

export const unfollowUser = (userId: string): Promise<FollowResult> =>
  requestApi({ method: 'DELETE', url: `/users/${userId}/follow`, schema: followResultSchema })

export const fetchFollows = (
  userId: string,
  direction: 'followers' | 'following',
  cursor: string | null,
): Promise<UserPage> =>
  requestApi({
    method: 'GET',
    url: `/users/${userId}/${direction}`,
    params: cursorParams(cursor),
    schema: userPageSchema,
  })
