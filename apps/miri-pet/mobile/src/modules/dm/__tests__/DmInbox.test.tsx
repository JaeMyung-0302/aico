import type { MemberState } from '@miri-pet/shared'
import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { testId } from '@/modules/feed/__fixtures__/posts'
import { blockUser } from '@/modules/moderation/data-access-moderation/moderation-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makeConversation, makeMessage, ME_ID } from '../__fixtures__/dm'
import { acceptConversation, fetchConversations, hideConversation } from '../data-access-dm/dm-api'
import DmInboxScreen from '../feature-dm-inbox/DmInboxScreen'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }))
jest.mock('../data-access-dm/dm-api', () => ({
  fetchConversations: jest.fn(),
  acceptConversation: jest.fn(),
  hideConversation: jest.fn(),
}))
jest.mock('@/modules/moderation/data-access-moderation/moderation-api', () => ({ blockUser: jest.fn() }))
jest.mock('@/modules/user/data-access-me/useMe', () => ({ useMe: () => ({ data: { id: mockMeId } }) }))
const mockMeId = '0199e3a0-0000-7000-8000-000000000900'

const FRIEND = makeConversation({
  id: testId(951),
  peer: { id: testId(911), nickname: 'jieun.bori', avatarUrl: null },
  lastMessage: makeMessage({ conversationId: testId(951), body: '다음에 같이 산책해요', senderId: ME_ID }),
  unreadCount: 0,
})
const UNREAD = makeConversation({
  id: testId(952),
  peer: { id: testId(912), nickname: 'hodu.mom', avatarUrl: null },
  lastMessage: makeMessage({ conversationId: testId(952), body: null, imageUrl: 'https://img.test/p/x/1440.jpg' }),
  unreadCount: 3,
})
const REQUEST = makeConversation({
  id: testId(953),
  state: 'REQUEST',
  peer: { id: testId(913), nickname: 'run.with.coco', avatarUrl: null },
  lastMessage: makeMessage({ conversationId: testId(953), body: '안녕하세요! 성수동 산책 코스 여쭤봐도 될까요?' }),
  unreadCount: 1,
})

const pageFor = (state: MemberState) => ({ items: state === 'REQUEST' ? [REQUEST] : [FRIEND, UNREAD], nextCursor: null })

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <DmInboxScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchConversations).mockImplementation(async (state) => pageFor(state))
  jest.mocked(acceptConversation).mockResolvedValue({ ...REQUEST, state: 'ACCEPTED' })
  jest.mocked(hideConversation).mockResolvedValue(undefined)
  jest.mocked(blockUser).mockResolvedValue(undefined)
})

describe('대화 목록 (12)', () => {
  it('대화 탭: 수락된 대화만, 내 메시지는 "나:", 사진 미리보기, 안 읽은 수 배지', async () => {
    await renderScreen()
    expect(await screen.findByText('jieun.bori')).toBeOnTheScreen()
    expect(screen.getByText('나: 다음에 같이 산책해요')).toBeOnTheScreen()
    expect(screen.getByText('사진')).toBeOnTheScreen()
    expect(screen.getByLabelText('안 읽은 메시지 3개')).toBeOnTheScreen()
    expect(screen.queryByText('run.with.coco')).toBeNull()
    // 요청 탭 라벨에 요청 수
    expect(await screen.findByRole('tab', { name: '요청 1' })).toBeOnTheScreen()
  })

  it('요청함 탭에는 REQUEST만 보이고, 안내 문구와 차단·삭제·수락 버튼이 있다', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('tab', { name: '요청 1' }))
    expect(await screen.findByText('run.with.coco')).toBeOnTheScreen()
    expect(screen.queryByText('jieun.bori')).toBeNull()
    expect(screen.queryByText('hodu.mom')).toBeNull()
    expect(screen.getByText(/서로 팔로우하지 않은 사람의 메시지예요/)).toBeOnTheScreen()
    expect(fetchConversations).toHaveBeenCalledWith('REQUEST', null)

    await user.press(screen.getByRole('button', { name: 'run.with.coco 요청 수락' }))
    await waitFor(() => expect(acceptConversation).toHaveBeenCalledWith(REQUEST.id))
    await user.press(screen.getByRole('button', { name: 'run.with.coco 요청 삭제' }))
    await waitFor(() => expect(hideConversation).toHaveBeenCalledWith(REQUEST.id))
  })

  it('요청 차단은 확인 후 사용자를 차단한다', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('tab', { name: '요청 1' }))
    await user.press(await screen.findByRole('button', { name: 'run.with.coco 차단' }))
    await user.press(await screen.findByRole('button', { name: '차단하기' }))
    await waitFor(() => expect(blockUser).toHaveBeenCalledWith(REQUEST.peer.id))
  })

  it('대화를 누르면 대화방으로 이동', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByText('hodu.mom'))
    expect(router.push).toHaveBeenCalledWith(`/dm/${UNREAD.id}`)
  })

  it('대화가 없으면 안내', async () => {
    jest.mocked(fetchConversations).mockResolvedValue({ items: [], nextCursor: null })
    await renderScreen()
    expect(await screen.findByText('아직 대화가 없어요')).toBeOnTheScreen()
  })
})
