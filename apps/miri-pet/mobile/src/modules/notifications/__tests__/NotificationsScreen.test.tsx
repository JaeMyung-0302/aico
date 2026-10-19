import type { Notification } from '@miri-pet/shared'
import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { testId } from '@/modules/feed/__fixtures__/posts'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { fetchNotifications, readAllNotifications } from '../data-access-notifications/notifications-api'
import NotificationsScreen from '../feature-notifications/NotificationsScreen'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }))
jest.mock('../data-access-notifications/notifications-api', () => ({
  fetchNotifications: jest.fn(),
  fetchUnreadCount: jest.fn(async () => ({ count: 0 })),
  readAllNotifications: jest.fn(),
}))

const NOW = new Date()
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60_000).toISOString()
const HODU = { id: testId(7), nickname: 'hodu.mom', avatarUrl: null }
const POST_ID = testId(70)

const notification = (overrides: Partial<Notification>): Notification => ({
  id: testId(800),
  kind: 'LIKE',
  actor: HODU,
  refId: POST_ID,
  postId: POST_ID,
  thumbUrl: null,
  preview: null,
  readAt: null,
  createdAt: minutesAgo(5),
  ...overrides,
})

const ITEMS: Notification[] = [
  notification({ id: testId(803), kind: 'COMMENT', preview: '여기 대형견도 되나요?', createdAt: minutesAgo(60) }),
  notification({ id: testId(802), kind: 'LIKE', createdAt: minutesAgo(120) }),
  notification({ id: testId(801), kind: 'FOLLOW', refId: null, postId: null, createdAt: minutesAgo(3 * 24 * 60) }),
]

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <NotificationsScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchNotifications).mockResolvedValue({ items: ITEMS, nextCursor: null })
  jest.mocked(readAllNotifications).mockResolvedValue(undefined)
})

describe('알림 (07)', () => {
  it('진입하면 모두 읽음 처리하고 종류별 문구를 보여준다', async () => {
    await renderScreen()
    expect(await screen.findByText('hodu.mom님이 댓글을 남겼어요: 여기 대형견도 되나요?')).toBeOnTheScreen()
    expect(screen.getByText('hodu.mom님이 게시물을 좋아해요')).toBeOnTheScreen()
    expect(screen.getByText('hodu.mom님이 회원님을 팔로우해요')).toBeOnTheScreen()
    await waitFor(() => expect(readAllNotifications).toHaveBeenCalledTimes(1))
  })

  it('오늘 / 이번 주 구역으로 나눈다', async () => {
    await renderScreen()
    expect(await screen.findByText('오늘')).toBeOnTheScreen()
    expect(screen.getByText('이번 주')).toBeOnTheScreen()
  })

  it('좋아요·댓글은 게시물로, 팔로우는 프로필로 이동', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByText('hodu.mom님이 게시물을 좋아해요'))
    expect(router.push).toHaveBeenLastCalledWith(`/posts/${POST_ID}`)
    await user.press(screen.getByText('hodu.mom님이 회원님을 팔로우해요'))
    expect(router.push).toHaveBeenLastCalledWith(`/users/${HODU.id}`)
  })

  it('알림이 없으면 빈 화면 안내', async () => {
    jest.mocked(fetchNotifications).mockResolvedValue({ items: [], nextCursor: null })
    await renderScreen()
    expect(await screen.findByText('아직 알림이 없어요')).toBeOnTheScreen()
  })
})

describe('알림 불러오기 실패', () => {
  it('실패 안내와 다시 시도 → 다시 받는다', async () => {
    jest.mocked(fetchNotifications).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    await renderScreen()
    expect(await screen.findByText('알림을 불러오지 못했어요')).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '다시 시도' }))
    await waitFor(() => expect(fetchNotifications).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('알림을 불러오지 못했어요')).toBeNull()
  })
})
