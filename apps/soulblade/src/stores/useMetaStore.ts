import { create } from 'zustand'
import type { PermanentStats, SkillTreeNode } from '@soulblade/shared'
import { EMPTY_PERMANENT_STATS, MAX_PERMANENT_STAT_LEVEL } from '@soulblade/shared'
import { calcPermanentStatCost } from '@soulblade/shared'
import { supabase } from '@/lib/supabase'

interface MetaState {
  readonly metaGold: number
  readonly gems: number
  readonly permanentStats: PermanentStats
  readonly skillTree: readonly SkillTreeNode[]
  readonly loading: boolean
  readonly fetchMeta: (userId: string) => Promise<void>
  readonly purchaseUpgrade: (statType: keyof PermanentStats) => Promise<boolean>
  readonly addMetaGold: (amount: number) => void
}

export const useMetaStore = create<MetaState>((set, get) => ({
  metaGold: 0,
  gems: 0,
  permanentStats: { ...EMPTY_PERMANENT_STATS },
  skillTree: [],
  loading: false,

  fetchMeta: async (userId) => {
    set({ loading: true })
    try {
      // 프로필에서 메타 골드, 젬 조회
      const { data: profile, error: profileError } = await supabase
        .from('sb_profiles')
        .select('meta_gold, gems')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError

      // 스킬 트리 노드 조회
      const { data: nodes } = await supabase
        .from('sb_skill_tree')
        .select('*')
        .eq('user_id', userId)

      const skillTree: SkillTreeNode[] = (nodes ?? []).map((n) => ({
        id: n.node_id,
        name: n.node_id,
        description: '',
        cost: 0,
        prerequisiteIds: [],
        effect: {},
        unlocked: n.unlocked,
        level: n.level,
        maxLevel: 5,
      }))

      set({
        metaGold: profile?.meta_gold ?? 0,
        gems: profile?.gems ?? 0,
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
      // Edge Function 호출
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      const response = await supabase.functions.invoke('purchase-upgrade', {
        body: { statType },
      })

      if (response.error) return false

      const result = response.data as { newLevel: number; remainingGold: number }

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
