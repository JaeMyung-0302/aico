import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FEED_QUERY_KEY } from '@/modules/feed/data-access-feed/useFeed'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import type { PickedImage } from '@/modules/media/data-access-media/prepare-image'
import { placePostsQueryKey, postQueryKey, userPostsQueryKey } from './post-cache'
import { createPost, deletePost, fetchPlacePosts, fetchPost, fetchUserPosts } from './posts-api'

// 첫 페이지 커서. 반환 타입을 명시해 pageParam이 string | null로 추론되게 한다
const firstCursor = (): string | null => null

export const usePost = (postId: string | undefined) =>
  useQuery({ queryKey: postQueryKey(postId ?? ''), queryFn: () => fetchPost(postId ?? ''), enabled: Boolean(postId) })

export const useUserPosts = (userId: string | undefined) =>
  useInfiniteQuery({
    queryKey: userPostsQueryKey(userId ?? ''),
    queryFn: ({ pageParam }) => fetchUserPosts(userId ?? '', pageParam),
    initialPageParam: firstCursor(),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(userId),
  })

export const usePlacePosts = (placeId: string | undefined) =>
  useInfiniteQuery({
    queryKey: placePostsQueryKey(placeId ?? ''),
    queryFn: ({ pageParam }) => fetchPlacePosts(placeId ?? '', pageParam),
    initialPageParam: firstCursor(),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(placeId),
  })

export type NewPostInput = {
  photos: readonly PickedImage[]
  petIds: readonly string[]
  caption: string
  placeId?: string | null
}

// 사진을 순서대로 POST 용도로 올린 뒤(서버가 EXIF 제거) 게시물을 만든다
const submitPost = async ({ photos, petIds, caption, placeId }: NewPostInput) => {
  const mediaIds = await photos.reduce<Promise<string[]>>(
    async (uploaded, photo) => [...(await uploaded), await uploadImage(photo, 'POST')],
    Promise.resolve([]),
  )
  return createPost({ caption, mediaIds, petIds: [...petIds], ...(placeId ? { placeId } : {}) })
}

export const useCreatePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: submitPost,
    onSuccess: (post) => {
      queryClient.setQueryData(postQueryKey(post.id), post)
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: userPostsQueryKey(post.author.id) }),
        ...(post.place ? [queryClient.invalidateQueries({ queryKey: placePostsQueryKey(post.place.id) })] : []),
      ])
    },
  })
}

export const useDeletePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: (_result, postId) => {
      queryClient.removeQueries({ queryKey: postQueryKey(postId), exact: true })
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['posts', 'user'] }),
        queryClient.invalidateQueries({ queryKey: ['posts', 'place'] }),
      ])
    },
  })
}
