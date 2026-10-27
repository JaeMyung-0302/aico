import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { Place } from '@you-in-heart/shared'
import { updateDiary } from '@/modules/diary/data-access-diary/diary-api'
import { session } from '@/shared/auth/session'
import { DIARY_ENTRY, ENTRY_ID } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { createPlace } from '../data-access-place/place-api'
import PinSuggestionSheet, { type PinSuggestion } from '../feature-pin-suggestion/PinSuggestionSheet'

jest.mock('../data-access-place/place-api', () => ({ createPlace: jest.fn(), searchPlaces: jest.fn() }))
jest.mock('@/modules/diary/data-access-diary/diary-api', () => ({ updateDiary: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const PLACE_ID = '01890a5d-ac96-774b-bcce-b302099a8401'

const SUGGESTIONS: PinSuggestion[] = [
  {
    key: '2026-10-25:a1',
    kstDate: '2026-10-25',
    lat: 37.5444,
    lng: 127.0374,
    assetIds: ['a1', 'a2', 'a3'],
    name: '성수동1가 근처',
    address: '서울 성동구 성수동1가 685-20',
  },
  {
    key: '2026-10-19:b1',
    kstDate: '2026-10-19',
    lat: 37.5284,
    lng: 126.9327,
    assetIds: ['b1'],
    name: '여의동로 근처',
    address: null,
  },
]

const placeOf = (suggestion: PinSuggestion, id: string): Place => ({
  id,
  name: suggestion.name,
  lat: suggestion.lat,
  lng: suggestion.lng,
  kakaoPlaceId: null,
  address: suggestion.address,
  createdAt: '2026-10-27T03:00:00.000Z',
})

const renderSheet = async (props: Partial<Parameters<typeof PinSuggestionSheet>[0]> = {}) => {
  const handlers = { onClose: jest.fn(), onDone: jest.fn(), onPickOnMap: jest.fn() }
  await render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PinSuggestionSheet
          isVisible
          entryId={ENTRY_ID}
          suggestions={SUGGESTIONS}
          isManualOnly={false}
          {...handlers}
          {...props}
        />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )
  return handlers
}

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest
    .mocked(createPlace)
    .mockImplementation(async (body) => placeOf({ ...SUGGESTIONS[0]!, ...body, address: body.address ?? null }, PLACE_ID))
  jest.mocked(updateDiary).mockResolvedValue({ ...DIARY_ENTRY, placeId: PLACE_ID })
})

describe('PinSuggestionSheet (SCR-10 사진 위치로 찾은 장소 확인)', () => {
  it('찾은 곳을 날짜·사진 수와 함께 모두 고른 상태로 보여준다', async () => {
    await renderSheet()
    expect(screen.getByText('새로 다녀온 곳 2곳을 찾았어요')).toBeOnTheScreen()
    expect(screen.getByText('10. 25 · 사진 3장')).toBeOnTheScreen()
    expect(screen.getByText('10. 19 · 사진 1장')).toBeOnTheScreen()
    expect(screen.getByRole('checkbox', { name: '성수동1가 근처' })).toBeChecked()
    expect(screen.getByRole('button', { name: '2곳 지도에 남기기' })).toBeEnabled()
  })

  it('확인 버튼을 누르기 전에는 POST /places 를 보내지 않는다. 고른 곳만 만들고 기록을 첫 장소에 잇는다', async () => {
    const { onDone } = await renderSheet()
    await fireEvent.press(screen.getByRole('checkbox', { name: '여의동로 근처' }))
    expect(screen.getByRole('checkbox', { name: '여의동로 근처' })).not.toBeChecked()
    expect(createPlace).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByRole('button', { name: '1곳 지도에 남기기' }))

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(createPlace).toHaveBeenCalledTimes(1)
    expect(createPlace).toHaveBeenCalledWith({
      name: '성수동1가 근처',
      lat: 37.5444,
      lng: 127.0374,
      address: '서울 성동구 성수동1가 685-20',
    })
    expect(updateDiary).toHaveBeenCalledWith(ENTRY_ID, { placeId: PLACE_ID })
  })

  it('하나도 고르지 않으면 남길 수 없고, 닫으면 아무것도 만들지 않는다', async () => {
    const { onClose } = await renderSheet()
    await fireEvent.press(screen.getByRole('checkbox', { name: '성수동1가 근처' }))
    await fireEvent.press(screen.getByRole('checkbox', { name: '여의동로 근처' }))
    expect(screen.getByRole('button', { name: '지도에 남기기' })).toBeDisabled()

    await fireEvent.press(screen.getByRole('button', { name: '나중에' }))
    expect(onClose).toHaveBeenCalled()
    expect(createPlace).not.toHaveBeenCalled()
  })

  it('저장에 실패하면 시트 안에 안내하고 닫지 않는다', async () => {
    jest.mocked(createPlace).mockRejectedValue(new Error('500'))
    const { onDone } = await renderSheet()
    await fireEvent.press(screen.getByRole('button', { name: '2곳 지도에 남기기' }))
    expect(await screen.findByText('장소를 남기지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
    expect(onDone).not.toHaveBeenCalled()
  })

  it('사진 위치를 쓸 수 없는 기기(Android 분기)면 제안 없이 "지도에서 직접 고르기"만 보여준다', async () => {
    const { onPickOnMap } = await renderSheet({ suggestions: [], isManualOnly: true })
    expect(screen.queryByText(/곳을 찾았어요/)).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: '지도에서 직접 고르기' }))
    expect(onPickOnMap).toHaveBeenCalled()
    expect(createPlace).not.toHaveBeenCalled()
  })
})
