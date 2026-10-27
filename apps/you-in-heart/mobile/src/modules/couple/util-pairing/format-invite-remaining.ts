const MINUTE_MS = 60_000

// SCR-02 "23시간 41분 뒤 만료돼요". 만료됐으면 null
export const formatInviteRemaining = (expiresAt: string, nowMs: number): string | null => {
  const remainingMs = Date.parse(expiresAt) - nowMs
  if (!(remainingMs > 0)) return null
  const totalMinutes = Math.max(1, Math.floor(remainingMs / MINUTE_MS))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}시간 ${minutes}분 뒤 만료돼요` : `${minutes}분 뒤 만료돼요`
}
