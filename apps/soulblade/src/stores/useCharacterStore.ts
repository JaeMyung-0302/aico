import { create } from 'zustand'
import type { CharacterClass, PermanentStats } from '@soulblade/shared'
import { EMPTY_PERMANENT_STATS } from '@soulblade/shared'
import { api } from '@/lib/api'

interface CharacterResponse {
  readonly permanentHp: number
  readonly permanentAtk: number
  readonly permanentDef: number
  readonly permanentSpd: number
  readonly permanentCrit: number
  readonly masteryLevel: number
  readonly masteryExp: number
}

interface CharacterState {
  readonly selectedClass: CharacterClass
  readonly permanentStats: PermanentStats
  readonly masteryLevel: number
  readonly masteryExp: number
  readonly loading: boolean
  readonly selectClass: (cls: CharacterClass) => void
  readonly fetchCharacter: (cls: CharacterClass) => Promise<void>
  readonly saveCharacter: () => Promise<void>
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  selectedClass: 'Warrior',
  permanentStats: { ...EMPTY_PERMANENT_STATS },
  masteryLevel: 0,
  masteryExp: 0,
  loading: false,

  selectClass: (cls) => set({ selectedClass: cls }),

  fetchCharacter: async (cls) => {
    set({ loading: true })
    try {
      const data = await api.get<CharacterResponse>(`/characters/${cls}`)

      set({
        selectedClass: cls,
        permanentStats: {
          hp: data.permanentHp,
          atk: data.permanentAtk,
          def: data.permanentDef,
          spd: data.permanentSpd,
          crit: data.permanentCrit,
        },
        masteryLevel: data.masteryLevel,
        masteryExp: data.masteryExp,
      })
    } catch {
      // 캐릭터 미존재 시 기본값
      set({
        selectedClass: cls,
        permanentStats: { ...EMPTY_PERMANENT_STATS },
        masteryLevel: 0,
        masteryExp: 0,
      })
    } finally {
      set({ loading: false })
    }
  },

  saveCharacter: async () => {
    const { selectedClass, permanentStats, masteryLevel, masteryExp } = get()
    try {
      await api.put(`/characters/${selectedClass}`, {
        permanentHp: permanentStats.hp,
        permanentAtk: permanentStats.atk,
        permanentDef: permanentStats.def,
        permanentSpd: permanentStats.spd,
        permanentCrit: permanentStats.crit,
        masteryLevel,
        masteryExp,
      })
    } catch {
      // 저장 실패 시 무시 (다음 저장 시 재시도)
    }
  },
}))
