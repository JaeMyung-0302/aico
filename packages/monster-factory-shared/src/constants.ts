import type { Element, MonsterStats, Personality } from './types/monster.js'
import type { MiniGameGrade } from './types/game.js'
import type { StatType } from './types/item.js'
import type { Rarity } from './types/species.js'

// 기본 스탯
export const INITIAL_STAT_VALUE = 5

// 에너지 시스템
export const MAX_ENERGY = 5
export const ENERGY_RESET_HOUR_KST = 0

// 에너지 소비
export const ENERGY_COST = {
  Minigame: 1,
  Dungeon: 2,
  PvP: 1,
  Boss: 3,
} as const

// 속성 상성 맵 (attacker → defender = advantage)
export const ELEMENT_ADVANTAGE: Record<Element, Element> = {
  Chemical: 'Nitro',
  Gear: 'Chemical',
  Neon: 'Gear',
  Nitro: 'Neon',
  Crystal: 'Plasma',
  Plasma: 'Crystal',
} as const

export const ELEMENT_ADVANTAGE_MULTIPLIER = 1.2
export const ELEMENT_DISADVANTAGE_MULTIPLIER = 0.8

// 등급별 스탯 보너스
export const GRADE_STAT_BONUS: Record<MiniGameGrade, number> = {
  S: 3.0,
  A: 2.0,
  B: 1.0,
  C: 0.5,
  D: 0.3,
} as const

// 성격 보정치 { stat: multiplier } (1.0 = 기본)
export const PERSONALITY_MODIFIERS: Record<
  Personality,
  Partial<Record<StatType, number>>
> = {
  Brave: { atk: 1.05, def: 0.97 },
  Cautious: { def: 1.05, agi: 0.97 },
  Mischievous: { agi: 1.05, rec: 0.97 },
  Relaxed: { rec: 1.05, atk: 0.97 },
  Unstable: { atk: 1.08 }, // ±8% 랜덤은 서버에서 처리
  Tough: { hp: 1.05, int: 0.97 },
} as const

// 성장 단계 전환 기준 (총 스탯 합)
export const GROWTH_THRESHOLDS = {
  Baby: 30, // Egg → Baby
  Boy: 81, // Baby → Boy
  Adult: 180, // Boy → Adult
  Awakened: 360, // Adult → Awakened
} as const

// 아이템 등급별 스탯 범위
export const ITEM_GRADE_STAT_RANGE = {
  Normal: { min: 1, max: 3 },
  Uncommon: { min: 3, max: 6 },
  Rare: { min: 6, max: 10 },
} as const

// 아이템 드롭 확률
export const ITEM_GRADE_DROP_RATES = {
  Normal: 0.6,
  Uncommon: 0.3,
  Rare: 0.1,
} as const

// 던전 설정
export const DUNGEON_FLOORS = 5
export const DUNGEON_GOLD_REWARD = {
  Easy: 50,
  Normal: 100,
  Hard: 200,
  Hell: 500,
} as const

// 크리티컬 배율
export const CRITICAL_MULTIPLIER = 1.5
export const BASE_CRITICAL_RATE = 0.1

// HP 배율 (전투 시 실효 HP = stats.hp * HP_MULTIPLIER)
export const HP_MULTIPLIER = 5

// 속성별 테마 색상 (배틀 UI, 실루엣 glow 등)
export const ELEMENT_COLORS: Record<Element, string> = {
  Chemical: '#4ade80',
  Gear: '#94a3b8',
  Neon: '#c084fc',
  Nitro: '#fb923c',
  Crystal: '#22d3ee',
  Plasma: '#f472b6',
} as const

// 초기 골드
export const INITIAL_GOLD = 100

// === Dragon Village 리디자인 상수 ===

// 최대 보유 몬스터 수
export const MAX_MONSTERS = 20

// 소환 비용
export const SUMMON_COST = {
  Gold: 300,
  SummonStone: 1,
  MultiStone: 10, // 10+1 소환
} as const

// 소환 확률 (rarity별)
export const RARITY_RATES = {
  Gold: { Common: 0.70, Uncommon: 0.22, Rare: 0.08 },
  SummonStone: { Common: 0.40, Uncommon: 0.35, Rare: 0.25 },
} as const

// 천장 시스템 (Pity)
export const PITY_THRESHOLD = 50 // 50회 연속 Rare 미획득 시 확정

// 성격 → 희귀도 매핑
export const PERSONALITY_RARITY: Record<Personality, Rarity> = {
  Relaxed: 'Common',
  Cautious: 'Common',
  Tough: 'Common',
  Brave: 'Uncommon',
  Mischievous: 'Uncommon',
  Unstable: 'Rare',
} as const

// 속성 시너지 (팀 전투)
export const ELEMENT_SYNERGY = {
  DUO: { minCount: 2, bonus: { atk: 1.05, def: 1.05 } },
  TRIO: { minCount: 3, bonus: { atk: 1.10, def: 1.10 } },
  RAINBOW: { minTypes: 3, bonus: { hp: 1.08 } },
} as const

// 스테이지 에너지 비용
export const STAGE_ENERGY_COST = {
  normal: 2,
  boss: 3,
} as const

// 진화 골드 비용 (기본값, EvolutionPath 테이블에서 개별 설정 가능)
export const EVOLUTION_GOLD_COST = 1000

// 합성 골드 비용
export const FUSION_GOLD_COST = 500

// 초기 몬스터 스탯
export const INITIAL_MONSTER_STATS: MonsterStats = {
  atk: INITIAL_STAT_VALUE,
  def: INITIAL_STAT_VALUE,
  hp: INITIAL_STAT_VALUE,
  agi: INITIAL_STAT_VALUE,
  int: INITIAL_STAT_VALUE,
  rec: INITIAL_STAT_VALUE,
}
