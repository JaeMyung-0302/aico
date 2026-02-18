import { create } from 'zustand'
import { api } from '@/lib/api'
import type { StageBattleResponse } from '@monster-factory/shared'

interface StageData {
  id: string
  stageNumber: number
  isBoss: boolean
  energyCost: number
  enemies: unknown
  rewards: unknown
  result: { id: string; stars: number; clearedAt: string } | null
}

interface ChapterData {
  id: string
  number: number
  name: string
  description: string | null
  stages: StageData[]
  clearedCount: number
  totalCount: number
}

interface StageState {
  chapters: ChapterData[]
  battleResult: StageBattleResponse | null
  loading: boolean
  battling: boolean
  fetchStages: () => Promise<void>
  startBattle: (stageId: string) => Promise<void>
  clearBattleResult: () => void
}

export const useStageStore = create<StageState>((set) => ({
  chapters: [],
  battleResult: null,
  loading: true,
  battling: false,

  fetchStages: async () => {
    try {
      const chapters = await api.get<ChapterData[]>('/stages')
      set({ chapters, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  startBattle: async (stageId: string) => {
    set({ battling: true })
    try {
      const result = await api.post<StageBattleResponse>(`/stages/${stageId}/battle`)
      set({ battleResult: result, battling: false })
    } catch {
      set({ battling: false })
    }
  },

  clearBattleResult: () => set({ battleResult: null }),
}))
