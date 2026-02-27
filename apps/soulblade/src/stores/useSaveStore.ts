import { create } from 'zustand'
import type {
  SaveData,
  CharacterClass,
  CharacterStats,
  MapId,
} from '@soulblade/shared'
import { SAVE_VERSION } from '@soulblade/shared'
import {
  saveLocal,
  loadLocal,
  saveRemote,
  loadRemote,
  mergeSaveData,
} from '@/lib/save-manager'
import { supabase } from '@/lib/supabase'

interface SaveState {
  // RPG 영구 데이터
  readonly characterClass: CharacterClass
  readonly characterLevel: number
  readonly characterExp: number
  readonly characterStats: CharacterStats
  readonly currentMapId: MapId
  readonly position: { readonly x: number; readonly y: number }
  readonly gold: number
  readonly classLocked: boolean
  readonly characterName: string
  readonly loaded: boolean

  // 액션
  readonly load: () => Promise<void>
  readonly save: (overrides?: Partial<SaveData>) => void
  readonly lockClass: (classType: CharacterClass, characterName: string) => void
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
  classLocked: false,
  characterName: '',
  loaded: false,

  load: async () => {
    const local = loadLocal()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userId = user?.id ?? ''
    const remote = userId ? await loadRemote() : null
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
        classLocked: merged.classLocked ?? false,
        characterName: merged.characterName ?? '',
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
      classLocked: state.classLocked,
      characterName: state.characterName || undefined,
      lastSavedAt: new Date().toISOString(),
      ...overrides,
    }

    // localStorage 즉시 저장
    saveLocal(saveData)

    // NestJS API 비동기 저장 (fire-and-forget)
    saveRemote(saveData).catch(() => {
      // 실패해도 무시 (localStorage가 1차)
    })
  },

  lockClass: (classType, characterName) => {
    set({ classLocked: true, characterClass: classType, characterName })
    get().save()
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
