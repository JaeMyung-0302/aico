import { create } from 'zustand'
import type { PermanentStats, SkillTreeNode } from '@soulblade/shared'
import {
  EMPTY_PERMANENT_STATS,
  MAX_PERMANENT_STAT_LEVEL,
} from '@soulblade/shared'
import { calcPermanentStatCost } from '@soulblade/shared'
import { api } from '@/lib/api'

interface ProfileResponse {
  readonly metaGold: number
  readonly gems: number
}

interface SkillTreeRow {
  readonly nodeId: string
  readonly unlocked: boolean
  readonly level: number
}

interface MetaState {
  readonly metaGold: number
  readonly gems: number
  readonly permanentStats: PermanentStats
  readonly skillTree: readonly SkillTreeNode[]
  readonly loading: boolean
  readonly fetchMeta: () => Promise<void>
  readonly purchaseUpgrade: (statType: keyof PermanentStats) => Promise<boolean>
  readonly addMetaGold: (amount: number) => void
}

export const useMetaStore = create<MetaState>((set, get) => ({
  metaGold: 0,
  gems: 0,
  permanentStats: { ...EMPTY_PERMANENT_STATS },
  skillTree: [],
  loading: false,

  fetchMeta: async () => {
    set({ loading: true })
    try {
      const profile = await api.get<ProfileResponse>('/profiles/me')

      // TODO: skill-tree API 추가 시 마이그레이션
      const skillTree: SkillTreeNode[] = []

      set({
        metaGold: profile.metaGold,
        gems: profile.gems,
        skillTree,
      })
    } catch {
      // 에러 시 기본값 유지
    } finally {
      set({ loading: false })
    }
  },

  purchaseUpgrade: async (statType) => {
    const { metaGold, permanentStats } = get()
    const currentLevel = permanentStats[statType]
    if (currentLevel >= MAX_PERMANENT_STAT_LEVEL) return false

    const cost = calcPermanentStatCost(currentLevel)
    if (metaGold < cost) return false

    try {
      const result = await api.post<{
        newLevel: number
        remainingGold: number
      }>('/upgrades/purchase', { statType })

      set({
        metaGold: result.remainingGold,
        permanentStats: {
          ...permanentStats,
          [statType]: result.newLevel,
        },
      })

      return true
    } catch {
      return false
    }
  },

  addMetaGold: (amount) => {
    set((state) => ({ metaGold: state.metaGold + amount }))
  },
}))
