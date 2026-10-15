import type { FeedPage, Post } from '@miri-pet/shared'

export type FeedSource = 'home' | 'explore'
export type FeedPageParam = { source: FeedSource; cursor: string | null }
// 팔로잉 탭의 한 페이지: 어느 엔드포인트에서 왔는지 함께 둔다
export type FeedSlice = { source: FeedSource; page: FeedPage }
export type FeedRow = { type: 'post'; post: Post } | { type: 'divider' }

// D10: 홈(팔로잉 ∪ 본인)을 끝까지 → fallback이면 explore(팔로잉 제외)를 처음부터 이어 붙인다
export const nextFeedParam = ({ source, page }: FeedSlice): FeedPageParam | undefined => {
  if (page.nextCursor) return { source, cursor: page.nextCursor }
  if (source === 'home' && page.fallback === 'explore') return { source: 'explore', cursor: null }
  return undefined
}

type RowsState = { rows: FeedRow[]; ids: ReadonlySet<string>; hasDivider: boolean }

const appendPost = (state: RowsState, source: FeedSource, post: Post): RowsState => {
  if (state.ids.has(post.id)) return state
  const needsDivider = source === 'explore' && !state.hasDivider
  const divider: FeedRow[] = needsDivider ? [{ type: 'divider' }] : []
  return {
    rows: [...state.rows, ...divider, { type: 'post', post }],
    ids: new Set([...state.ids, post.id]),
    hasDivider: state.hasDivider || needsDivider,
  }
}

// 첫 explore 게시물 앞에 "추천 게시물" 구분선. 페이지 경계에서 겹친 id는 한 번만 그린다
export const feedRows = (slices: readonly FeedSlice[]): FeedRow[] =>
  slices.reduce<RowsState>(
    (state, { source, page }) => page.items.reduce((inner, post) => appendPost(inner, source, post), state),
    { rows: [], ids: new Set(), hasDivider: false },
  ).rows
