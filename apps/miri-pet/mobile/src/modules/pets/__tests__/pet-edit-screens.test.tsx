import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import type { ReactElement } from 'react'
import EditPetScreen from '@/app/pets/[petId]/edit'
import NewPetScreen from '@/app/pets/new'
import { ApiError } from '@/shared/api/api-error'
import { useConfirmLeave } from '@/shared/hooks/use-confirm-leave'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { deletePet, fetchMyPets, updatePet } from '../data-access-pets/pets-api'

// 경계만 대체: 라우터, 펫 네트워크, 사진 업로드·선택
let mockParams: Record<string, string> = {}
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams,
}))
// 이탈 확인(헤더·Android 뒤로·스와이프)은 공유 훅이 맡는다 — 화면은 "작성 중" 여부만 넘긴다
jest.mock('@/shared/hooks/use-confirm-leave', () => ({ useConfirmLeave: jest.fn() }))
jest.mock('../data-access-pets/pets-api', () => ({
  fetchMyPets: jest.fn(),
  createPet: jest.fn(),
  updatePet: jest.fn(),
  deletePet: jest.fn(),
}))
jest.mock('@/modules/media/data-access-media/useUploadImage', () => ({ uploadImage: jest.fn() }))
jest.mock('@/modules/media/util-pick-image/pick-image-or-null', () => ({
  PHOTO_PERMISSION_MESSAGE: '권한',
  pickImageOrNull: jest.fn(async () => null),
}))

const PET_ID = '01890a5d-ac96-774b-bcce-b302099a8058'
const PET = {
  id: PET_ID,
  name: '보리',
  species: 'DOG' as const,
  breed: '말티즈',
  birthDate: '2021-05-02',
  size: 'S' as const,
  avatarUrl: null,
}

const isLeaveGuarded = () => jest.mocked(useConfirmLeave).mock.lastCall?.[0]

const renderScreen = async (element: ReactElement) => {
  await render(
    <SafeAreaTestProvider>
      <QueryTestProvider>{element}</QueryTestProvider>
    </SafeAreaTestProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => {
  jest.clearAllMocks()
  mockParams = { petId: PET_ID }
  jest.mocked(fetchMyPets).mockResolvedValue([PET])
  jest.mocked(updatePet).mockResolvedValue(PET)
  jest.mocked(deletePet).mockResolvedValue(undefined)
})

describe('펫 정보 수정', () => {
  it('저장된 값으로 채우고 고친 값으로 PATCH 한 뒤 돌아간다', async () => {
    const user = await renderScreen(<EditPetScreen />)
    expect(await screen.findByDisplayValue('보리')).toBeOnTheScreen()
    await user.type(screen.getByLabelText('품종'), ' 믹스')
    await user.press(screen.getByRole('button', { name: '저장' }))

    expect(updatePet).toHaveBeenCalledWith(PET_ID, {
      name: '보리',
      species: 'DOG',
      size: 'S',
      breed: '말티즈 믹스',
      birthDate: '2021-05-02',
    })
    expect(router.back).toHaveBeenCalled()
  })

  it('409 AVATAR_IN_USE면 서버 안내를 보여주고 화면에 남는다', async () => {
    jest.mocked(updatePet).mockRejectedValue(
      new ApiError({ code: 'HTTP', status: 409, message: '이미 내 프로필에 쓰인 사진이에요' }),
    )
    const user = await renderScreen(<EditPetScreen />)
    await user.press(await screen.findByRole('button', { name: '저장' }))
    expect(await screen.findByText('이미 내 프로필에 쓰인 사진이에요')).toBeOnTheScreen()
    expect(router.back).not.toHaveBeenCalled()
  })

  it('펫 삭제: 접종 기록·증명서까지 지워진다고 확인받고 지운 뒤 내 펫으로 돌아간다', async () => {
    const user = await renderScreen(<EditPetScreen />)
    await user.press(await screen.findByRole('button', { name: '펫 삭제' }))
    expect(screen.getByText('보리의 기록이 모두 삭제돼요')).toBeOnTheScreen()
    expect(screen.getByText('접종 기록과 증명서 사진도 함께 지워지고 되돌릴 수 없어요.')).toBeOnTheScreen()
    expect(deletePet).not.toHaveBeenCalled()

    await user.press(screen.getByRole('button', { name: '삭제' }))
    expect(deletePet).toHaveBeenCalledWith(PET_ID)
    expect(router.back).toHaveBeenCalled()
  })

  it('삭제가 실패하면 알리고 화면에 남는다', async () => {
    jest.mocked(deletePet).mockRejectedValue(new Error('offline'))
    const user = await renderScreen(<EditPetScreen />)
    await user.press(await screen.findByRole('button', { name: '펫 삭제' }))
    await user.press(screen.getByRole('button', { name: '삭제' }))
    expect(await screen.findByText('삭제하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
    expect(router.back).not.toHaveBeenCalled()
  })

  it('내 펫 목록에 없는 id면 안내를 보여준다', async () => {
    mockParams = { petId: '01890a5d-ac96-774b-bcce-b30209999999' }
    await renderScreen(<EditPetScreen />)
    expect(await screen.findByText('반려동물을 찾을 수 없어요')).toBeOnTheScreen()
  })
})

describe('작성 중 이탈 확인 (useConfirmLeave)', () => {
  it('수정: 바꾼 게 없으면 막지 않고, 값을 바꾸면 막는다', async () => {
    const user = await renderScreen(<EditPetScreen />)
    await screen.findByDisplayValue('보리')
    expect(isLeaveGuarded()).toBe(false)
    await user.type(screen.getByLabelText('품종'), '!')
    expect(isLeaveGuarded()).toBe(true)
  })

  it('수정: 저장에 성공하면 막지 않은 채로 돌아간다', async () => {
    const user = await renderScreen(<EditPetScreen />)
    await user.type(await screen.findByLabelText('품종'), '!')
    await user.press(screen.getByRole('button', { name: '저장' }))
    expect(router.back).toHaveBeenCalled()
    expect(isLeaveGuarded()).toBe(false)
  })

  it('수정: 펫을 지우면 막지 않은 채로 돌아간다', async () => {
    const user = await renderScreen(<EditPetScreen />)
    await user.type(await screen.findByLabelText('품종'), '!')
    await user.press(screen.getByRole('button', { name: '펫 삭제' }))
    await user.press(screen.getByRole('button', { name: '삭제' }))
    expect(router.back).toHaveBeenCalled()
    expect(isLeaveGuarded()).toBe(false)
  })

  it('추가: 이름을 쓰기 시작하면 막는다', async () => {
    const user = await renderScreen(<NewPetScreen />)
    expect(isLeaveGuarded()).toBe(false)
    await user.type(screen.getByLabelText('이름'), '두')
    expect(isLeaveGuarded()).toBe(true)
  })
})
