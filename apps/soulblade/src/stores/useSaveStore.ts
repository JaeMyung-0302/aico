import { create } from 'zustand'
import type { SaveData, CharacterClass, CharacterStats, MapId } from '@soulblade/shared'
import { SAVE_VERSION } from '@soulblade/shared'
import { saveLocal, loadLocal, saveRemote, loadRemote, mergeSaveData } from '@/lib/save-manager'

interface SaveState {
  // RPG 영구 데이터
  readonly characterClass: CharacterClass
  readonly characterLevel: number
  readonly characterExp: number
  readonly characterStats: CharacterStats
  readonly currentMapId: MapId
  readonly position: { readonly x: number; readonly y: number }
  readonly gold: number
  readonly loaded: boolean

  // 액션
  readonly load: () => Promise<void>
  readonly save: (overrides?: Partial<SaveData>) => void
  readonly updateFromGame: (data: {
    level: number
    exp: number
    stats: CharacterStats
    mapId: MapId
    position: { x: number; y: number }
    gold: number
  }) => void
}

const DEFAULT_STATS: CharacterStats = {
  hp: 120,
  atk: 15,
  def: 12,
  spd: 8,
  crit: 0.05,
  critDmg: 1.5,
}

export const useSaveStore = create<SaveState>((set, get) => ({
  characterClass: 'Warrior',
  characterLevel: 1,
  characterExp: 0,
  characterStats: { ...DEFAULT_STATS },
  currentMapId: 'town',
  position: { x: 1080, y: 1920 },
  gold: 0,
  loaded: false,

  load: async () => {
    const local = loadLocal()
    const remote = await loadRemote('anonymous')
    const merged = mergeSaveData(local, remote)

    if (merged) {
      set({
        characterClass: merged.characterClass,
        characterLevel: merged.characterLevel,
        characterExp: merged.characterExp,
        characterStats: merged.characterStats,
        currentMapId: merged.currentMapId,
        position: merged.position,
        gold: merged.gold,
        loaded: true,
      })
    } else {
      set({ loaded: true })
    }
  },

  save: (overrides) => {
    const state = get()
    const saveData: SaveData = {
      version: SAVE_VERSION,
      characterClass: state.characterClass,
      characterLevel: state.characterLevel,
      characterExp: state.characterExp,
      characterStats: state.characterStats,
      currentMapId: state.currentMapId,
      position: state.position,
      gold: state.gold,
      lastSavedAt: new Date().toISOString(),
      ...overrides,
    }

    // localStorage 즉시 저장
    saveLocal(saveData)

    // Supabase 비동기 저장 (fire-and-forget)
    saveRemote('anonymous', saveData).catch(() => {
      // 실패해도 무시 (localStorage가 1차)
    })
  },

  updateFromGame: (data) => {
    set({
      characterLevel: data.level,
      characterExp: data.exp,
      characterStats: data.stats,
      currentMapId: data.mapId,
      position: data.position,
      gold: data.gold,
    })
  },
}))
