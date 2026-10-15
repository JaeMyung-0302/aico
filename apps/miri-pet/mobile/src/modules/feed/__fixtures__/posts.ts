import type { FeedPage, Post } from '@miri-pet/shared'

let sequence = 0

// uuid 형식의 테스트 id (순서대로 커진다)
export const testId = (n: number) => `0199e3a0-0000-7000-8000-${String(n).padStart(12, '0')}`

export const makePost = (overrides: Partial<Post> = {}): Post => {
  sequence += 1
  return {
    id: testId(1000 + sequence),
    author: { id: testId(1), nickname: 'jieun.bori', avatarUrl: null },
    caption: `첫 애견동반 카페 성공! ${sequence}`,
    images: [{ url: 'https://img.test/a.jpg', thumbUrl: 'https://img.test/a_t.jpg' }],
    pets: [{ id: testId(2), name: '보리' }],
    place: null,
    likeCount: 3,
    commentCount: 1,
    isLiked: false,
    createdAt: '2026-10-15T01:00:00.000Z',
    ...overrides,
  }
}

export const makeFeedPage = (items: Post[], overrides: Partial<FeedPage> = {}): FeedPage => ({
  items,
  nextCursor: null,
  ...overrides,
})
