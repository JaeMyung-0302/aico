import { create } from 'zustand'
import { api } from '@/lib/api'
import type { BattleResult, DungeonDifficulty, Element, Equipment } from '@monster-factory/shared'

interface DungeonResponse extends BattleResult {
  equipment: Equipment | null
  enemyElement: Element
}

interface DungeonState {
  battleResult: DungeonResponse | null
  loading: boolean
  enterDungeon: (floor: number, difficulty: DungeonDifficulty) => Promise<DungeonResponse>
  clearResult: () => void
}

export const useDungeonStore = create<DungeonState>((set) => ({
  battleResult: null,
  loading: false,

  enterDungeon: async (floor, difficulty) => {
    set({ loading: true })
    try {
      const result = await api.post<DungeonResponse>('/dungeon/enter', {
        floor,
        difficulty,
      })
      set({ battleResult: result, loading: false })
      return result
    } catch (error) {
      set({ loading: false })
      throw error
    }
  },

  clearResult: () => set({ battleResult: null }),
}))
