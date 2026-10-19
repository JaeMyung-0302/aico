import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'
import { createReport } from '@/modules/moderation/data-access-moderation/moderation-api'
import { deletePost } from '@/modules/posts/data-access-posts/posts-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makePost } from '../__fixtures__/posts'
import PostMenu from '../ui-post-card/PostMenu'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('@/modules/posts/data-access-posts/posts-api', () => ({ deletePost: jest.fn() }))
jest.mock('@/modules/moderation/data-access-moderation/moderation-api', () => ({
  createReport: jest.fn(),
  blockUser: jest.fn(),
}))

const POST = makePost()

const renderMenu = (isMine: boolean, onDeleted = jest.fn()) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PostMenu post={POST} isMine={isMine} onDeleted={onDeleted} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => jest.clearAllMocks())

describe('게시물 … 메뉴', () => {
  it('내 글: 삭제 → 확인 → DELETE /posts/:id 후 onDeleted', async () => {
    jest.mocked(deletePost).mockResolvedValue(undefined)
    const onDeleted = jest.fn()
    const user = userEvent.setup()
    await renderMenu(true, onDeleted)
    await user.press(screen.getByRole('button', { name: '게시물 더보기' }))
    await user.press(await screen.findByText('게시물 삭제'))
    expect(await screen.findByText('게시물을 삭제할까요?')).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '삭제' }))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    expect(deletePost).toHaveBeenCalledWith(POST.id)
  })

  it('삭제에 실패하면 오류 알림을 띄우고 화면을 떠나지 않는다', async () => {
    jest.mocked(deletePost).mockRejectedValue(new Error('offline'))
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
    const onDeleted = jest.fn()
    const user = userEvent.setup()
    await renderMenu(true, onDeleted)
    await user.press(screen.getByRole('button', { name: '게시물 더보기' }))
    await user.press(await screen.findByText('게시물 삭제'))
    await user.press(await screen.findByRole('button', { name: '삭제' }))
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('게시물을 삭제하지 못했어요', expect.any(String)))
    expect(onDeleted).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('남의 글: 신고 시트에서 사유를 고르면 POST 신고', async () => {
    jest.mocked(createReport).mockResolvedValue(undefined)
    const user = userEvent.setup()
    await renderMenu(false)
    await user.press(screen.getByRole('button', { name: '게시물 더보기' }))
    await user.press(await screen.findByText(/게시물 신고/))
    await user.press(await screen.findByText('스팸 · 광고'))
    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith({ targetType: 'POST', targetId: POST.id, reason: 'SPAM' }),
    )
  })
})
