import type { Pet } from '@miri-pet/shared'
import { render, screen, userEvent, waitFor } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchMyPets } from '@/modules/pets/data-access-pets/pets-api'
import { uploadImage } from '@/modules/media/data-access-media/useUploadImage'
import { pickImagesOrEmpty } from '@/modules/media/util-pick-image/pick-images'
import { makePlace } from '@/modules/places/__fixtures__/places'
import { fetchPlaces } from '@/modules/places/data-access-places/places-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { makePost } from '@/modules/feed/__fixtures__/posts'
import { createPost } from '../data-access-posts/posts-api'
import NewPostScreen from '../feature-new-post/NewPostScreen'

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn(), canGoBack: () => true } }))
jest.mock('@/modules/pets/data-access-pets/pets-api', () => ({ fetchMyPets: jest.fn() }))
jest.mock('@/modules/media/data-access-media/useUploadImage', () => ({ uploadImage: jest.fn() }))
jest.mock('@/modules/media/util-pick-image/pick-images', () => ({ pickImagesOrEmpty: jest.fn() }))
jest.mock('@/modules/places/data-access-places/places-api', () => ({ fetchPlaces: jest.fn() }))
jest.mock('../data-access-posts/posts-api', () => ({ createPost: jest.fn() }))

const PET = (id: string, name: string): Pet => ({
  id,
  name,
  species: 'DOG',
  breed: null,
  birthDate: null,
  size: 'S',
  avatarUrl: null,
})
const BORI = PET('0199e3a0-0000-7000-8000-000000000011', '보리')
const KONG = PET('0199e3a0-0000-7000-8000-000000000012', '콩이')

const renderScreen = () =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>
        <NewPostScreen />
      </QueryTestProvider>
    </SafeAreaTestProvider>,
  )

const shareButton = () => screen.getByRole('button', { name: '공유' })

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(fetchMyPets).mockResolvedValue([BORI, KONG])
  jest.mocked(pickImagesOrEmpty).mockResolvedValue([{ uri: 'file://a.jpg', width: 100, height: 100 }])
  jest.mocked(fetchPlaces).mockResolvedValue({ items: [CAFE, PARK], isTruncated: false })
})

const CAFE = makePlace()
const PARK = makePlace({ id: '01890a5d-ac96-774b-bcce-b302099a8002', name: '서울숲 반려견 놀이터', category: 'PARK' })
const image = (n: number) => ({ uri: `file://${n}.jpg`, width: 100, height: 100 })

describe('새 게시물 (06)', () => {
  it('사진이 0장이면 공유 버튼이 비활성', async () => {
    await renderScreen()
    await screen.findByRole('button', { name: '보리' })
    expect(shareButton()).toBeDisabled()
    expect(screen.getByText('0 / 10')).toBeOnTheScreen()
  })

  it('펫이 1마리면 자동 선택 → 사진을 넣으면 공유 가능', async () => {
    jest.mocked(fetchMyPets).mockResolvedValue([BORI])
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    expect(await screen.findByText('1 / 10')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '보리' })).toBeSelected()
    expect(shareButton()).toBeEnabled()
  })

  it('펫을 모두 해제하면 사진이 있어도 비활성', async () => {
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    await screen.findByText('1 / 10')
    expect(shareButton()).toBeDisabled()
    await user.press(screen.getByRole('button', { name: '콩이' }))
    expect(shareButton()).toBeEnabled()
    await user.press(screen.getByRole('button', { name: '콩이' }))
    expect(shareButton()).toBeDisabled()
  })

  it('공유: 사진을 순서대로 올리고 게시 → 상세로 이동', async () => {
    jest.mocked(uploadImage).mockResolvedValueOnce('m-1').mockResolvedValueOnce('m-2')
    const created = makePost()
    jest.mocked(createPost).mockResolvedValue(created)
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    await screen.findByText('2 / 10')
    await user.press(screen.getByRole('button', { name: '보리' }))
    await user.type(screen.getByLabelText('내용'), '첫 산책')
    await user.press(shareButton())

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(`/posts/${created.id}`))
    expect(uploadImage).toHaveBeenNthCalledWith(1, { uri: 'file://a.jpg', width: 100, height: 100 }, 'POST')
    expect(createPost).toHaveBeenCalledWith({ caption: '첫 산책', mediaIds: ['m-1', 'm-2'], petIds: [BORI.id] })
  })

  it('사진을 지우면 개수가 줄고, 업로드 실패하면 안내', async () => {
    jest.mocked(fetchMyPets).mockResolvedValue([BORI])
    jest.mocked(uploadImage).mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    await screen.findByText('2 / 10')
    await user.press(screen.getAllByRole('button', { name: /사진 \d+ 빼기/ })[0]!)
    expect(screen.getByText('1 / 10')).toBeOnTheScreen()
    await user.press(shareButton())
    expect(await screen.findByText('게시하지 못했어요. 다시 시도해 주세요')).toBeOnTheScreen()
    expect(createPost).not.toHaveBeenCalled()
  })

  it('펫이 없으면 펫 등록 안내', async () => {
    jest.mocked(fetchMyPets).mockResolvedValue([])
    await renderScreen()
    expect(await screen.findByText('먼저 반려동물을 등록해 주세요')).toBeOnTheScreen()
  })

  it('앨범에서 여러 장을 한 번에 → 고른 순서대로 3장을 올리고 게시', async () => {
    jest.mocked(fetchMyPets).mockResolvedValue([BORI])
    jest.mocked(pickImagesOrEmpty).mockResolvedValueOnce([image(1), image(2), image(3)])
    jest.mocked(uploadImage).mockResolvedValueOnce('m-1').mockResolvedValueOnce('m-2').mockResolvedValueOnce('m-3')
    jest.mocked(createPost).mockResolvedValue(makePost())
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    expect(await screen.findByText('3 / 10')).toBeOnTheScreen()
    expect(pickImagesOrEmpty).toHaveBeenCalledWith(10, expect.any(Function))
    await user.press(shareButton())

    await waitFor(() => expect(createPost).toHaveBeenCalledTimes(1))
    expect(jest.mocked(uploadImage).mock.calls).toEqual([
      [image(1), 'POST'],
      [image(2), 'POST'],
      [image(3), 'POST'],
    ])
    expect(createPost).toHaveBeenCalledWith({ caption: '', mediaIds: ['m-1', 'm-2', 'm-3'], petIds: [BORI.id] })
  })

  it('이미 8장이면 남은 2장까지만 고를 수 있고, 10장이 되면 추가 버튼이 사라진다', async () => {
    jest
      .mocked(pickImagesOrEmpty)
      .mockResolvedValueOnce(Array.from({ length: 8 }, (_, n) => image(n)))
      .mockResolvedValueOnce([image(8), image(9)])
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    await screen.findByText('8 / 10')
    await user.press(screen.getByRole('button', { name: '사진 추가' }))
    expect(pickImagesOrEmpty).toHaveBeenLastCalledWith(2, expect.any(Function))
    expect(await screen.findByText('10 / 10')).toBeOnTheScreen()
    expect(screen.queryByRole('button', { name: '사진 추가' })).toBeNull()
  })

  it('권한 거부면 안내', async () => {
    jest.mocked(pickImagesOrEmpty).mockImplementationOnce(async (_limit, onDenied) => {
      onDenied()
      return []
    })
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    expect(await screen.findByText('설정에서 사진·카메라 접근을 허용해 주세요')).toBeOnTheScreen()
  })

  it('장소 태그(선택): 지역 장소 목록에서 고르면 표시되고 게시할 때 placeId를 보낸다', async () => {
    jest.mocked(fetchMyPets).mockResolvedValue([BORI])
    jest.mocked(uploadImage).mockResolvedValue('m-1')
    jest.mocked(createPost).mockResolvedValue(makePost())
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    await user.press(screen.getByRole('button', { name: '장소 태그 (선택)' }))
    await user.press(await screen.findByRole('button', { name: CAFE.name }))
    expect(await screen.findByRole('button', { name: `장소 태그: ${CAFE.name}` })).toBeOnTheScreen()
    await user.press(shareButton())

    await waitFor(() =>
      expect(createPost).toHaveBeenCalledWith({ caption: '', mediaIds: ['m-1'], petIds: [BORI.id], placeId: CAFE.id }),
    )
  })

  it('장소 태그를 빼면 placeId 없이 게시', async () => {
    jest.mocked(fetchMyPets).mockResolvedValue([BORI])
    jest.mocked(uploadImage).mockResolvedValue('m-1')
    jest.mocked(createPost).mockResolvedValue(makePost())
    const user = userEvent.setup()
    await renderScreen()
    await user.press(await screen.findByRole('button', { name: '사진 추가' }))
    await user.press(screen.getByRole('button', { name: '장소 태그 (선택)' }))
    await user.press(await screen.findByRole('button', { name: PARK.name }))
    await user.press(await screen.findByRole('button', { name: '장소 태그 빼기' }))
    expect(screen.getByRole('button', { name: '장소 태그 (선택)' })).toBeOnTheScreen()
    await user.press(shareButton())
    await waitFor(() => expect(createPost).toHaveBeenCalledWith({ caption: '', mediaIds: ['m-1'], petIds: [BORI.id] }))
  })
})
