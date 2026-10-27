import { fireEvent, render, screen } from '@testing-library/react-native'
import { FIXED_NOW_MS } from '@/test-utils/fixtures'
import { SafeAreaTestProvider } from '@/test-utils/SafeAreaTestProvider'
import MonthJumpSheet from '../ui-month-jump/MonthJumpSheet'
import { formatMonthLabel, monthJumpBefore } from '../util-timeline/month-jump'

const onSelect = jest.fn()
const onClose = jest.fn()

const renderSheet = (selectedMonth: string | null = '2026-10') =>
  render(
    <SafeAreaTestProvider>
      <MonthJumpSheet isVisible selectedMonth={selectedMonth} nowMs={FIXED_NOW_MS} onClose={onClose} onSelect={onSelect} />
    </SafeAreaTestProvider>,
  )

beforeEach(() => {
  jest.clearAllMocks()
})

describe('월 점프', () => {
  it('고른 달의 마지막 날까지 보이도록 다음 달 1일을 before(제외)로 쓴다 — 항상 YYYY-MM-01', () => {
    expect(monthJumpBefore(2026, 10)).toBe('2026-11-01')
    expect(monthJumpBefore(2026, 12)).toBe('2027-01-01')
    expect(monthJumpBefore(2025, 1)).toBe('2025-02-01')
    expect(formatMonthLabel('2026-03')).toBe('2026년 3월')
  })

  it('지금(KST 2026-10)보다 뒤의 달·해는 고를 수 없고, 고른 달을 표시한다', async () => {
    await renderSheet()
    expect(screen.getByText('2026')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '11월' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '다음 해' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '10월' })).toBeSelected()

    await fireEvent.press(screen.getByRole('button', { name: '9월' }))
    expect(onSelect).toHaveBeenCalledWith(2026, 9)
  })

  it('이전 해로 넘겨 고를 수 있다', async () => {
    await renderSheet()
    await fireEvent.press(screen.getByRole('button', { name: '이전 해' }))
    expect(screen.getByText('2025')).toBeOnTheScreen()
    expect(screen.getByRole('button', { name: '12월' })).toBeEnabled()
    await fireEvent.press(screen.getByRole('button', { name: '12월' }))
    expect(onSelect).toHaveBeenCalledWith(2025, 12)
  })
})
