// === 속성 ===
export type Element = 'fire' | 'water' | 'wind' | 'thunder' | 'earth'
export type FusionElement = 'plasma' | 'frost' | 'lava' | 'storm' | 'swamp' | 'heatwave'

// === 유닛 등급 ===
export type UnitGrade = 1 | 2 | 3 | 4 | 5

// === 유닛 데이터 ===
export interface UnitData {
  id: string
  name: string
  element: Element
  type: 'basic' | 'special'
  baseAtk: number
  atkSpeed: number // 초당 공격 횟수
  range: number // 그리드 셀 단위
  description: string
}

// === 융합 유닛 데이터 ===
export interface FusionUnitData {
  id: string
  name: string
  fusionElement: FusionElement
  elements: [Element, Element]
  baseAtk: number
  atkSpeed: number
  range: number
  description: string
}

// === 등급별 스탯 배율 ===
export interface GradeMultiplier {
  grade: UnitGrade
  atkMultiplier: number
}

// === 적 ===
export interface EnemyData {
  id: string
  name: string
  element: Element
  baseHp: number
  speed: number // px/sec
  reward: number // 골드
  type: 'normal' | 'elite' | 'boss'
  specialAbility?: string
  immuneElement?: Element // 면역 속성 (해당 속성 공격 = 데미지 0)
  traits?: EnemyTrait[] // 적 특성 (armored, fast, regen, swarm, shielded)
}

// 속성 상성 효과 판별
export type ElementEffect = 'effective' | 'resisted' | 'immune' | 'neutral'

// === 유닛 능력 ===
export type AbilityType = 'none' | 'aoe' | 'slow' | 'buff_atk' | 'buff_range' | 'chain' | 'pierce' | 'prioritize_hp' | 'debuff_armor'

export interface AbilityData {
  type: AbilityType
  params: Record<string, number>
}

// === 적 특성 ===
export type EnemyTrait = 'armored' | 'fast' | 'regen' | 'swarm' | 'shielded'

export interface TraitConfig {
  trait: EnemyTrait
  value: number // 특성별 수치 (armor: 감소율, regen: 초당 %, shield: 히트 수)
}

// === 원소 반응 ===
export type ReactionType =
  | 'steam'
  | 'firestorm'
  | 'overload'
  | 'magma'
  | 'blizzard'
  | 'electro'
  | 'swamp_reaction'
  | 'thunderstorm'
  | 'sandstorm'
  | 'quake'

export interface ElementMark {
  element: Element
  appliedAt: number // timestamp (ms)
}

export interface ReactionData {
  type: ReactionType
  name: string
  elements: [Element, Element]
  effectType: string
  value: number
  duration: number // ms
  description: string
}

// === 디버프/버프 ===
export type DebuffType = 'slow' | 'stun' | 'disable' | 'armor_break' | 'dot' | 'evasion_zero' | 'atk_reduce'
export type BuffType = 'atk_boost' | 'range_boost'

export interface ActiveDebuff {
  id: string
  type: DebuffType
  targetId: string
  value: number
  remainingMs: number
  maxMs: number
}

export interface ActiveBuff {
  type: BuffType
  targetId: string
  value: number
  sourceId: string
}

// === 웨이브 ===
export interface WaveEnemyEntry {
  enemyId: string
  count: number
}

export interface WaveData {
  wave: number
  enemies: WaveEnemyEntry[]
  spawnInterval: number // ms
  goldReward: number
  isArtifactWave: boolean // 5의 배수
  isBossWave: boolean // 10의 배수
}

// === 유물 ===
export type ArtifactCategory = 'attack' | 'defense' | 'economy' | 'element' | 'synergy' | 'special'
export type ArtifactRarity = 'common' | 'rare' | 'epic'

export interface ArtifactEffect {
  type: string
  value: number
  target?: Element | 'all'
}

export interface ArtifactData {
  id: string
  name: string
  category: ArtifactCategory
  rarity: ArtifactRarity
  description: string
  effect: ArtifactEffect
}

// === 지형 ===
export type TerrainType = 'lava' | 'pool' | 'conductor' | 'rock' | 'gust'

export interface TerrainData {
  type: TerrainType
  name: string
  description: string
  buffElement: Element
  effectMultiplier: number
}

// === 성장 트리 ===
export type GrowthBranch = 'attack' | 'defense' | 'economy' | 'luck'

export interface GrowthBonus {
  type: string
  value: number
}

export interface GrowthNode {
  id: string
  branch: GrowthBranch
  tier: 1 | 2 | 3
  name: string
  description: string
  cost: number
  bonus: GrowthBonus
}

// === 게임 상태 ===
export interface GridPosition {
  row: number
  col: number
}

export interface PlacedUnit {
  instanceId: string
  unitDataId: string
  grade: UnitGrade
  position: GridPosition
  fusionElement?: FusionElement
  evolutionId?: string
}

// === 히어로 ===
export interface HeroSkillData {
  id: string
  name: string
  element: Element
  type: 'attack' | 'utility'
  damage: number // 0 for utility skills
  cooldown: number // seconds
  range: number // pixels
  duration: number // effect duration (ms), 0 for instant
  description: string
}

export interface HeroState {
  element: Element
  currentHp: number
  maxHp: number
  isDead: boolean
  reviveTimer: number // remaining seconds, 0 if alive
  skill1Cooldown: number // remaining seconds
  skill2Cooldown: number // remaining seconds
}

// === 타워 진화 ===
export interface EvolutionBranch {
  id: string
  name: string
  unitDataId: string
  baseAtk: number
  atkSpeed: number
  range: number
  bonusEffect: string
  description: string
}

export interface EvolutionData {
  unitDataId: string
  branches: [EvolutionBranch, EvolutionBranch]
}

// === 경제 ===
export interface Economy {
  gold: number
  gel: number
  exp: number
}

// === 게임 런 상태 ===
export interface GameRunState {
  wave: number
  hp: number
  maxHp: number
  gold: number
  score: number
  units: PlacedUnit[]
  artifacts: string[]
  terrains: { position: GridPosition; type: TerrainType }[]
}
