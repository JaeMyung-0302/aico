import type { PostPage } from '@miri-pet/shared'
import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import { makePost } from '@/modules/feed/__fixtures__/posts'
import { fetchPlacePosts } from '@/modules/posts/data-access-posts/posts-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makePlace } from '../__fixtures__/places'
import { fetchPlace } from '../data-access-places/places-api'
import PlaceDetailScreen from '../feature-place-detail/PlaceDetailScreen'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }))
jest.mock('@/shared/analytics/track', () => ({ track: jest.fn() }))
jest.mock('../data-access-places/places-api', () => ({ fetchPlace: jest.fn() }))
jest.mock('@/modules/posts/data-access-posts/posts-api', () => ({ fetchPlacePosts: jest.fn() }))
jest.mock('../util-place-directions', () => ({ openDirections: jest.fn() }))

const PLACE = makePlace()
const page = (count: number, nextCursor: string | null = null): PostPage => ({
  items: Array.from({ length: count }, () => makePost()),
  nextCursor,
})

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PlaceDetailScreen placeId={PLACE.id} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchPlace).mockResolvedValue(PLACE)
})

describe('장소 상세 — 여기서 찍은 게시물 (10)', () => {
  it('이 장소 게시물 수와 썸네일 그리드, 누르면 게시물 상세로', async () => {
    const first = page(3)
    jest.mocked(fetchPlacePosts).mockResolvedValue(first)
    const user = userEvent.setup()
    await renderScreen()
    expect(await screen.findByRole('header', { name: '여기서 찍은 게시물 3' })).toBeOnTheScreen()
    expect(fetchPlacePosts).toHaveBeenCalledWith(PLACE.id, null)
    const tiles = screen.getAllByRole('button', { name: /^게시물 보기/ })
    expect(tiles).toHaveLength(3)
    await user.press(tiles[1]!)
    expect(router.push).toHaveBeenCalledWith(`/posts/${first.items[1]!.id}`)
  })

  it('다음 페이지가 있으면 개수에 +, 더 보기로 이어서 불러온다', async () => {
    const cursor = '0199e3a0-0000-7000-8000-0000000009aa'
    jest.mocked(fetchPlacePosts).mockResolvedValueOnce(page(2, cursor)).mockResolvedValueOnce(page(1))
    const user = userEvent.setup()
    await renderScreen()
    expect(await screen.findByRole('header', { name: '여기서 찍은 게시물 2+' })).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '게시물 더 보기' }))
    expect(await screen.findByRole('header', { name: '여기서 찍은 게시물 3' })).toBeOnTheScreen()
    expect(fetchPlacePosts).toHaveBeenLastCalledWith(PLACE.id, cursor)
    expect(screen.queryByRole('button', { name: '게시물 더 보기' })).toBeNull()
  })

  it('게시물이 없으면 안내', async () => {
    jest.mocked(fetchPlacePosts).mockResolvedValue(page(0))
    await renderScreen()
    expect(await screen.findByText('아직 이 장소에서 찍은 게시물이 없어요')).toBeOnTheScreen()
    expect(screen.getByRole('header', { name: '여기서 찍은 게시물 0' })).toBeOnTheScreen()
  })
})
