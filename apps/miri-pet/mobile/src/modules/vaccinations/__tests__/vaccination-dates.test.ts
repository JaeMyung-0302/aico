import {
  addMonths,
  dDayLabel,
  defaultNextDueOn,
  formatDateInput,
  formatDotDate,
  kstToday,
  vaccineLabel,
} from '../util-vaccination/vaccination-dates'

describe('vaccination-dates', () => {
  it('kstToday: UTC 14:59Z는 그날, 15:00Z는 다음 날(KST)', () => {
    expect(kstToday(new Date('2026-10-13T14:59:59Z'))).toBe('2026-10-13')
    expect(kstToday(new Date('2026-10-13T15:00:00Z'))).toBe('2026-10-14')
  })

  it('addMonths: 월말은 그 달 마지막 날로 맞춘다', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2026-10-01', 12)).toBe('2027-10-01')
    expect(addMonths('2028-02-29', 12)).toBe('2029-02-28')
  })

  it('defaultNextDueOn: 심장사상충은 1개월, 직접 입력은 비움, 나머지 프리셋은 1년', () => {
    expect(defaultNextDueOn('DHPPL', '2026-10-01')).toBe('2027-10-01')
    expect(defaultNextDueOn('RABIES', '2026-03-02')).toBe('2027-03-02')
    expect(defaultNextDueOn('HEARTWORM', '2026-10-01')).toBe('2026-11-01')
    expect(defaultNextDueOn('ETC', '2026-10-01')).toBeNull()
    expect(defaultNextDueOn('DHPPL', '2026-1')).toBeNull()
  })

  it('dDayLabel: 0은 D-DAY, 그 외 D-n', () => {
    expect(dDayLabel(0)).toBe('D-DAY')
    expect(dDayLabel(7)).toBe('D-7')
  })

  it('formatDotDate: 2026-10-20 → 2026.10.20', () => {
    expect(formatDotDate('2026-10-20')).toBe('2026.10.20')
  })

  it('formatDateInput: 숫자만 남겨 YYYY-MM-DD로 끊는다', () => {
    expect(formatDateInput('20261020')).toBe('2026-10-20')
    expect(formatDateInput('2026-1')).toBe('2026-1')
    expect(formatDateInput('202610')).toBe('2026-10')
    expect(formatDateInput('2026.10.20 extra 9')).toBe('2026-10-20')
  })

  it('vaccineLabel: 프리셋은 라벨, 직접 입력은 이름', () => {
    expect(vaccineLabel('DHPPL', null)).toBe('종합백신(DHPPL)')
    expect(vaccineLabel('ETC', '파보 추가')).toBe('파보 추가')
  })
})
