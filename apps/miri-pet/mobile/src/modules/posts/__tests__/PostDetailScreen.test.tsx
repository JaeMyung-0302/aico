import type { Comment } from '@miri-pet/shared'
import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { makePost, testId } from '@/modules/feed/__fixtures__/posts'
import { createComment, deleteComment, fetchComments } from '@/modules/social/data-access-social/social-api'
import { ApiError } from '@/shared/api/api-error'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { fetchPost } from '../data-access-posts/posts-api'
import PostDetailScreen from '../feature-post-detail/PostDetailScreen'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }))
jest.mock('../data-access-posts/posts-api', () => ({ fetchPost: jest.fn(), deletePost: jest.fn() }))
jest.mock('@/modules/social/data-access-social/social-api', () => ({
  fetchComments: jest.fn(),
  createComment: jest.fn(),
  deleteComment: jest.fn(),
  likePost: jest.fn(),
  unlikePost: jest.fn(),
}))
jest.mock('@/modules/user/data-access-me/useMe', () => ({ useMe: () => ({ data: { id: ME } }) }))

const ME = '0199e3a0-0000-7000-8000-0000000000aa'
const AUTHOR = { id: testId(1), nickname: 'jieun.bori', avatarUrl: null }
const POST = makePost({ author: AUTHOR, caption: '첫 애견동반 카페', commentCount: 2 })

const comment = (n: number, author: Comment['author'], body: string): Comment => ({
  id: testId(500 + n),
  postId: POST.id,
  author,
  body,
  createdAt: '2026-10-15T01:00:00.000Z',
})
const FROM_MINSU = comment(1, { id: testId(3), nickname: 'minsu_big3', avatarUrl: null }, '여기 대형견도 되나요?')
const FROM_AUTHOR = comment(2, AUTHOR, '테라스는 대형견도 된대요!')
const MINE = comment(3, { id: ME, nickname: '나', avatarUrl: null }, '저도 가볼게요')

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PostDetailScreen postId={POST.id} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchPost).mockResolvedValue(POST)
  jest.mocked(fetchComments).mockResolvedValue({ items: [FROM_MINSU, FROM_AUTHOR], nextCursor: null })
})

describe('게시물 상세 (05)', () => {
  it('게시물과 댓글(오래된순)을 보여주고 게시물 작성자 댓글에 "작성자" 표시', async () => {
    await renderScreen()
    expect(await screen.findByText(/첫 애견동반 카페/)).toBeOnTheScreen()
    expect(await screen.findByText(/여기 대형견도 되나요\?/)).toBeOnTheScreen()
    expect(screen.getByText(/· 작성자/)).toBeOnTheScreen()
    expect(fetchComments).toHaveBeenCalledWith(POST.id, null)
  })

  it('댓글 입력 → 게시 → 입력창 비우고 목록을 다시 받는다, 빈 입력은 게시 비활성', async () => {
    jest.mocked(createComment).mockResolvedValue(MINE)
    const user = userEvent.setup()
    await renderScreen()
    await screen.findByText(/여기 대형견도 되나요\?/)
    expect(screen.getByRole('button', { name: '댓글 게시' })).toBeDisabled()
    jest.mocked(fetchComments).mockResolvedValue({ items: [FROM_MINSU, FROM_AUTHOR, MINE], nextCursor: null })
    await user.type(screen.getByLabelText('댓글 입력'), ' 저도 가볼게요 ')
    await user.press(screen.getByRole('button', { name: '댓글 게시' }))

    expect(createComment).toHaveBeenCalledWith(POST.id, '저도 가볼게요')
    expect(await screen.findByText(/저도 가볼게요/)).toBeOnTheScreen()
    await waitFor(() => expect(screen.getByLabelText('댓글 입력')).toHaveDisplayValue(''))
  })

  it('내 댓글은 삭제할 수 있다', async () => {
    jest.mocked(fetchComments).mockResolvedValue({ items: [MINE], nextCursor: null })
    jest.mocked(deleteComment).mockResolvedValue(undefined)
    const user = userEvent.setup()
    await renderScreen()
    await screen.findByText(/저도 가볼게요/)
    await user.press(screen.getByRole('button', { name: '댓글 더보기' }))
    jest.mocked(fetchComments).mockResolvedValue({ items: [], nextCursor: null })
    await user.press(await screen.findByRole('button', { name: '댓글 삭제' }))
    expect(deleteComment).toHaveBeenCalledWith(MINE.id)
    await waitFor(() => expect(screen.queryByText(/저도 가볼게요/)).toBeNull())
  })

  it('남의 댓글 더보기 → 신고 시트', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await screen.findByText(/여기 대형견도 되나요\?/)
    await user.press(screen.getAllByRole('button', { name: '댓글 더보기' })[0]!)
    expect(await screen.findByText(/신고/)).toBeOnTheScreen()
  })

  it('없거나 볼 수 없는 게시물(404)이면 안내', async () => {
    jest
      .mocked(fetchPost)
      .mockRejectedValue(new ApiError({ code: 'HTTP', status: 404, message: '게시물을 찾을 수 없어요' }))
    await renderScreen()
    expect(await screen.findByText('게시물을 찾을 수 없어요')).toBeOnTheScreen()
  })
})

describe('게시물 상세 불러오기 실패', () => {
  it('네트워크 오류는 "찾을 수 없음"이 아니라 실패 안내와 다시 시도', async () => {
    jest
      .mocked(fetchPost)
      .mockRejectedValueOnce(new ApiError({ code: 'NETWORK', message: '네트워크 연결을 확인해 주세요' }))
    const user = userEvent.setup()
    await renderScreen()
    expect(await screen.findByText('게시물을 불러오지 못했어요')).toBeOnTheScreen()
    expect(screen.queryByText('게시물을 찾을 수 없어요')).toBeNull()
    await user.press(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText(/첫 애견동반 카페/)).toBeOnTheScreen()
  })

  it('404는 다시 시도 없이 안내만', async () => {
    jest
      .mocked(fetchPost)
      .mockRejectedValue(new ApiError({ code: 'HTTP', status: 404, message: '게시물을 찾을 수 없어요' }))
    await renderScreen()
    expect(await screen.findByText('게시물을 찾을 수 없어요')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull()
  })
})
