import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchUnreadCount } from '@/modules/notifications/data-access-notifications/notifications-api'
import { fetchUpcomingVaccination } from '@/modules/vaccinations/data-access-vaccinations/vaccinations-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makeFeedPage, makePost } from '../__fixtures__/posts'
import { fetchFeed } from '../data-access-feed/feed-api'
import HomeScreen from '../feature-home/HomeScreen'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('../data-access-feed/feed-api', () => ({ fetchFeed: jest.fn() }))
jest.mock('@/modules/notifications/data-access-notifications/notifications-api', () => ({
  fetchUnreadCount: jest.fn(),
}))
jest.mock('@/modules/vaccinations/data-access-vaccinations/vaccinations-api', () => ({
  fetchUpcomingVaccination: jest.fn(),
}))
jest.mock('@/modules/user/data-access-me/useMe', () => ({ useMe: () => ({ data: { id: 'me' } }) }))

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <HomeScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchFeed).mockResolvedValue(makeFeedPage([makePost()], { nextCursor: 'next' }))
  jest.mocked(fetchUnreadCount).mockResolvedValue({ count: 2 })
  jest.mocked(fetchUpcomingVaccination).mockResolvedValue({ item: null })
})

describe('홈 (04)', () => {
  it('팔로잉 탭이 기본, 탐색 탭을 누르면 전체 최신순(explore)을 요청한다', async () => {
    const user = userEvent.setup()
    await renderScreen()
    expect(await screen.findByRole('tab', { name: '팔로잉' })).toBeSelected()
    expect(fetchFeed).toHaveBeenCalledWith({ source: 'home', cursor: null })
    await user.press(screen.getByRole('tab', { name: '탐색' }))
    expect(screen.getByRole('tab', { name: '탐색' })).toBeSelected()
    expect(fetchFeed).toHaveBeenCalledWith({ source: 'explore', cursor: null })
  })

  it('안 읽은 알림이 있으면 종 아이콘 라벨에 표시, 누르면 알림함 / + 는 새 게시물', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '알림, 새 알림 있음' }))
    expect(router.push).toHaveBeenCalledWith('/notifications')
    await user.press(screen.getByRole('button', { name: '새 게시물' }))
    expect(router.push).toHaveBeenCalledWith('/posts/new')
  })

  it('안 읽은 알림이 없으면 그냥 "알림"', async () => {
    jest.mocked(fetchUnreadCount).mockResolvedValue({ count: 0 })
    await renderScreen()
    expect(await screen.findByRole('button', { name: '알림' })).toBeOnTheScreen()
  })
})
