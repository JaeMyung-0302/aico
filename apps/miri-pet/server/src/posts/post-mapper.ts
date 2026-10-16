import type { Post, PostPlace } from '@miri-pet/shared'
import { toUserSummary, USER_SUMMARY_SELECT } from '../common/user-summary'
import type { Prisma } from '../generated/prisma'
import { publicUrlsOf } from '../media/media-keys'

const MEDIA_LOCATION = { id: true, bucket: true, key: true, status: true } as const

// 피드·상세·프로필 그리드가 같은 select → 응답 모양이 한 곳에서 정해진다
export const POST_SELECT = {
  id: true,
  caption: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  author: { select: USER_SUMMARY_SELECT },
  images: { orderBy: { order: 'asc' }, select: { media: { select: MEDIA_LOCATION } } },
  pets: { select: { pet: { select: { id: true, name: true } } } },
  place: { select: { id: true, name: true, category: true, status: true } },
} satisfies Prisma.PostSelect

export type PostRow = Prisma.PostGetPayload<{ select: typeof POST_SELECT }>

// 숨김·폐업 장소는 게시물에 노출하지 않는다(태그는 DB에 남는다)
const toPostPlace = (place: PostRow['place']): PostPlace | null =>
  place && place.status === 'ACTIVE' ? { id: place.id, name: place.name, category: place.category } : null

export const toPostDto = (row: PostRow, isLiked: boolean, baseUrl: string): Post => ({
  id: row.id,
  author: toUserSummary(row.author, baseUrl),
  caption: row.caption,
  images: row.images.flatMap(({ media }) => {
    const { url, thumbUrl } = publicUrlsOf(baseUrl, media)
    return url && thumbUrl ? [{ url, thumbUrl }] : []
  }),
  pets: row.pets.map(({ pet }) => pet),
  place: toPostPlace(row.place),
  likeCount: row.likeCount,
  commentCount: row.commentCount,
  isLiked,
  createdAt: row.createdAt.toISOString(),
})
