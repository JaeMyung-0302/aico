// 캐릭터 클래스
export type CharacterClass = 'Warrior' | 'Archer' | 'Mage' | 'Paladin'

// 기본 전투 스탯
export interface CharacterStats {
  readonly hp: number
  readonly atk: number
  readonly def: number
  readonly spd: number
  readonly crit: number
  readonly critDmg: number
}

// 기본 공격 패턴
export type BasicAttackPattern = 'melee_fan' | 'ranged_projectile' | 'aoe_circle' | 'mid_range_holy'

// 직업 고유 패시브 타입
export type ClassPassiveType = 'damage_reduction' | 'crit_damage_bonus' | 'skill_multiplier' | 'heal_on_kill'

export interface ClassPassive {
  readonly type: ClassPassiveType
  readonly value: number
}

// 클래스별 설정
export interface ClassConfig {
  readonly classType: CharacterClass
  readonly baseStats: CharacterStats
  readonly growthRates: CharacterStats
  readonly basicAttackPattern: BasicAttackPattern
  readonly activeSkillId: string
  readonly description: string
  readonly classPassive: ClassPassive
}

// 영구 스탯 (메타 성장)
export interface PermanentStats {
  readonly hp: number
  readonly atk: number
  readonly def: number
  readonly spd: number
  readonly crit: number
}

// 클래스 마스터리 레벨 (최대 30)
export interface MasteryLevel {
  readonly classType: CharacterClass
  readonly level: number
  readonly totalExp: number
}

// 캐릭터 저장 데이터 (Supabase)
export interface CharacterData {
  readonly id: string
  readonly userId: string
  readonly classType: CharacterClass
  readonly level: number
  readonly masteryLevel: number
  readonly permanentStats: PermanentStats
}
