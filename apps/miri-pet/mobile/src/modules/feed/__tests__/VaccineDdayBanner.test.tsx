import type { UpcomingVaccinationResponse } from '@miri-pet/shared'
import { render, screen, userEvent } from '@testing-library/react-native'
import { router } from 'expo-router'
import { fetchUpcomingVaccination } from '@/modules/vaccinations/data-access-vaccinations/vaccinations-api'
import { QueryTestProvider } from '@/test-utils/QueryTestProvider'
import VaccineDdayBanner from '../ui-vaccine-dday-banner/VaccineDdayBanner'

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }))
jest.mock('@/modules/vaccinations/data-access-vaccinations/vaccinations-api', () => ({
  fetchUpcomingVaccination: jest.fn(),
}))

const upcoming = (dDay: number): UpcomingVaccinationResponse => ({
  item: {
    dDay,
    pet: { id: '0199e3a0-0000-7000-8000-000000000002', name: '보리' },
    vaccination: {
      id: '0199e3a0-0000-7000-8000-000000000003',
      petId: '0199e3a0-0000-7000-8000-000000000002',
      type: 'DHPPL',
      customName: null,
      administeredOn: '2025-10-20',
      clinicName: null,
      nextDueOn: '2026-10-20',
      certificateCount: 0,
    },
  },
})

const renderBanner = () =>
  render(
    <QueryTestProvider>
      <VaccineDdayBanner />
    </QueryTestProvider>,
  )

beforeEach(() => jest.clearAllMocks())

describe('접종 D-day 배너 (04)', () => {
  it('가장 가까운 접종을 "보리 ○○ D-7"로 보여주고 누르면 내 펫 탭으로', async () => {
    jest.mocked(fetchUpcomingVaccination).mockResolvedValue(upcoming(7))
    const user = userEvent.setup()
    await renderBanner()
    expect(await screen.findByText(/^보리 .+ D-7$/)).toBeOnTheScreen()
    expect(screen.getByText('10월 20일 · 증명서 미리 챙겨두세요')).toBeOnTheScreen()
    await user.press(screen.getByRole('button'))
    expect(router.push).toHaveBeenCalledWith('/pets')
  })

  it('당일이면 D-DAY', async () => {
    jest.mocked(fetchUpcomingVaccination).mockResolvedValue(upcoming(0))
    await renderBanner()
    expect(await screen.findByText(/D-DAY$/)).toBeOnTheScreen()
  })

  it('다가오는 접종이 없으면 아무것도 그리지 않는다', async () => {
    jest.mocked(fetchUpcomingVaccination).mockResolvedValue({ item: null })
    await renderBanner()
    expect(fetchUpcomingVaccination).toHaveBeenCalled()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
