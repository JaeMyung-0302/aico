import type { SaveData } from '@soulblade/shared'
import { SAVE_VERSION } from '@soulblade/shared'
import { api } from './api'

const SAVE_KEY = 'soulblade_save'

// 런타임 SaveData 검증
const isSaveData = (data: unknown): data is SaveData => {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.version === 'number' &&
    typeof obj.lastSavedAt === 'string' &&
    typeof obj.characterClass === 'string' &&
    typeof obj.characterLevel === 'number' &&
    typeof obj.currentMapId === 'string' &&
    typeof obj.gold === 'number'
  )
}

// localStorage 저장
export const saveLocal = (data: SaveData): void => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data))
  } catch {
    // localStorage 용량 초과 등
  }
}

// localStorage 로드
export const loadLocal = (): SaveData | null => {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isSaveData(parsed)) return null
    if (parsed.version !== SAVE_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

// localStorage 삭제
export const clearLocal = (): void => {
  localStorage.removeItem(SAVE_KEY)
}

// NestJS API 비동기 저장 (write-through)
export const saveRemote = async (data: SaveData): Promise<void> => {
  try {
    await api.put('/saves', { saveData: data })
  } catch {
    // 네트워크 오류 시 무시 (localStorage가 1차)
  }
}

// NestJS API 로드
export const loadRemote = async (): Promise<SaveData | null> => {
  try {
    const result = await api.get<{ saveData: unknown; updatedAt: string | null }>('/saves')

    if (!result?.saveData) return null
    if (!isSaveData(result.saveData)) return null
    if (result.saveData.version !== SAVE_VERSION) return null
    return result.saveData
  } catch {
    return null
  }
}

// 머지: 서버 데이터가 최신이면 서버 우선, 아니면 로컬
export const mergeSaveData = (local: SaveData | null, remote: SaveData | null): SaveData | null => {
  if (!local && !remote) return null
  if (!local) return remote
  if (!remote) return local

  // 최신 저장 시각 비교
  const localTime = new Date(local.lastSavedAt).getTime()
  const remoteTime = new Date(remote.lastSavedAt).getTime()

  return remoteTime > localTime ? remote : local
}
