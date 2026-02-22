import type { CharacterClass, CharacterStats } from './character.js'
import type { MapId } from './map.js'

export const SAVE_VERSION = 1

// 영구 저장 데이터
export interface SaveData {
  readonly version: number
  readonly characterClass: CharacterClass
  readonly characterLevel: number
  readonly characterExp: number
  readonly characterStats: CharacterStats
  readonly currentMapId: MapId
  readonly position: { readonly x: number; readonly y: number }
  readonly gold: number
  readonly classLocked: boolean
  readonly characterName?: string
  readonly lastSavedAt: string // ISO 8601
}
