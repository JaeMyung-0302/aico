// 세션 복구 시스템 (localStorage 기반)
// 게임 중 이탈 시 상태를 저장하고, 재진입 시 복구

const SESSION_KEY = 'eg-session'
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24시간

export interface SessionData {
  userId: string
  wave: number
  gold: number
  hp: number
  maxHp: number
  score: number
  artifacts: string[]
  placedUnits: Array<{
    instanceId: string
    unitDataId: string
    grade: number
    position: { row: number; col: number }
    fusionElement?: string
  }>
  savedAt: number
}

// 타입 가드: localStorage 데이터 검증
const isValidSessionData = (v: unknown): v is SessionData => {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.userId === 'string' &&
    typeof s.wave === 'number' && s.wave >= 0 && s.wave <= 30 &&
    typeof s.gold === 'number' && s.gold >= 0 &&
    typeof s.hp === 'number' &&
    typeof s.maxHp === 'number' &&
    typeof s.score === 'number' && s.score >= 0 && s.score <= 999999 &&
    Array.isArray(s.artifacts) &&
    Array.isArray(s.placedUnits) &&
    typeof s.savedAt === 'number'
  )
}

export const saveSession = (data: Omit<SessionData, 'savedAt'>): boolean => {
  try {
    const session: SessionData = {
      ...data,
      savedAt: Date.now(),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}

export const loadSession = (currentUserId?: string): SessionData | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)

    // 구조 검증
    if (!isValidSessionData(parsed)) {
      clearSession()
      return null
    }

    // 만료 체크
    if (Date.now() - parsed.savedAt > SESSION_EXPIRY_MS) {
      clearSession()
      return null
    }

    // 다계정 혼선 방지: userId 불일치 시 복구 거부
    if (currentUserId && parsed.userId !== currentUserId) {
      clearSession()
      return null
    }

    return parsed
  } catch {
    clearSession()
    return null
  }
}

export const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

export const hasSession = (currentUserId?: string): boolean => {
  return loadSession(currentUserId) !== null
}
