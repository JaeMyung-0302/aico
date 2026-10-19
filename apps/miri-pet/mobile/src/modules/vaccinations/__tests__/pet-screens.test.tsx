import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import type { ReactElement } from 'react'
import MyPetsScreen from '@/app/(tabs)/pets'
import EntryCardScreen from '@/app/pets/[petId]/entry-card'
import { fetchMyPets } from '@/modules/pets/data-access-pets/pets-api'
import { petInfoLine } from '@/modules/pets/util-pet/format-pet'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import { fetchCertificates, fetchVaccinations } from '../data-access-vaccinations/vaccinations-api'
import { addMonths, kstToday } from '../util-vaccination/vaccination-dates'

let mockParams: Record<string, string> = {}
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
}))
jest.mock('@/modules/pets/data-access-pets/pets-api', () => ({ fetchMyPets: jest.fn() }))
jest.mock('../data-access-vaccinations/vaccinations-api', () => ({
  fetchVaccinations: jest.fn(),
  fetchCertificates: jest.fn(),
}))

const PET_ID = '01890a5d-ac96-774b-bcce-b302099a8058'
const VACCINATION_ID = '01890a5d-ac96-774b-bcce-b302099a8061'
const TODAY = kstToday(new Date())
const PETS = [
  {
    id: PET_ID,
    name: '보리',
    species: 'DOG' as const,
    breed: '말티즈',
    birthDate: '2021-05-02',
    size: 'S' as const,
    avatarUrl: null,
  },
  {
    id: '01890a5d-ac96-774b-bcce-b302099a8059',
    name: '두부',
    species: 'CAT' as const,
    breed: null,
    birthDate: null,
    size: 'S' as const,
    avatarUrl: null,
  },
]
const VACCINATIONS = [
  {
    id: VACCINATION_ID,
    petId: PET_ID,
    type: 'DHPPL' as const,
    customName: null,
    administeredOn: addMonths(TODAY, -12),
    clinicName: '미리동물병원',
    nextDueOn: addMonths(TODAY, 1),
    certificateCount: 1,
  },
]

const renderScreen = (element: ReactElement) =>
  render(
    <SafeAreaTestProvider>
      <QueryTestProvider>{element}</QueryTestProvider>
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
  mockParams = {}
  jest.mocked(fetchMyPets).mockResolvedValue(PETS)
  jest.mocked(fetchVaccinations).mockResolvedValue(VACCINATIONS)
  jest
    .mocked(fetchCertificates)
    .mockResolvedValue([
      {
        mediaId: '01890a5d-ac96-774b-bcce-b302099a8070',
        url: 'https://r2.test/c.jpg?X-Amz-Expires=60',
        expiresAt: 'x',
      },
    ])
})

describe('14 내 펫', () => {
  it('상단 설정 버튼으로 설정(로그아웃·탈퇴)에 간다', async () => {
    const user = userEvent.setup()
    await renderScreen(<MyPetsScreen />)
    await user.press(await screen.findByRole('button', { name: '설정' }))
    expect(router.push).toHaveBeenCalledWith('/settings')
  })

  it('첫 펫의 카드·다음 접종·기록을 보여주고 증명서 배지로 입장용 카드(원본 보기)로 간다', async () => {
    const user = userEvent.setup()
    await renderScreen(<MyPetsScreen />)

    expect(await screen.findByText(petInfoLine(PETS[0]!, TODAY))).toBeOnTheScreen()
    expect(await screen.findByText('다음 접종 · 종합백신(DHPPL)')).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '종합백신(DHPPL) 증명서 보기' }))
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pets/[petId]/entry-card',
      params: { petId: PET_ID, vaccinationId: VACCINATION_ID },
    })
  })

  it('다른 펫을 고르면 그 펫의 기록을 불러온다, 기록 추가로 15에 간다', async () => {
    const user = userEvent.setup()
    await renderScreen(<MyPetsScreen />)
    await user.press(await screen.findByRole('button', { name: '두부' }))
    expect(fetchVaccinations).toHaveBeenLastCalledWith(PETS[1]?.id)
    await user.press(screen.getByRole('button', { name: '기록 추가' }))
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/pets/[petId]/vaccinations/new',
      params: { petId: PETS[1]?.id },
    })
  })
})

describe('16 입장용 카드', () => {
  it('요약 → "증명서 원본 보기"로 60초 URL 증명서를 연다', async () => {
    mockParams = { petId: PET_ID }
    const user = userEvent.setup()
    await renderScreen(<EntryCardScreen />)

    expect(await screen.findByText('말티즈 · 소형 · 2021년생')).toBeOnTheScreen()
    expect(fetchCertificates).not.toHaveBeenCalled()
    await user.press(screen.getByRole('button', { name: '증명서 원본 보기' }))
    expect(await screen.findByLabelText('증명서 원본 1')).toBeOnTheScreen()
    expect(fetchCertificates).toHaveBeenCalledWith(VACCINATION_ID)
  })

  it('14의 증명서 배지로 오면(vaccinationId) 바로 원본을 보여준다', async () => {
    mockParams = { petId: PET_ID, vaccinationId: VACCINATION_ID }
    await renderScreen(<EntryCardScreen />)
    expect(await screen.findByLabelText('증명서 원본 1')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '요약으로 돌아가기' })).toBeOnTheScreen()
  })

  it('삭제된 펫(푸시로 진입 등)이면 로딩 대신 안내를 보여준다', async () => {
    mockParams = { petId: '01890a5d-ac96-774b-bcce-b30209999999' }
    await renderScreen(<EntryCardScreen />)
    expect(await screen.findByText('반려동물을 찾을 수 없어요')).toBeOnTheScreen()
    expect(fetchVaccinations).not.toHaveBeenCalled()
  })
})

describe('불러오기 실패 (다시 시도)', () => {
  it('14: 펫 목록을 못 받으면 다시 시도로 다시 받는다', async () => {
    jest.mocked(fetchMyPets).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    await renderScreen(<MyPetsScreen />)
    expect(await screen.findByText('펫 정보를 불러오지 못했어요')).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText(petInfoLine(PETS[0]!, TODAY))).toBeOnTheScreen()
  })

  it('14: 접종 기록을 못 받으면 "기록 없음" 대신 실패 안내와 다시 시도', async () => {
    jest.mocked(fetchVaccinations).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    await renderScreen(<MyPetsScreen />)
    expect(await screen.findByText('접종 기록을 불러오지 못했어요')).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByText('다음 접종 · 종합백신(DHPPL)')).toBeOnTheScreen()
  })

  it('16: 펫 목록을 못 받으면 무한 로딩 대신 실패 안내와 다시 시도', async () => {
    mockParams = { petId: PET_ID }
    jest.mocked(fetchMyPets).mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    await renderScreen(<EntryCardScreen />)
    expect(await screen.findByText('카드를 불러오지 못했어요')).toBeOnTheScreen()
    await user.press(screen.getByRole('button', { name: '다시 시도' }))
    expect(await screen.findByRole('button', { name: '증명서 원본 보기' })).toBeOnTheScreen()
  })
})
