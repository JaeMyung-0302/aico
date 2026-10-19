import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { Alert } from 'react-native'
import { testId } from '@/modules/feed/__fixtures__/posts'
import { blockUser } from '@/modules/moderation/data-access-moderation/moderation-api'
import { ApiError } from '@/shared/api/api-error'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { CONVERSATION_ID, makeConversation, makeMessage, ME_ID, PEER } from '../__fixtures__/dm'
import {
  acceptConversation,
  fetchConversation,
  fetchMessages,
  hideConversation,
  markConversationRead,
  sendMessage,
} from '../data-access-dm/dm-api'
import DmChatScreen from '../feature-dm-chat/DmChatScreen'

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true },
}))
jest.mock('../data-access-dm/dm-api', () => ({
  fetchConversation: jest.fn(),
  fetchMessages: jest.fn(),
  sendMessage: jest.fn(),
  markConversationRead: jest.fn(),
  acceptConversation: jest.fn(),
  hideConversation: jest.fn(),
}))
jest.mock('@/modules/media/data-access-media/useUploadImage', () => ({ uploadImage: jest.fn() }))
jest.mock('@/modules/media/util-pick-image/pick-image-or-null', () => ({ pickImageOrNull: jest.fn() }))
jest.mock('@/modules/moderation/data-access-moderation/moderation-api', () => ({
  blockUser: jest.fn(),
  createReport: jest.fn(),
}))
jest.mock('@/modules/user/data-access-me/useMe', () => ({ useMe: () => ({ data: { id: mockMeId } }) }))
const mockMeId = '0199e3a0-0000-7000-8000-000000000900'

const MINE = makeMessage({ id: testId(962), senderId: ME_ID, body: '네! 테라스 사진 보내드릴게요' })
const THEIRS = makeMessage({ id: testId(961), senderId: PEER.id, body: '테라스는 대형견도 되나요?' })
const POST_ID = testId(70)
const SHARED = makeMessage({
  id: testId(963),
  senderId: PEER.id,
  body: `게시물을 공유했어요\nmiripet://posts/${POST_ID}`,
})

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <DmChatScreen conversationId={CONVERSATION_ID} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchConversation).mockResolvedValue(makeConversation({ peerLastReadMessageId: MINE.id }))
  jest.mocked(fetchMessages).mockResolvedValue({ items: [MINE, THEIRS], nextCursor: null })
  jest.mocked(markConversationRead).mockResolvedValue(undefined)
  jest.mocked(acceptConversation).mockResolvedValue(makeConversation())
})

describe('대화방 (13)', () => {
  it('상대 이름·메시지, 상대가 읽은 내 메시지에 "읽음", 가장 최근 상대 메시지까지 읽음 처리', async () => {
    await renderScreen()
    expect(await screen.findByText('테라스는 대형견도 되나요?')).toBeOnTheScreen()
    expect(screen.getByText('네! 테라스 사진 보내드릴게요')).toBeOnTheScreen()
    expect(screen.getByText(PEER.nickname)).toBeOnTheScreen()
    expect(screen.getByText('읽음')).toBeOnTheScreen()
    await waitFor(() => expect(markConversationRead).toHaveBeenCalledWith(CONVERSATION_ID, THEIRS.id))
  })

  it('상대가 아직 안 읽었으면 "전송됨"', async () => {
    jest.mocked(fetchConversation).mockResolvedValue(makeConversation({ peerLastReadMessageId: null }))
    await renderScreen()
    expect(await screen.findByText('전송됨')).toBeOnTheScreen()
  })

  it('입력한 글을 보내면 입력창을 비우고 전송 API를 부른다', async () => {
    const user = userEvent.setup()
    jest.mocked(sendMessage).mockResolvedValue(makeMessage({ id: testId(970), senderId: ME_ID, body: '좋아요' }))
    await renderScreen()
    const input = await screen.findByLabelText('메시지 입력')
    await user.type(input, '좋아요')
    await user.press(screen.getByRole('button', { name: '보내기' }))
    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith(CONVERSATION_ID, expect.objectContaining({ body: '좋아요' })),
    )
    expect(input.props.value).toBe('')
  })

  it('요청받은 대화면 수락 배너, 수락하면 API 호출', async () => {
    const user = userEvent.setup()
    jest.mocked(fetchConversation).mockResolvedValue(makeConversation({ state: 'REQUEST' }))
    await renderScreen()
    expect(await screen.findByText(/메시지 요청이에요/)).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '수락' }))
    await waitFor(() => expect(acceptConversation).toHaveBeenCalledWith(CONVERSATION_ID))
  })

  it('공유된 게시물 메시지를 누르면 게시물로 이동', async () => {
    const user = userEvent.setup()
    jest.mocked(fetchMessages).mockResolvedValue({ items: [SHARED, MINE], nextCursor: null })
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '공유된 게시물 보기' }))
    expect(router.push).toHaveBeenCalledWith(`/posts/${POST_ID}`)
  })

  it('상대 메시지를 길게 누르면 메시지 신고 시트', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.longPress(await screen.findByText('테라스는 대형견도 되나요?'))
    expect(await screen.findByRole('button', { name: '메시지 신고' })).toBeOnTheScreen()
  })
})

describe('대화방 차단 (P1)', () => {
  it('차단하면 대화가 403이 돼도 완료 안내를 유지하고, 확인을 누르면 대화 목록으로 간다', async () => {
    const user = userEvent.setup()
    jest.mocked(blockUser).mockImplementation(async () => {
      // 차단 이후 서버는 이 대화를 열어 주지 않는다
      jest
        .mocked(fetchConversation)
        .mockRejectedValue(new ApiError({ code: 'HTTP', status: 403, message: '차단한 사용자예요' }))
      jest
        .mocked(fetchMessages)
        .mockRejectedValue(new ApiError({ code: 'HTTP', status: 403, message: '차단한 사용자예요' }))
    })
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '신고 또는 차단' }))
    await user.press(await screen.findByRole('button', { name: `${PEER.nickname} 님 차단` }))
    await user.press(await screen.findByRole('button', { name: '차단하기' }))

    expect(await screen.findByText('차단했어요')).toBeOnTheScreen()
    await waitFor(() => expect(fetchConversation).toHaveBeenCalledTimes(2))
    expect(screen.getByText('차단했어요')).toBeOnTheScreen()
    expect(screen.queryByText('대화를 열 수 없어요')).toBeNull()

    await user.press(screen.getByRole('button', { name: '확인' }))
    expect(router.dismissTo).toHaveBeenCalledWith('/dm')
  })
})

describe('대화방 요청 배너 실패 (P2)', () => {
  it('요청 삭제에 실패하면 알리고 대화방에 머문다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
    jest.mocked(fetchConversation).mockResolvedValue(makeConversation({ state: 'REQUEST' }))
    jest.mocked(hideConversation).mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '삭제' }))
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('요청을 삭제하지 못했어요', expect.any(String)))
    expect(router.back).not.toHaveBeenCalled()
    alertSpy.mockRestore()
  })

  it('요청 수락에 실패하면 알린다', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined)
    jest.mocked(fetchConversation).mockResolvedValue(makeConversation({ state: 'REQUEST' }))
    jest.mocked(acceptConversation).mockRejectedValue(new Error('offline'))
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '수락' }))
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('요청을 수락하지 못했어요', expect.any(String)))
    alertSpy.mockRestore()
  })
})

describe('대화방 메시지 불러오기 실패', () => {
  it('빈 대화처럼 보이지 않게 실패 안내와 다시 시도', async () => {
    jest.mocked(fetchMessages).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    await renderScreen()
    expect(await screen.findByText('메시지를 불러오지 못했어요')).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('테라스는 대형견도 되나요?')).toBeOnTheScreen()
    expect(screen.queryByText('메시지를 불러오지 못했어요')).toBeNull()
  })
})
