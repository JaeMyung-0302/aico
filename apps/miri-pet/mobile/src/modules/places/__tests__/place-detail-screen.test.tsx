import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import { track } from '@/shared/analytics/track'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makePlace } from '../__fixtures__/places'
import { fetchPlace } from '../data-access-places/places-api'
import PlaceDetailScreen from '../feature-place-detail/PlaceDetailScreen'
import { openDirections } from '../util-place-directions'

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true } }))
jest.mock('@/shared/analytics/track', () => ({ track: jest.fn() }))
jest.mock('../data-access-places/places-api', () => ({ fetchPlace: jest.fn() }))
jest.mock('@/modules/posts/data-access-posts/posts-api', () => ({
  fetchPlacePosts: jest.fn(async () => ({ items: [], nextCursor: null })),
}))
jest.mock('../util-place-directions', () => ({ openDirections: jest.fn(async () => 'naver') }))

const PLACE = makePlace()

const renderScreen = (placeId = PLACE.id) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PlaceDetailScreen placeId={placeId} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchPlace).mockResolvedValue(PLACE)
})

describe('장소 상세 (10)', () => {
  it('업종·이름·주소·동반 조건·출처·최종 확인일을 보여주고 place_viewed를 1번 보낸다', async () => {
    await renderScreen()
    expect(await screen.findByRole('header', { name: '숲길 테라스 카페' })).toBeOnTheScreen()
    expect(screen.getByText('카페')).toBeOnTheScreen()
    expect(screen.getByText('서울 성동구 성수동1가')).toBeOnTheScreen()
    expect(screen.getByText('소형견 · 중형견 · 대형견')).toBeOnTheScreen()
    expect(screen.getByText('가능')).toBeOnTheScreen()
    expect(screen.getByText('대형견은 테라스만')).toBeOnTheScreen()
    expect(screen.getByText('최종 확인 2026.10.02 · 출처: 공공데이터')).toBeOnTheScreen()
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('place_viewed', { placeId: PLACE.id, category: 'CAFE' })
  })

  it('길찾기 → 지도 앱 딥링크, 정보가 달라요 → 제보 화면', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '지도 앱으로 길찾기' }))
    expect(openDirections).toHaveBeenCalledWith({ name: PLACE.name, lat: PLACE.lat, lng: PLACE.lng })

    await user.press(screen.getByRole('button', { name: '정보가 달라요 · 제보하기' }))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/places/report', params: { placeId: PLACE.id } })
  })

  it('지도 앱을 하나도 열지 못하면 안내', async () => {
    jest.mocked(openDirections).mockResolvedValueOnce(null)
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '지도 앱으로 길찾기' }))
    expect(await screen.findByText('지도 앱을 열지 못했어요')).toBeOnTheScreen()
  })

  it('없거나 숨겨진 장소면 안내', async () => {
    jest.mocked(fetchPlace).mockRejectedValue(new Error('404'))
    await renderScreen()
    expect(await screen.findByText('장소 정보를 불러오지 못했어요')).toBeOnTheScreen()
    expect(track).not.toHaveBeenCalled()
  })
})
