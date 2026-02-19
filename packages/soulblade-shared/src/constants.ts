import type { CharacterClass, ClassConfig, PermanentStats } from './types/character.js'
import type { EquipmentGrade, EquipmentTag, GradeStatRange, TagSynergyConfig } from './types/equipment.js'
import type { MonsterType, StageId } from './types/stage.js'

// === 클래스 설정 ===

export const CLASS_CONFIGS: Record<CharacterClass, ClassConfig> = {
  Warrior: {
    classType: 'Warrior',
    baseStats: { hp: 120, atk: 15, def: 12, spd: 8, crit: 0.05, critDmg: 1.5 },
    growthRates: { hp: 15, atk: 2.0, def: 3.0, spd: 0.5, crit: 0.002, critDmg: 0.02 },
    basicAttackPattern: 'melee_fan',
    activeSkillId: 'warrior_whirlwind',
    description: '근접 부채꼴 공격. 높은 HP와 방어력.',
    classPassive: { type: 'damage_reduction', value: 0.85 },
  },
  Archer: {
    classType: 'Archer',
    baseStats: { hp: 80, atk: 18, def: 6, spd: 12, crit: 0.15, critDmg: 2.0 },
    growthRates: { hp: 8, atk: 2.5, def: 0.8, spd: 1.5, crit: 0.008, critDmg: 0.03 },
    basicAttackPattern: 'ranged_projectile',
    activeSkillId: 'archer_rain',
    description: '원거리 투사체 공격. 높은 크리티컬.',
    classPassive: { type: 'crit_damage_bonus', value: 1.3 },
  },
  Mage: {
    classType: 'Mage',
    baseStats: { hp: 70, atk: 20, def: 5, spd: 9, crit: 0.08, critDmg: 1.8 },
    growthRates: { hp: 7, atk: 4.0, def: 0.5, spd: 0.6, crit: 0.003, critDmg: 0.025 },
    basicAttackPattern: 'aoe_circle',
    activeSkillId: 'mage_meteor',
    description: '원형 범위 마법 공격. 최고 공격력.',
    classPassive: { type: 'skill_multiplier', value: 1.4 },
  },
  Paladin: {
    classType: 'Paladin',
    baseStats: { hp: 100, atk: 12, def: 15, spd: 7, crit: 0.06, critDmg: 1.5 },
    growthRates: { hp: 10, atk: 1.5, def: 2.5, spd: 0.4, crit: 0.002, critDmg: 0.02 },
    basicAttackPattern: 'mid_range_holy',
    activeSkillId: 'paladin_judgment',
    description: '중거리 성스러운 타격. 최고 방어력 + 힐.',
    classPassive: { type: 'heal_on_kill', value: 0.03 },
  },
} as const

// === 장비 시스템 ===

// 등급별 스탯 범위
export const GRADE_STAT_RANGES: Record<EquipmentGrade, GradeStatRange> = {
  common: { min: 1, max: 5 },
  uncommon: { min: 4, max: 10 },
  rare: { min: 8, max: 18 },
  epic: { min: 15, max: 30 },
  legendary: { min: 25, max: 50 },
} as const

// 장비 드롭 확률 (기본)
export const GRADE_DROP_RATES: Record<EquipmentGrade, number> = {
  common: 0.50,
  uncommon: 0.28,
  rare: 0.15,
  epic: 0.06,
  legendary: 0.01,
} as const

// 태그 시너지 보너스 (3세트/4세트)
export const TAG_SYNERGY_CONFIGS: Record<EquipmentTag, TagSynergyConfig> = {
  fire: {
    tag: 'fire',
    threeSetBonus: { atk: 15 },
    fourSetBonus: { atk: 30, crit: 0.05 },
  },
  ice: {
    tag: 'ice',
    threeSetBonus: { def: 10, spd: 2 },
    fourSetBonus: { def: 20, spd: 5 },
  },
  vampire: {
    tag: 'vampire',
    threeSetBonus: { hp: 20 },
    fourSetBonus: { hp: 50, atk: 10 },
  },
  thunder: {
    tag: 'thunder',
    threeSetBonus: { spd: 5, crit: 0.05 },
    fourSetBonus: { spd: 10, crit: 0.10, critDmg: 0.3 },
  },
  holy: {
    tag: 'holy',
    threeSetBonus: { def: 15, hp: 15 },
    fourSetBonus: { def: 30, hp: 30 },
  },
  poison: {
    tag: 'poison',
    threeSetBonus: { atk: 10, crit: 0.03 },
    fourSetBonus: { atk: 25, critDmg: 0.5 },
  },
} as const

// === 경험치 & 레벨 ===

// 레벨업 필요 경험치 (레벨 1-50)
export const BASE_EXP_PER_LEVEL = 100
export const EXP_GROWTH_RATE = 1.15

// 최대 In-Run 레벨
export const MAX_IN_RUN_LEVEL = 50

// 클래스 마스터리 최대 레벨
export const MAX_MASTERY_LEVEL = 30

// === 메타 성장 ===

// 영구 스탯 업그레이드 비용 (레벨별)
export const PERMANENT_STAT_BASE_COST = 50
export const PERMANENT_STAT_COST_GROWTH = 1.3

// 최대 영구 스탯 레벨
export const MAX_PERMANENT_STAT_LEVEL = 20

// === 스테이지 ===

// 스테이지별 메타 골드 기본 보상
export const STAGE_META_GOLD_REWARD: Record<StageId, number> = {
  serpent_forest: 50,
  ice_cave: 80,
  flame_castle: 120,
} as const

// 스테이지별 지속 시간 (초)
export const STAGE_DURATION: Record<StageId, number> = {
  serpent_forest: 900, // 15분
  ice_cave: 1200, // 20분
  flame_castle: 1500, // 25분
} as const

// === 레벨업 스탯 배분 ===

export const STAT_POINTS_PER_LEVEL = 5

// 포인트 1개당 스탯 증가량
export const STAT_POINT_VALUES = {
  hp: 10,
  atk: 2,
  def: 1.5,
  spd: 0.5,
  crit: 0.01,
} as const

// === 데미지 공식 ===

// 몬스터 타입별 기본 DEF
export const MONSTER_TYPE_BASE_DEF: Record<MonsterType, number> = {
  normal: 3,
  fast: 1,
  tank: 8,
  ranged: 2,
  swarm: 1,
} as const

// 레벨 팩터 계수
export const LEVEL_FACTOR_COEFF = 0.05
export const LEVEL_FACTOR_MIN = 0.5
export const LEVEL_FACTOR_MAX = 2.0

// DEF 공식 기저값: DEF_FORMULA_BASE / (DEF_FORMULA_BASE + DEF)
export const DEF_FORMULA_BASE = 100

// === 전투 ===

export const BASE_ATTACK_COOLDOWN = 1.0 // 초
export const KNOCKBACK_FORCE = 200
export const INVINCIBILITY_DURATION = 500 // ms

// 몬스터 동시 최대 수
export const MAX_CONCURRENT_MONSTERS = 30

// === 이벤트 타임 ===

export const EVENT_TIMES = [420, 720] as const // 7분, 12분 (초)
export const EVENT_MERCHANT_DURATION = 30 // 초

// === RPG 월드 ===

// 뷰포트 (화면 크기, 기존 GAME_WIDTH/HEIGHT)
export const VIEWPORT_WIDTH = 540
export const VIEWPORT_HEIGHT = 960

// 월드 크기 (4x4배)
export const WORLD_WIDTH = 2160
export const WORLD_HEIGHT = 3840

// 카메라
export const CAMERA_LERP = 0.1
export const CAMERA_DEADZONE_X = 108 // 뷰포트 20%
export const CAMERA_DEADZONE_Y = 192

// 존 스폰
export const ZONE_RESPAWN_DELAY = 5000 // ms
export const CULLING_PADDING = 200 // px

// 사망 페널티
export const DEATH_EXP_PENALTY = 0.1 // 10%

// === 수익화 ===

export const MAX_REVIVES_PER_RUN = 1
export const REVIVE_HP_PERCENT = 0.5
export const STARTER_PACK_PRICE_USD = 0.99

// === 일일 시스템 ===

export const DAILY_CHALLENGE_COUNT = 3
export const DAILY_RESET_HOUR_UTC = 15 // UTC 15:00 = KST 00:00

// 연속 출석 보너스 (일수 → 메타 골드)
export const ATTENDANCE_BONUS: Record<number, number> = {
  1: 10,
  2: 15,
  3: 20,
  4: 25,
  5: 30,
  6: 40,
  7: 100, // 7일 연속 보너스
} as const

// === 초기값 ===

export const INITIAL_META_GOLD = 0
export const INITIAL_GEMS = 0

// 빈 영구 스탯
export const EMPTY_PERMANENT_STATS: PermanentStats = {
  hp: 0,
  atk: 0,
  def: 0,
  spd: 0,
  crit: 0,
} as const
