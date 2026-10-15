import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makePlace } from '../__fixtures__/places'
import { fetchPlaces } from '../data-access-places/places-api'
import PlacePickerSheet from '../ui-place-picker/PlacePickerSheet'
import { bboxAround, DEFAULT_REGION, REGIONS } from '../util-regions'

jest.mock('../data-access-places/places-api', () => ({ fetchPlaces: jest.fn() }))

const CAFE = makePlace()
const PARK = makePlace({ id: '01890a5d-ac96-774b-bcce-b302099a8002', name: '서울숲 반려견 놀이터', category: 'PARK' })

const renderSheet = (onSelect = jest.fn(), onClose = jest.fn()) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <PlacePickerSheet isVisible onSelect={onSelect} onClose={onClose} />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchPlaces).mockResolvedValue({ items: [CAFE, PARK], isTruncated: false })
})

describe('장소 태그 선택 시트', () => {
  it('기본 지역 bbox의 장소를 거리순으로 불러오고, 고르면 {id,name,category}로 알린다', async () => {
    const onSelect = jest.fn()
    const user = userEvent.setup()
    await renderSheet(onSelect)
    await user.press(await screen.findByRole('button', { name: PARK.name }))
    expect(onSelect).toHaveBeenCalledWith({ id: PARK.id, name: PARK.name, category: 'PARK' })
    expect(fetchPlaces).toHaveBeenCalledWith({
      bbox: bboxAround(DEFAULT_REGION.center),
      filters: { category: null, size: null, isIndoorOnly: false },
      sort: 'distance',
    })
  })

  it('지역 칩을 바꾸면 그 지역에서 다시 찾는다', async () => {
    const other = REGIONS[1]!
    const user = userEvent.setup()
    await renderSheet()
    await screen.findByRole('button', { name: CAFE.name })
    await user.press(screen.getByRole('button', { name: other.label }))
    await waitFor(() =>
      expect(fetchPlaces).toHaveBeenLastCalledWith(expect.objectContaining({ bbox: bboxAround(other.center) })),
    )
  })

  it('이름 검색은 불러온 목록을 거르고, 없으면 안내', async () => {
    const user = userEvent.setup()
    await renderSheet()
    await screen.findByRole('button', { name: CAFE.name })
    await user.type(screen.getByLabelText('장소 이름 검색'), '서울숲')
    expect(screen.queryByRole('button', { name: CAFE.name })).toBeNull()
    expect(screen.getByRole('button', { name: PARK.name })).toBeOnTheScreen()
    await user.clear(screen.getByLabelText('장소 이름 검색'))
    await user.type(screen.getByLabelText('장소 이름 검색'), '없는곳')
    expect(screen.getByText('이 지역에서 찾는 장소가 없어요')).toBeOnTheScreen()
  })
})
