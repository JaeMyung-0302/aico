import { render, screen, userEvent } from '@testing-library/react-native'
import NextDueCard from '../ui-vaccination-list/NextDueCard'
import VaccinationList from '../ui-vaccination-list/VaccinationList'
import { nextDueFor } from '../util-vaccination/next-due'

const PET_ID = '01890a5d-ac96-774b-bcce-b302099a8058'
const vaccination = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  petId: PET_ID,
  type: 'DHPPL' as const,
  customName: null,
  administeredOn: '2025-10-20',
  clinicName: '미리동물병원',
  nextDueOn: null,
  certificateCount: 0,
  ...overrides,
})

const DHPPL = vaccination('01890a5d-ac96-774b-bcce-b302099a8061', { nextDueOn: '2026-10-22', certificateCount: 1 })
const RABIES = vaccination('01890a5d-ac96-774b-bcce-b302099a8062', {
  type: 'RABIES',
  administeredOn: '2026-03-02',
  clinicName: null,
  nextDueOn: '2027-03-02',
})
const OLD = vaccination('01890a5d-ac96-774b-bcce-b302099a8063', { type: 'CORONA', nextDueOn: '2026-10-01' })

describe('nextDueFor', () => {
  it('오늘 이후 가장 가까운 다음 접종 + D-day (지난 날짜 제외)', () => {
    expect(nextDueFor([RABIES, DHPPL, OLD], '2026-10-15')).toEqual({ vaccination: DHPPL, dDay: 7 })
    expect(nextDueFor([OLD], '2026-10-15')).toBeNull()
  })
})

describe('VaccinationList', () => {
  it('접종 이름·날짜·병원을 보여주고 증명서가 있으면 증명서 버튼을 단다', async () => {
    const onPressCertificate = jest.fn()
    const onPressVaccination = jest.fn()
    await render(
      <VaccinationList
        vaccinations={[DHPPL, RABIES]}
        onPressCertificate={onPressCertificate}
        onPressVaccination={onPressVaccination}
      />,
    )

    expect(screen.getByText('종합백신(DHPPL)')).toBeOnTheScreen()
    expect(screen.getByText('2025.10.20 · 미리동물병원')).toBeOnTheScreen()
    expect(screen.getByText('2026.03.02')).toBeOnTheScreen()
    const buttons = screen.getAllByRole('button', { name: /증명서 보기/ })
    expect(buttons).toHaveLength(1)
    await userEvent.setup().press(buttons[0]!)
    expect(onPressCertificate).toHaveBeenCalledWith(DHPPL)
    expect(onPressVaccination).not.toHaveBeenCalled()
    await userEvent.setup().press(screen.getByRole('button', { name: '광견병 기록 수정' }))
    expect(onPressVaccination).toHaveBeenCalledWith(RABIES)
  })

  it('기록이 없으면 안내 문구', async () => {
    await render(<VaccinationList vaccinations={[]} onPressCertificate={jest.fn()} onPressVaccination={jest.fn()} />)
    expect(screen.getByText('아직 접종 기록이 없어요')).toBeOnTheScreen()
  })
})

describe('NextDueCard', () => {
  it('D-7 · 다음 접종 이름 · 날짜와 알림 안내', async () => {
    await render(<NextDueCard next={{ vaccination: DHPPL, dDay: 7 }} />)
    expect(screen.getByText('D-7')).toBeOnTheScreen()
    expect(screen.getByText('다음 접종 · 종합백신(DHPPL)')).toBeOnTheScreen()
    expect(screen.getByText('2026.10.22 · 7일 전, 하루 전에 알려드려요')).toBeOnTheScreen()
  })
})
