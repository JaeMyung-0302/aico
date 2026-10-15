import { makeFeedPage, makePost, testId } from '../__fixtures__/posts'
import { feedRows, nextFeedParam } from '../util-feed/feed-pages'

describe('팔로잉 피드 페이지 이어 붙이기 (D10)', () => {
  it('홈에 다음 커서가 있으면 홈을 계속, fallback이면 explore 첫 페이지', () => {
    expect(nextFeedParam({ source: 'home', page: makeFeedPage([makePost()], { nextCursor: testId(9) }) })).toEqual({
      source: 'home',
      cursor: testId(9),
    })
    expect(nextFeedParam({ source: 'home', page: makeFeedPage([], { fallback: 'explore' }) })).toEqual({
      source: 'explore',
      cursor: null,
    })
  })

  it('explore는 커서가 있으면 계속, 없으면 끝', () => {
    expect(nextFeedParam({ source: 'explore', page: makeFeedPage([], { nextCursor: testId(3) }) })).toEqual({
      source: 'explore',
      cursor: testId(3),
    })
    expect(nextFeedParam({ source: 'explore', page: makeFeedPage([]) })).toBeUndefined()
    expect(nextFeedParam({ source: 'home', page: makeFeedPage([]) })).toBeUndefined()
  })

  it('행 목록: 첫 explore 게시물 앞에 구분선 1번, 같은 id 중복은 한 번만', () => {
    const [a, b, c] = [makePost(), makePost(), makePost()]
    const rows = feedRows([
      { source: 'home', page: makeFeedPage([a!], { fallback: 'explore' }) },
      { source: 'explore', page: makeFeedPage([b!, a!], { nextCursor: testId(5) }) },
      { source: 'explore', page: makeFeedPage([c!]) },
    ])
    expect(rows.map((row) => (row.type === 'post' ? row.post.id : 'divider'))).toEqual([a!.id, 'divider', b!.id, c!.id])
  })

  it('explore가 비면 구분선도 없다', () => {
    const a = makePost()
    const rows = feedRows([
      { source: 'home', page: makeFeedPage([a], { fallback: 'explore' }) },
      { source: 'explore', page: makeFeedPage([]) },
    ])
    expect(rows).toEqual([{ type: 'post', post: a }])
  })
})
