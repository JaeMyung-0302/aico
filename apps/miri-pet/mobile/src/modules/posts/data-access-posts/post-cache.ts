import type { Post, PostPage } from '@miri-pet/shared'
import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { FeedSlice } from '@/modules/feed/util-feed/feed-pages'

export const postQueryKey = (postId: string) => ['posts', postId] as const
export const userPostsQueryKey = (userId: string) => ['posts', 'user', userId] as const
export const placePostsQueryKey = (placeId: string) => ['posts', 'place', placeId] as const
const POST_PAGE_PREFIXES = [['posts', 'user'], ['posts', 'place']] as const
const FEED_PREFIX = ['feed'] as const

export type PostPatch = Partial<Pick<Post, 'isLiked' | 'likeCount' | 'commentCount'>>

const patchItems = (items: readonly Post[], postId: string, patch: PostPatch): Post[] =>
  items.map((item) => (item.id === postId ? { ...item, ...patch } : item))

// 같은 게시물이 피드·상세·프로필/장소 그리드 캐시에 동시에 있을 수 있다 → 모두 같은 값으로 맞춘다
export const patchPostInCache = (queryClient: QueryClient, postId: string, patch: PostPatch): void => {
  queryClient.setQueriesData<InfiniteData<FeedSlice>>({ queryKey: FEED_PREFIX }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((slice) => ({
            ...slice,
            page: { ...slice.page, items: patchItems(slice.page.items, postId, patch) },
          })),
        }
      : data,
  )
  POST_PAGE_PREFIXES.forEach((queryKey) =>
    queryClient.setQueriesData<InfiniteData<PostPage>>({ queryKey }, (data) =>
      data
        ? { ...data, pages: data.pages.map((page) => ({ ...page, items: patchItems(page.items, postId, patch) })) }
        : data,
    ),
  )
  queryClient.setQueryData<Post>(postQueryKey(postId), (post) => (post ? { ...post, ...patch } : post))
}
