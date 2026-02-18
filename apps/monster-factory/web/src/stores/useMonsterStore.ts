import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Monster, SummonType } from '@monster-factory/shared'

interface SummonResponse {
  monster: Monster
  isNew: boolean
  pityCounter: number
}

interface MonsterState {
  monsters: Monster[]
  activeMonster: Monster | null
  loading: boolean
  fetchMonsters: () => Promise<void>
  summon: (summonType: SummonType) => Promise<SummonResponse>
  releaseMonster: (id: string) => Promise<void>
}

export const useMonsterStore = create<MonsterState>((set, get) => ({
  monsters: [],
  activeMonster: null,
  loading: true,

  fetchMonsters: async () => {
    try {
      const monsters = await api.get<Monster[]>('/monsters')
      const active = monsters.length > 0 ? monsters[0]! : null
      set({ monsters, activeMonster: active, loading: false })
    } catch {
      set({ monsters: [], activeMonster: null, loading: false })
    }
  },

  summon: async (summonType: SummonType) => {
    const result = await api.post<SummonResponse>('/summon', { summonType })
    const { monsters } = get()
    set({
      monsters: [result.monster, ...monsters],
      activeMonster: get().activeMonster ?? result.monster,
    })
    return result
  },

  releaseMonster: async (id: string) => {
    await api.delete(`/monsters/${id}`)
    const { monsters, activeMonster } = get()
    const updated = monsters.filter((m) => m.id !== id)
    set({
      monsters: updated,
      activeMonster: activeMonster?.id === id ? (updated[0] ?? null) : activeMonster,
    })
  },
}))
