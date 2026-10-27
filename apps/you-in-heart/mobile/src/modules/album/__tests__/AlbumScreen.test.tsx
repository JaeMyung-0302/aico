import { fireEvent, render, screen } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchPhotoPage } from '@/modules/media/data-access-media/media-api'
import { session } from '@/shared/auth/session'
import { makePhoto, PHOTO_IDS } from '@/test-utils/fixtures'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import AlbumScreen from '../feature-album/AlbumScreen'

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn(), canGoBack: jest.fn(() => true) },
}))
jest.mock('@/modules/media/data-access-media/media-api', () => ({ fetchPhotoPage: jest.fn() }))
jest.mock('@/shared/api/token-store', () => ({
  tokenStore: jest.requireActual('@/test-utils/memory-token-store').createMemoryTokenStore(),
}))

const SEPTEMBER = '01890a5d-ac96-774b-bcce-b302099a8399'
const UNDATED = '01890a5d-ac96-774b-bcce-b302099a8398'

const renderAlbum = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <AlbumScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(async () => {
  jest.clearAllMocks()
  await session.signIn({ accessToken: 'a', refreshToken: 'r' })
  jest.mocked(fetchPhotoPage).mockImplementation(async ({ cursor }) =>
    cursor
      ? { items: [makePhoto(UNDATED, { takenAt: null })], nextCursor: null }
      : {
          items: [
            ...PHOTO_IDS.map((id) => makePhoto(id)),
            // KST 9월 30일 23:30 → 9월
            makePhoto(SEPTEMBER, { takenAt: '2026-09-30T14:30:00.000Z' }),
          ],
          nextCursor: SEPTEMBER,
        },
  )
})

describe('AlbumScreen (SCR-08 그리드)', () => {
  it('KST 촬영 달로 묶고, 썸네일은 cacheKey `${photoId}:t` (서명 URL 이 바뀌어도 캐시 재사용)', async () => {
    await renderAlbum()
    expect(await screen.findByText('2026년 10월')).toBeOnTheScreen()
    expect(screen.getByText('2026년 9월')).toBeOnTheScreen()
    const thumb = screen.getByTestId(`album-thumb-${PHOTO_IDS[0]}`)
    expect(thumb.props.source).toEqual({ uri: makePhoto(PHOTO_IDS[0]).thumbUrl, cacheKey: `${PHOTO_IDS[0]}:t` })
  })

  it('끝까지 내리면 다음 쪽(촬영 시각 없는 사진은 "날짜 없음")', async () => {
    await renderAlbum()
    await screen.findByText('2026년 10월')
    await fireEvent(screen.getByTestId('album-list'), 'onEndReached')
    expect(await screen.findByText('날짜 없음')).toBeOnTheScreen()
    expect(fetchPhotoPage).toHaveBeenLastCalledWith({ cursor: SEPTEMBER })
  })

  it('사진을 누르면 뷰어, 지난 사진 가져오기는 일괄 등록', async () => {
    await renderAlbum()
    await fireEvent.press(await screen.findByTestId(`album-cell-${PHOTO_IDS[1]}`))
    expect(router.push).toHaveBeenCalledWith(`/photos/${PHOTO_IDS[1]}`)
    await fireEvent.press(screen.getByRole('button', { name: '지난 사진 가져오기' }))
    expect(router.push).toHaveBeenCalledWith('/album/import')
  })

  it('빈 앨범: 안내와 지난 사진 가져오기', async () => {
    jest.mocked(fetchPhotoPage).mockResolvedValue({ items: [], nextCursor: null })
    await renderAlbum()
    expect(await screen.findByText('아직 사진이 없어요')).toBeOnTheScreen()
    const buttons = screen.getAllByRole('button', { name: '지난 사진 가져오기' })
    await fireEvent.press(buttons[buttons.length - 1]!)
    expect(router.push).toHaveBeenCalledWith('/album/import')
  })
})
