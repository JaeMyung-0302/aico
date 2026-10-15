import { type FeedPage, feedPageSchema } from '@miri-pet/shared'
import { requestApi } from '@/shared/api/api-client'
import type { FeedSource } from '../util-feed/feed-pages'

export type FeedRequest = { source: FeedSource; cursor: string | null; excludeFollowing?: boolean }

// GET /feed/home | /feed/explore (excludeFollowing: 홈 소진 뒤 이어 붙이는 추천)
export const fetchFeed = ({ source, cursor, excludeFollowing }: FeedRequest): Promise<FeedPage> =>
  requestApi({
    method: 'GET',
    url: `/feed/${source}`,
    params: { ...(cursor ? { cursor } : {}), ...(excludeFollowing ? { excludeFollowing: 'true' } : {}) },
    schema: feedPageSchema,
  })
