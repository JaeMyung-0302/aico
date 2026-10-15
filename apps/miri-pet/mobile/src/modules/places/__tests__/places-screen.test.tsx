import { render, screen, userEvent, within } from '@testing-library/react-native'
import * as Location from 'expo-location'
import { router } from 'expo-router'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makePlace } from '../__fixtures__/places'
import { fetchAppConfig, fetchPlaces } from '../data-access-places/places-api'
import PlacesScreen from '../feature-places/PlacesScreen'
import { isGpsBuildEnabled } from '../util-location/gps-build-flag'

// 네이버맵 네이티브 뷰는 jest에서 돌지 않는다 → 마커 수를 텍스트로 그리고, 카메라 이동·마커 탭을 버튼으로 흉내 내는 가짜 뷰
jest.mock('@mj-studio/react-native-naver-map', () => {
  const { Pressable, Text, View } = jest.requireActual<typeof import('react-native')>('react-native')
  const { forwardRef, useImperativeHandle } = jest.requireActual<typeof import('react')>('react')
  type MockRegion = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }
  type MockProps = {
    initialRegion?: MockRegion
    clusters?: { markers: { identifier: string }[] }[]
    onCameraIdle?: (params: { region: MockRegion }) => void
    onTapClusterLeaf?: (params: { markerIdentifier: string }) => void
  }
  const NaverMapView = forwardRef<object, MockProps>(
    ({ initialRegion, clusters, onCameraIdle, onTapClusterLeaf }, ref) => {
      useImperativeHandle(ref, () => ({ animateCameraTo: jest.fn(), animateRegionTo: jest.fn() }))
      const markers = clusters?.[0]?.markers ?? []
      const region = initialRegion ?? { latitude: 0, longitude: 0, latitudeDelta: 0, longitudeDelta: 0 }
      return (
        <View testID="naver-map">
          <Text>{`지도 마커 ${markers.length}개`}</Text>
          <Pressable accessibilityRole="button" onPress={() => onCameraIdle?.({ region })}>
            <Text>테스트: 제자리 정지</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onCameraIdle?.({ region: { ...region, latitude: region.latitude + 0.05 } })}
          >
            <Text>테스트: 북쪽으로 이동</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => onTapClusterLeaf?.({ markerIdentifier: markers[0]?.identifier ?? '' })}
          >
            <Text>테스트: 첫 마커 탭</Text>
          </Pressable>
        </View>
      )
    },
  )
  return { NaverMapView }
})
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied', granted: false })),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}))
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('../data-access-places/places-api', () => ({
  fetchPlaces: jest.fn(),
  fetchAppConfig: jest.fn(),
}))
jest.mock('../util-location/gps-build-flag', () => ({ isGpsBuildEnabled: jest.fn(() => false) }))
// 위치기반서비스 동의(LOCATION) — 철회 시 동작은 useMyLocation.test에서 다룬다
jest.mock('@/modules/settings/data-access-consents/consents-api', () => ({
  fetchMyConsents: jest.fn(async () => [
    { kind: 'LOCATION', version: 'v1', agreedAt: '2026-10-01T03:00:00.000Z', withdrawnAt: null },
  ]),
}))

const CAFE = makePlace()
const PARK = makePlace({ id: '01890a5d-ac96-774b-bcce-b302099a8002', name: '뚝섬 산책 공원', category: 'PARK' })

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PlacesScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const button = (name: string | RegExp) => screen.getByRole('button', { name })

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchPlaces).mockResolvedValue({ items: [CAFE, PARK], isTruncated: false })
  jest.mocked(fetchAppConfig).mockResolvedValue({ isGpsEnabled: false })
  jest.mocked(isGpsBuildEnabled).mockReturnValue(false)
})

describe('장소 탭 (08 지도 / 09 목록)', () => {
  it('위치 권한 없이도 기본 지역(성수동) bbox로 장소를 불러와 지도에 마커를 그린다', async () => {
    await renderScreen()
    expect(await screen.findByText('지도 마커 2개')).toBeOnTheScreen()
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
    const [[query]] = jest.mocked(fetchPlaces).mock.calls
    expect(query?.bbox.swLat).toBeLessThan(37.5446)
    expect(query?.bbox.neLat).toBeGreaterThan(37.5446)
    expect(button('성수동 주변 · 지역 바꾸기')).toBeOnTheScreen()
  })

  it('목록 모드: 거리순으로 다시 요청하고 이름·조건·확인일을 보여준다 → 누르면 상세로', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.press(button('목록으로 보기'))

    expect(await screen.findByText('성수동 주변 2곳')).toBeOnTheScreen()
    expect(jest.mocked(fetchPlaces)).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'distance' }))
    const row = button(/숲길 테라스 카페/)
    expect(within(row).getByText('대형견까지 · 실내 동반')).toBeOnTheScreen()
    expect(within(row).getByText('최종 확인 2026.10.02 · 출처: 공공데이터')).toBeOnTheScreen()

    await user.press(row)
    expect(router.push).toHaveBeenCalledWith({ pathname: '/places/[placeId]', params: { placeId: CAFE.id } })
  })

  it('필터 칩을 고르면 그 조건으로 다시 요청한다', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await screen.findByText('지도 마커 2개')
    await user.press(button('대형견'))
    expect(jest.mocked(fetchPlaces)).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: { category: null, size: 'L', isIndoorOnly: false } }),
    )
  })

  it('지역을 바꾸면 그 지역 bbox로 요청한다', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.press(button('성수동 주변 · 지역 바꾸기'))
    await user.press(button('연남동'))
    expect(button('연남동 주변 · 지역 바꾸기')).toBeOnTheScreen()
    const lastQuery = jest.mocked(fetchPlaces).mock.calls.at(-1)?.[0]
    expect(lastQuery?.bbox.swLng).toBeLessThan(126.9254)
    expect(lastQuery?.bbox.neLng).toBeGreaterThan(126.9254)
  })

  it('GPS 플래그가 꺼져 있으면(기본) "내 위치" 버튼을 숨긴다', async () => {
    await renderScreen()
    await screen.findByText('지도 마커 2개')
    expect(screen.queryByRole('button', { name: '내 위치' })).not.toBeOnTheScreen()
  })

  it('빌드 플래그만 켜지고 서버 플래그가 꺼져 있어도 숨긴다', async () => {
    jest.mocked(isGpsBuildEnabled).mockReturnValue(true)
    await renderScreen()
    await screen.findByText('지도 마커 2개')
    expect(screen.queryByRole('button', { name: '내 위치' })).not.toBeOnTheScreen()
  })

  it('두 플래그가 켜져 있어도 위치 권한을 거부하면 안내만 하고 목록은 계속 동작한다', async () => {
    jest.mocked(isGpsBuildEnabled).mockReturnValue(true)
    jest.mocked(fetchAppConfig).mockResolvedValue({ isGpsEnabled: true })
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '내 위치' }))

    expect(await screen.findByText('위치 권한이 없어 지역 선택으로 찾아볼 수 있어요')).toBeOnTheScreen()
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled()
    await user.press(button('목록으로 보기'))
    expect(await screen.findByText('성수동 주변 2곳')).toBeOnTheScreen()
  })

  it('결과가 없으면 빈 상태와 새 장소 제보 버튼(지도 중심 좌표 전달)', async () => {
    jest.mocked(fetchPlaces).mockResolvedValue({ items: [], isTruncated: false })
    const user = userEvent.setup()
    await renderScreen()
    await user.press(button('목록으로 보기'))
    expect(await screen.findByText('이 지역에 등록된 장소가 아직 없어요')).toBeOnTheScreen()
    await user.press(button('새 장소 제보'))
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/places/report',
      params: { lat: expect.any(String), lng: expect.any(String) },
    })
  })

  it('지도를 조금 움직이면 그대로, 크게 움직이면 "이 지역에서 다시 찾기" → 그 bbox로 다시 요청', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await screen.findByText('지도 마커 2개')
    await user.press(button('테스트: 제자리 정지'))
    expect(screen.queryByRole('button', { name: '이 지역에서 다시 찾기' })).not.toBeOnTheScreen()

    await user.press(button('테스트: 북쪽으로 이동'))
    await user.press(button('이 지역에서 다시 찾기'))

    const lastQuery = jest.mocked(fetchPlaces).mock.calls.at(-1)?.[0]
    expect(lastQuery?.bbox.swLat).toBeGreaterThan(37.5446)
    expect(button('지도 중심 주변 · 지역 바꾸기')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '이 지역에서 다시 찾기' })).not.toBeOnTheScreen()
  })

  it('마커를 탭하면 장소 카드가 뜨고, 카드를 누르면 상세로', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await screen.findByText('지도 마커 2개')
    await user.press(button('테스트: 첫 마커 탭'))
    await user.press(button(/숲길 테라스 카페/))
    expect(router.push).toHaveBeenCalledWith({ pathname: '/places/[placeId]', params: { placeId: CAFE.id } })
  })

  it('300건 상한에 걸리면 확대 안내', async () => {
    jest.mocked(fetchPlaces).mockResolvedValue({ items: [CAFE], isTruncated: true })
    await renderScreen()
    expect(await screen.findByText('장소가 많아 일부만 보여요. 지도를 확대해 주세요')).toBeOnTheScreen()
  })

  it('불러오기 실패 시 다시 시도', async () => {
    jest.mocked(fetchPlaces).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('지도 마커 2개')).toBeOnTheScreen()
  })
})
