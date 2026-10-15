import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import { likePost } from '@/modules/social/data-access-social/social-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makeFeedPage, makePost } from '../__fixtures__/posts'
import { fetchFeed } from '../data-access-feed/feed-api'
import FollowingFeed from '../ui-feed-list/FollowingFeed'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }))
jest.mock('../data-access-feed/feed-api', () => ({ fetchFeed: jest.fn() }))
jest.mock('@/modules/social/data-access-social/social-api', () => ({
  likePost: jest.fn(),
  unlikePost: jest.fn(),
}))
jest.mock('@/modules/user/data-access-me/useMe', () => ({ useMe: () => ({ data: { id: 'me' } }) }))

const renderFeed = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <FollowingFeed header={null} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
})

describe('팔로잉 피드 (04)', () => {
  it('홈 응답에 fallback이 오면 "추천 게시물" 구분선을 그리고 explore(excludeFollowing)를 요청한다', async () => {
    const mine = makePost({ caption: '팔로잉 글' })
    const recommended = makePost({ caption: '추천 글', author: { id: 'x', nickname: 'stranger', avatarUrl: null } })
    jest
      .mocked(fetchFeed)
      .mockResolvedValueOnce(makeFeedPage([mine], { fallback: 'explore' }))
      .mockResolvedValueOnce(makeFeedPage([recommended]))
    await renderFeed()

    expect(await screen.findByText('추천 게시물')).toBeOnTheScreen()
    expect(screen.getByText(/팔로잉 글/)).toBeOnTheScreen()
    expect(screen.getByText(/추천 글/)).toBeOnTheScreen()
    expect(fetchFeed).toHaveBeenNthCalledWith(1, { source: 'home', cursor: null })
    expect(fetchFeed).toHaveBeenNthCalledWith(2, { source: 'explore', cursor: null, excludeFollowing: true })
  })

  it('fallback 전에는 구분선이 없다', async () => {
    jest.mocked(fetchFeed).mockResolvedValueOnce(makeFeedPage([makePost({ caption: '첫 글' })], { nextCursor: 'c1' }))
    await renderFeed()
    expect(await screen.findByText(/첫 글/)).toBeOnTheScreen()
    expect(screen.queryByText('추천 게시물')).toBeNull()
    expect(fetchFeed).toHaveBeenCalledTimes(1)
  })

  it('아무 게시물도 없으면 빈 화면 안내', async () => {
    jest
      .mocked(fetchFeed)
      .mockResolvedValueOnce(makeFeedPage([], { fallback: 'explore' }))
      .mockResolvedValueOnce(makeFeedPage([]))
    await renderFeed()
    expect(await screen.findByText('아직 게시물이 없어요')).toBeOnTheScreen()
  })

  it('좋아요를 누르면 바로 반영하고 서버 결과로 맞춘다, 댓글을 누르면 상세로', async () => {
    const post = makePost({ likeCount: 3, isLiked: false })
    jest.mocked(fetchFeed).mockResolvedValue(makeFeedPage([post], { nextCursor: 'more' }))
    jest.mocked(likePost).mockResolvedValue({ isLiked: true, likeCount: 4 })
    const user = userEvent.setup()
    await renderFeed()
    await user.press(await screen.findByRole('button', { name: '좋아요 3개, 좋아요 누르기' }))
    expect(await screen.findByRole('button', { name: '좋아요 4개, 좋아요 취소' })).toBeOnTheScreen()
    expect(likePost).toHaveBeenCalledWith(post.id)

    await user.press(screen.getByRole('button', { name: '댓글 1개 보기' }))
    expect(router.push).toHaveBeenCalledWith(`/posts/${post.id}`)
  })
})
