// 패시브 스킬 ID (20종)
export type PassiveSkillId =
  | 'atk_boost'
  | 'def_boost'
  | 'hp_boost'
  | 'spd_boost'
  | 'crit_boost'
  | 'crit_dmg_boost'
  | 'extra_projectile'
  | 'aoe_range_up'
  | 'vampire_touch'
  | 'thorn_armor'
  | 'dodge_chance'
  | 'exp_boost'
  | 'gold_boost'
  | 'cooldown_reduction'
  | 'attack_speed_up'
  | 'pierce_shot'
  | 'chain_lightning'
  | 'frozen_aura'
  | 'burn_dot'
  | 'holy_shield'

// 패시브 스킬 정의
export interface PassiveSkill {
  readonly id: PassiveSkillId
  readonly name: string
  readonly description: string
  readonly maxLevel: number
  readonly effectPerLevel: Record<string, number>
  readonly icon: string
}

// 액티브 스킬 정의
export interface ActiveSkill {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly classType: string
  readonly cooldown: number // 초
  readonly damage: number // 스킬 배율
  readonly range: number
  readonly maxLevel: number
}

// 스킬 진화 (액티브 Lv.5 + 패시브 Lv.5 조합)
export interface SkillEvolution {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly requiredActiveSkillId: string
  readonly requiredPassiveSkillId: PassiveSkillId
  readonly evolvedSkillEffect: Record<string, number>
}

// In-Run 스킬 선택지 (레벨업 시 3개 제시)
export interface InRunSkillChoice {
  readonly skillId: PassiveSkillId
  readonly currentLevel: number
  readonly nextLevel: number
}

// 스킬 트리 노드 (메타 성장)
export interface SkillTreeNode {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly cost: number // 메타 골드
  readonly prerequisiteIds: readonly string[]
  readonly effect: Record<string, number>
  readonly unlocked: boolean
  readonly level: number
  readonly maxLevel: number
}
