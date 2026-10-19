import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import type { ReactElement } from 'react'
import EditVaccinationScreen from '@/app/pets/[petId]/vaccinations/[vaccinationId]/edit'
import NewVaccinationScreen from '@/app/pets/[petId]/vaccinations/new'
import { fetchMyPets } from '@/modules/pets/data-access-pets/pets-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { useConfirmLeave } from '@/shared/hooks/use-confirm-leave'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { deleteVaccination, fetchVaccinations, updateVaccination } from '../data-access-vaccinations/vaccinations-api'

// 경계만 대체: 라우터, 펫·접종 네트워크
let mockParams: Record<string, string> = {}
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => mockParams,
}))
jest.mock('@/shared/hooks/use-confirm-leave', () => ({ useConfirmLeave: jest.fn() }))
jest.mock('@/modules/pets/data-access-pets/pets-api', () => ({ fetchMyPets: jest.fn() }))
jest.mock('../data-access-vaccinations/vaccinations-api', () => ({
  fetchVaccinations: jest.fn(),
  updateVaccination: jest.fn(),
  deleteVaccination: jest.fn(),
  createVaccination: jest.fn(),
  agreeCertificateConsent: jest.fn(),
}))

const PET_ID = '01890a5d-ac96-774b-bcce-b302099a8058'
const VACCINATION_ID = '01890a5d-ac96-774b-bcce-b302099a8061'
const PET = { id: PET_ID, name: '보리', species: 'DOG' as const, breed: null, birthDate: null, size: 'S' as const, avatarUrl: null }
const VACCINATION = {
  id: VACCINATION_ID,
  petId: PET_ID,
  type: 'RABIES' as const,
  customName: null,
  administeredOn: '2026-03-02',
  clinicName: null,
  nextDueOn: '2027-03-02',
  certificateCount: 1,
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
  mockParams = { petId: PET_ID, vaccinationId: VACCINATION_ID }
  jest.mocked(fetchMyPets).mockResolvedValue([PET])
  jest.mocked(fetchVaccinations).mockResolvedValue([VACCINATION])
  jest.mocked(updateVaccination).mockResolvedValue(VACCINATION)
  jest.mocked(deleteVaccination).mockResolvedValue(undefined)
})

describe('접종 기록 수정', () => {
  it('저장된 값으로 채우고 다음 접종일을 고쳐 PATCH 한 뒤 돌아간다', async () => {
    const user = await renderScreen(<EditVaccinationScreen />)
    expect(await screen.findByText('보리 · 접종 기록 수정')).toBeOnTheScreen()
    const nextDue = screen.getByLabelText('다음 접종일')
    expect(nextDue).toHaveDisplayValue('2027-03-02')
    await user.clear(nextDue)
    await user.type(nextDue, '20270310')
    await user.press(screen.getByRole('button', { name: '저장' }))

    expect(updateVaccination).toHaveBeenCalledWith(VACCINATION_ID, {
      type: 'RABIES',
      customName: null,
      administeredOn: '2026-03-02',
      nextDueOn: '2027-03-10',
      clinicName: null,
    })
    expect(router.back).toHaveBeenCalled()
  })

  it('저장이 실패하면 알리고 화면에 남는다', async () => {
    jest.mocked(updateVaccination).mockRejectedValue(new Error('offline'))
    const user = await renderScreen(<EditVaccinationScreen />)
    await user.press(await screen.findByRole('button', { name: '저장' }))
    expect(await screen.findByText('저장하지 못했어요. 잠시 후 다시 시도해 주세요')).toBeOnTheScreen()
    expect(router.back).not.toHaveBeenCalled()
  })

  it('기록 삭제: 증명서 사진도 지워진다고 확인받고 지운 뒤 돌아간다', async () => {
    const user = await renderScreen(<EditVaccinationScreen />)
    await user.press(await screen.findByRole('button', { name: '기록 삭제' }))
    expect(screen.getByText('광견병 기록을 삭제할까요?')).toBeOnTheScreen()
    expect(screen.getByText('붙어 있는 증명서 사진도 함께 지워지고 되돌릴 수 없어요.')).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '삭제' }))
    expect(deleteVaccination).toHaveBeenCalledWith(VACCINATION_ID)
    expect(router.back).toHaveBeenCalled()
  })

  it('없는 기록이면 안내를 보여준다', async () => {
    mockParams = { petId: PET_ID, vaccinationId: '01890a5d-ac96-774b-bcce-b30209999999' }
    await renderScreen(<EditVaccinationScreen />)
    expect(await screen.findByText('접종 기록을 찾을 수 없어요')).toBeOnTheScreen()
  })

  it('불러오기에 실패하면 다시 시도', async () => {
    jest.mocked(fetchVaccinations).mockRejectedValueOnce(new Error('offline'))
    const user = await renderScreen(<EditVaccinationScreen />)
    await user.press(await screen.findByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('button', { name: '기록 삭제' })).toBeOnTheScreen()
  })

  it('값을 바꾸면 이탈을 막고, 저장에 성공하면 풀고 돌아간다', async () => {
    const user = await renderScreen(<EditVaccinationScreen />)
    await user.type(await screen.findByLabelText('병원 (선택)'), '미리')
    expect(isLeaveGuarded()).toBe(true)
    await user.press(screen.getByRole('button', { name: '저장' }))
    expect(router.back).toHaveBeenCalled()
    expect(isLeaveGuarded()).toBe(false)
  })
})

describe('접종 기록 추가 — 작성 중 이탈 확인', () => {
  it('바꾼 게 없으면 막지 않고, 값을 바꾸면 막는다', async () => {
    mockParams = { petId: PET_ID }
    const user = await renderScreen(<NewVaccinationScreen />)
    expect(isLeaveGuarded()).toBe(false)
    await user.type(screen.getByLabelText('병원 (선택)'), '미리')
    expect(isLeaveGuarded()).toBe(true)
  })
})
