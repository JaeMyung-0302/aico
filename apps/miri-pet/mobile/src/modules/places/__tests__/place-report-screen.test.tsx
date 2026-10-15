import { render, screen, userEvent } from '@testing-library/react-native'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import { pickImagesOrEmpty } from '@/modules/media/util-pick-image/pick-images'
import { track } from '@/shared/analytics/track'
import { ApiError } from '@/shared/api/api-error'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makePlace } from '../__fixtures__/places'
import { createPlaceReport, fetchPlace } from '../data-access-places/places-api'
import PlaceReportScreen, { type PlaceReportScreenProps } from '../feature-place-report/PlaceReportScreen'

jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: () => true } }))
jest.mock('@/shared/analytics/track', () => ({ track: jest.fn() }))
jest.mock('../data-access-places/places-api', () => ({ fetchPlace: jest.fn(), createPlaceReport: jest.fn() }))
jest.mock('@/modules/media/util-pick-image/pick-images', () => ({ pickImagesOrEmpty: jest.fn() }))
jest.mock('@/modules/media/data-access-media/useUploadImage', () => ({ uploadImage: jest.fn() }))

const PLACE = makePlace()
const photo = (n: number) => ({ uri: `file:///notice-${n}.jpg`, width: 800, height: 600 })
const MEDIA_IDS = ['0199e3a0-0000-7000-8000-0000000000e1', '0199e3a0-0000-7000-8000-0000000000e2']

const renderScreen = (props: PlaceReportScreenProps) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PlaceReportScreen {...props} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const button = (name: string | RegExp) => screen.getByRole('button', { name })

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchPlace).mockResolvedValue(PLACE)
  jest.mocked(createPlaceReport).mockResolvedValue(undefined)
})

describe('장소 제보 (11)', () => {
  it('기존 장소: 정보 수정으로 크기를 바꿔 보내면 검수 대기 화면 + place_report_submitted', async () => {
    const user = userEvent.setup()
    await renderScreen({ placeId: PLACE.id })
    expect(await screen.findByText('숲길 테라스 카페')).toBeOnTheScreen()

    await user.press(button(/^정보 수정/))
    await user.press(button('대형견'))
    await user.type(screen.getByLabelText('무엇이 달라졌나요?'), '대형견 입장 불가로 바뀌었어요')
    await user.press(button('제보 보내기'))

    expect(createPlaceReport).toHaveBeenCalledWith({
      kind: 'EDIT',
      placeId: PLACE.id,
      allowedSizes: ['S', 'M'],
      note: '대형견 입장 불가로 바뀌었어요',
    })
    expect(await screen.findByRole('header', { name: '검수 대기 중이에요' })).toBeOnTheScreen()
    expect(track).toHaveBeenCalledWith('place_report_submitted', { kind: 'EDIT' })
  })

  it('폐업 · 동반 불가 제보', async () => {
    const user = userEvent.setup()
    await renderScreen({ placeId: PLACE.id })
    await screen.findByText('숲길 테라스 카페')
    await user.press(button(/^폐업 · 동반 불가/))
    expect(screen.queryByLabelText('장소 이름')).not.toBeOnTheScreen()
    await user.press(button('제보 보내기'))
    expect(createPlaceReport).toHaveBeenCalledWith({ kind: 'CLOSED', placeId: PLACE.id })
  })

  it('변경 사항 없이 보내면 검증 메시지, 요청하지 않는다', async () => {
    const user = userEvent.setup()
    await renderScreen({ placeId: PLACE.id })
    await screen.findByText('숲길 테라스 카페')
    await user.press(button('제보 보내기'))
    expect(await screen.findByText('바뀐 내용을 알려주세요')).toBeOnTheScreen()
    expect(createPlaceReport).not.toHaveBeenCalled()
  })

  it('새 장소: 지도 중심 좌표로 이름·주소·업종·크기를 보낸다', async () => {
    const user = userEvent.setup()
    await renderScreen({ location: { lat: 37.56, lng: 126.92 } })
    expect(screen.queryByRole('button', { name: /^정보 수정/ })).not.toBeOnTheScreen()
    await user.type(screen.getByLabelText('장소 이름'), '연남 새 카페')
    await user.type(screen.getByLabelText('주소'), '서울 마포구 연남동 1')
    await user.press(button('음식점'))
    await user.press(button('소형견'))
    await user.press(button('제보 보내기'))
    expect(createPlaceReport).toHaveBeenCalledWith({
      kind: 'NEW',
      name: '연남 새 카페',
      address: '서울 마포구 연남동 1',
      category: 'RESTAURANT',
      allowedSizes: ['S'],
      indoorAllowed: false,
      lat: 37.56,
      lng: 126.92,
    })
    expect(await screen.findByRole('header', { name: '검수 대기 중이에요' })).toBeOnTheScreen()
  })

  it('서버 오류면 다시 시도 안내, 화면은 유지', async () => {
    jest.mocked(createPlaceReport).mockRejectedValue(new ApiError({ code: 'NETWORK', message: 'offline' }))
    const user = userEvent.setup()
    await renderScreen({ placeId: PLACE.id })
    await screen.findByText('숲길 테라스 카페')
    await user.press(button(/^폐업 · 동반 불가/))
    await user.press(button('제보 보내기'))
    expect(await screen.findByText('제보를 보내지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
    expect(button('제보 보내기')).toBeOnTheScreen()
  })

  describe('안내문 사진 첨부(선택)', () => {
    const closeWithPhotos = async (user: ReturnType<typeof userEvent.setup>) => {
      await renderScreen({ placeId: PLACE.id })
      await screen.findByText('숲길 테라스 카페')
      await user.press(button(/^폐업 · 동반 불가/))
    }

    it('최대 3장을 골라 썸네일로 보여주고, 빼기로 지운 뒤 남은 사진만 PLACE_REPORT로 올려 mediaIds로 보낸다', async () => {
      const user = userEvent.setup()
      jest.mocked(pickImagesOrEmpty).mockResolvedValue([photo(1), photo(2), photo(3)])
      jest
        .mocked(uploadImage)
        .mockImplementation(async (image) => (image.uri.includes('notice-1') ? MEDIA_IDS[0]! : MEDIA_IDS[1]!))
      await closeWithPhotos(user)

      await user.press(button('안내문 사진 추가'))
      expect(pickImagesOrEmpty).toHaveBeenCalledWith(3, expect.any(Function))
      expect(screen.getAllByLabelText(/^안내문 사진 \d$/)).toHaveLength(3)
      expect(screen.queryByRole('button', { name: '안내문 사진 추가' })).not.toBeOnTheScreen()

      await user.press(button('사진 2 빼기'))
      expect(screen.getAllByLabelText(/^안내문 사진 \d$/)).toHaveLength(2)
      await user.press(button('제보 보내기'))

      expect(uploadImage).toHaveBeenNthCalledWith(1, photo(1), 'PLACE_REPORT')
      expect(uploadImage).toHaveBeenNthCalledWith(2, photo(3), 'PLACE_REPORT')
      expect(createPlaceReport).toHaveBeenCalledWith({ kind: 'CLOSED', placeId: PLACE.id, mediaIds: MEDIA_IDS })
      expect(await screen.findByRole('header', { name: '검수 대기 중이에요' })).toBeOnTheScreen()
    })

    it('남은 자리만큼만 더 고를 수 있다', async () => {
      const user = userEvent.setup()
      jest
        .mocked(pickImagesOrEmpty)
        .mockResolvedValueOnce([photo(1)])
        .mockResolvedValueOnce([photo(2), photo(3)])
      await closeWithPhotos(user)
      await user.press(button('안내문 사진 추가'))
      await user.press(button('안내문 사진 추가'))
      expect(jest.mocked(pickImagesOrEmpty).mock.calls.map(([limit]) => limit)).toEqual([3, 2])
      expect(screen.getAllByLabelText(/^안내문 사진 \d$/)).toHaveLength(3)
    })

    it('사진 권한이 없으면 안내', async () => {
      const user = userEvent.setup()
      jest.mocked(pickImagesOrEmpty).mockImplementation(async (_limit, onDenied) => {
        onDenied()
        return []
      })
      await closeWithPhotos(user)
      await user.press(button('안내문 사진 추가'))
      expect(await screen.findByText('설정에서 사진·카메라 접근을 허용해 주세요')).toBeOnTheScreen()
    })

    it('사진 업로드가 실패하면 제보를 보내지 않고 다시 시도 안내', async () => {
      const user = userEvent.setup()
      jest.mocked(pickImagesOrEmpty).mockResolvedValue([photo(1)])
      jest.mocked(uploadImage).mockRejectedValue(new ApiError({ code: 'NETWORK', message: 'offline' }))
      await closeWithPhotos(user)
      await user.press(button('안내문 사진 추가'))
      await user.press(button('제보 보내기'))
      expect(await screen.findByText('사진을 올리지 못했어요. 다시 시도해 주세요')).toBeOnTheScreen()
      expect(createPlaceReport).not.toHaveBeenCalled()
    })
  })
})
