// KST(UTC+9) 기준 오늘 날짜를 UTC Date 객체로 반환
export const getKSTToday = (): Date => {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const yyyy = kst.getUTCFullYear()
  const mm = kst.getUTCMonth()
  const dd = kst.getUTCDate()
  return new Date(Date.UTC(yyyy, mm, dd))
}

// KST(UTC+9) 기준 이번 주 월요일 00:00을 UTC Date 객체로 반환
export const getKSTWeekStart = (): Date => {
  const today = getKSTToday()
  const day = today.getUTCDay() // 0=일, 1=월, ..., 6=토
  const diff = day === 0 ? 6 : day - 1 // 일요일이면 6일 전 월요일
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - diff))
}
