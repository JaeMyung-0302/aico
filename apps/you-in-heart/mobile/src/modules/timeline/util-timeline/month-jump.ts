const pad2 = (value: number): string => String(value).padStart(2, '0')

// 고른 달의 마지막 날까지 보이도록 다음 달 1일을 before(그날 제외)로 쓴다 → GET /diary?before=YYYY-MM-01
export const monthJumpBefore = (year: number, month: number): string =>
  month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`

// 'YYYY-MM' → "2026년 10월"
export const formatMonthLabel = (yearMonth: string): string => {
  const [year, month] = yearMonth.split('-')
  return `${year}년 ${Number(month)}월`
}

export const toYearMonth = (isoDate: string): string => isoDate.slice(0, 7)
