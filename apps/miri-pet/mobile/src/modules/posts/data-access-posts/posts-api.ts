import { type CreatePostRequest, type Post, type PostPage, postPageSchema, postSchema } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'

export const fetchPost = (postId: string): Promise<Post> =>
  requestApi({ method: 'GET', url: `/posts/${postId}`, schema: postSchema })

export const createPost = (request: CreatePostRequest): Promise<Post> =>
  requestApi({ method: 'POST', url: '/posts', data: request, schema: postSchema })

export const deletePost = (postId: string): Promise<void> => requestApi({ method: 'DELETE', url: `/posts/${postId}` })

// 10 장소 상세 "여기서 찍은 게시물"
export const fetchPlacePosts = (placeId: string, cursor: string | null): Promise<PostPage> =>
  requestApi({
    method: 'GET',
    url: `/places/${placeId}/posts`,
    params: cursor ? { cursor } : {},
    schema: postPageSchema,
  })

export const fetchUserPosts = (userId: string, cursor: string | null): Promise<PostPage> =>
  requestApi({
    method: 'GET',
    url: `/users/${userId}/posts`,
    params: cursor ? { cursor } : {},
    schema: postPageSchema,
  })
