import { create } from 'zustand'
import type { GrowthBranch } from '@/types'

interface BranchLevel {
  attack: number
  defense: number
  economy: number
  luck: number
}

interface GrowthState {
  levels: BranchLevel
  totalInvested: number
}

interface GrowthActions {
  upgrade: (branch: GrowthBranch) => boolean
  getBonuses: () => GrowthBonuses
  reset: () => void
}

export interface GrowthBonuses {
  atkBonus: number
  maxHpBonus: number
  goldBonus: number
  luckBonus: number
}

const MAX_TIER = 3

// Tier별 업그레이드 비용
const UPGRADE_COSTS: Record<number, number> = {
  0: 50,  // Tier 0 → 1
  1: 150, // Tier 1 → 2
  2: 400, // Tier 2 → 3
}

// Tier별 보너스
const BRANCH_BONUSES: Record<GrowthBranch, number[]> = {
  attack: [0, 0.05, 0.12, 0.20],   // 공격력 +5/12/20%
  defense: [0, 10, 25, 50],         // 최대 HP +10/25/50
  economy: [0, 0.05, 0.12, 0.20],  // 골드 보너스 +5/12/20%
  luck: [0, 0.02, 0.05, 0.10],     // 행운 +2/5/10%
}

const initialState: GrowthState = {
  levels: { attack: 0, defense: 0, economy: 0, luck: 0 },
  totalInvested: 0,
}

export const useGrowthStore = create<GrowthState & GrowthActions>((set, get) => ({
  ...initialState,

  upgrade: (branch) => {
    const currentLevel = get().levels[branch]
    if (currentLevel >= MAX_TIER) return false

    const cost = UPGRADE_COSTS[currentLevel] ?? 0
    // 비용은 useUserStore에서 차감 (호출 측에서 처리)

    set((state) => ({
      levels: { ...state.levels, [branch]: state.levels[branch] + 1 },
      totalInvested: state.totalInvested + cost,
    }))
    return true
  },

  getBonuses: () => {
    const { levels } = get()
    return {
      atkBonus: BRANCH_BONUSES.attack[levels.attack] ?? 0,
      maxHpBonus: BRANCH_BONUSES.defense[levels.defense] ?? 0,
      goldBonus: BRANCH_BONUSES.economy[levels.economy] ?? 0,
      luckBonus: BRANCH_BONUSES.luck[levels.luck] ?? 0,
    }
  },

  reset: () => set(initialState),
}))

export { UPGRADE_COSTS, BRANCH_BONUSES, MAX_TIER }
