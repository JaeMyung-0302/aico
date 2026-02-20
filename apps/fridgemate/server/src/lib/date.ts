// KST(UTC+9) 기준 오늘 날짜를 UTC Date 객체로 반환
export const getKSTToday = (): Date => {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const yyyy = kst.getUTCFullYear()
  const mm = kst.getUTCMonth()
  const dd = kst.getUTCDate()
  return new Date(Date.UTC(yyyy, mm, dd))
}
