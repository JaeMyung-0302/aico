import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { Place } from '@you-in-heart/shared'
import { router } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { fetchMe, putConsents } from '@/modules/user/data-access-me/me-api'
import { session } from '@/shared/auth/session'
import { DIARY_ENTRY, ENTRY_ID, ME } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { createPlace, fetchPlaceEntryPage, fetchPlaces, searchPlaces } from '../data-access-place/place-api'
import MemoryMapScreen from '../feature-memory-map/MemoryMapScreen'
import type { MemoryMapProps } from '../ui-memory-map'

// 앱 tsconfig 에는 Node 타입이 없다 → 이 검사에 쓰는 함수만 좁게 선언해 불러온다
type NodeFs = {
  readdirSync: (dir: string) => string[]
  readFileSync: (path: string, encoding: 'utf8') => string
  statSync: (path: string) => { isDirectory: () => boolean }
}
type NodePath = { join: (...parts: string[]) => string; relative: (from: string, to: string) => string }
declare const __dirname: string

// 지도 SDK(네이티브)는 핀을 버튼으로 그리는 대역으로 바꾼다 — 화면 로직만 본다
jest.mock('../ui-memory-map', () => ({
  __esModule: true,
  default: ({ places, onPlacePress }: MemoryMapProps) => {
    const { Pressable: MockPressable, Text: MockText, View: MockView } = jest.requireActual<{
      Pressable: typeof Pressable
      Text: typeof Text
      View: typeof View
    }>('react-native')
    return (
      <MockView>
        {places.map((place) => (
          <MockPressable key={place.id} accessibilityRole="button" accessibilityLabel={`핀 ${place.name}`} onPress={() => onPlacePress(place.id)}>
            <MockText>{place.name}</MockText>
          </MockPressable>
        ))}
      </MockView>
    )
  },
}))
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('@/modules/user/data-access-me/me-api', () => ({ fetchMe: jest.fn(), putConsents: jest.fn() }))
jest.mock('../data-access-place/place-api', () => ({
  fetchPlaces: jest.fn(),
  fetchPlaceEntryPage: jest.fn(),
  searchPlaces: jest.fn(),
  createPlace: jest.fn(),
}))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const PLACE: Place = {
  id: '01890a5d-ac96-774b-bcce-b302099a8401',
  name: '서울숲',
  lat: 37.5444,
  lng: 127.0374,
  kakaoPlaceId: null,
  address: '서울 성동구 성수동1가 685-20',
  createdAt: '2026-10-25T12:00:00.000Z',
}
const HAN_RIVER: Place = { ...PLACE, id: '01890a5d-ac96-774b-bcce-b302099a8402', name: '여의도 한강공원', lat: 37.5284 }
const LOCATION_ON = { ...ME, consents: { ...ME.consents, location: true } }

const renderMap = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <MemoryMapScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchMe).mockResolvedValue(LOCATION_ON)
  jest.mocked(putConsents).mockResolvedValue({ terms: true, privacy: true, location: true })
  jest.mocked(fetchPlaces).mockResolvedValue([PLACE, HAN_RIVER])
  jest.mocked(fetchPlaceEntryPage).mockResolvedValue({ items: [DIARY_ENTRY], nextCursor: null })
})

describe('MemoryMapScreen (SCR-10)', () => {
  it('위치 사용이 꺼져 있으면 안내만 보이고 장소를 부르지 않는다. 켜기를 누르면 PUT /me/consents', async () => {
    jest.mocked(fetchMe).mockResolvedValue(ME)
    await renderMap()
    expect(await screen.findByText('함께 다녀온 곳을 모아볼까요?')).toBeOnTheScreen()
    expect(fetchPlaces).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByRole('button', { name: '사진 위치 사용하기' }))
    await waitFor(() => expect(putConsents).toHaveBeenCalledWith({ terms: true, privacy: true, location: true }))
    await waitFor(() => expect(fetchPlaces).toHaveBeenCalled())
  })

  it('핀 수를 보여주고, 핀을 누르면 그곳의 기록 시트 → 기록을 누르면 상세로 간다', async () => {
    await renderMap()
    expect(await screen.findByText('함께 간 곳 2곳')).toBeOnTheScreen()
    await fireEvent.press(screen.getByRole('button', { name: '핀 서울숲' }))

    expect(await screen.findByText('기록 1개')).toBeOnTheScreen()
    expect(fetchPlaceEntryPage).toHaveBeenCalledWith({ placeId: PLACE.id, cursor: undefined })
    await fireEvent.press(screen.getByRole('button', { name: /^성수동 산책/ }))
    expect(router.push).toHaveBeenCalledWith(`/diary/${ENTRY_ID}`)

    await fireEvent.press(screen.getByRole('button', { name: '모두 보기' }))
    expect(router.push).toHaveBeenCalledWith(`/places/${PLACE.id}`)
  })

  it('핀이 없으면 빈 상태를 보여준다', async () => {
    jest.mocked(fetchPlaces).mockResolvedValue([])
    await renderMap()
    expect(await screen.findByText('아직 지도에 남긴 곳이 없어요')).toBeOnTheScreen()
  })

  it('검색에서 고른 곳만 POST /places 로 남긴다', async () => {
    jest.mocked(searchPlaces).mockResolvedValue([
      { kakaoPlaceId: 'k1', name: '서울숲 카페', address: '서울 성동구', lat: 37.545, lng: 127.04 },
    ])
    jest.mocked(createPlace).mockResolvedValue({ ...PLACE, id: '01890a5d-ac96-774b-bcce-b302099a8403', name: '서울숲 카페' })
    await renderMap()
    await fireEvent.press(await screen.findByRole('button', { name: '다녀온 곳 검색' }))
    await fireEvent.changeText(screen.getByLabelText('장소 검색어'), '서울숲')

    await fireEvent.press(await screen.findByRole('button', { name: '서울숲 카페' }))
    await waitFor(() =>
      expect(createPlace).toHaveBeenCalledWith({
        name: '서울숲 카페',
        lat: 37.545,
        lng: 127.04,
        kakaoPlaceId: 'k1',
        address: '서울 성동구',
      }),
    )
    expect(searchPlaces).toHaveBeenCalledWith('서울숲')
  })
})

describe('지도 SDK 경계', () => {
  it('@mj-studio/react-native-naver-map import 는 ui-memory-map.tsx 에만 있다', () => {
    const { readdirSync, readFileSync, statSync } = jest.requireActual<NodeFs>('fs')
    const { join, relative } = jest.requireActual<NodePath>('path')
    const srcRoot = join(__dirname, '..', '..', '..')
    const list = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name)
        if (statSync(path).isDirectory()) return list(path)
        return /\.tsx?$/.test(name) ? [path] : []
      })
    const importers = list(srcRoot)
      .filter((path) => /from '@mj-studio\/react-native-naver-map'/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(srcRoot, path))
    expect(importers).toEqual(['modules/map/ui-memory-map.tsx'])
  })
})
