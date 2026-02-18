import type { Element, GrowthStage, MonsterStats, Personality } from './monster.js'

// 희귀도
export const Rarity = {
  Common: 'Common',
  Uncommon: 'Uncommon',
  Rare: 'Rare',
} as const

export type Rarity = (typeof Rarity)[keyof typeof Rarity]

// 소환 타입
export const SummonType = {
  Gold: 'Gold',
  SummonStone: 'SummonStone',
} as const

export type SummonType = (typeof SummonType)[keyof typeof SummonType]

// 몬스터 종 (도감 기준 데이터)
export interface MonsterSpecies {
  id: string
  name: string
  element: Element
  personality: Personality
  rarity: Rarity
  baseAtk: number
  baseDef: number
  baseHp: number
  baseAgi: number
  baseInt: number
  baseRec: number
  description: string | null
}

// 종+성장단계별 이미지 캐시
export interface SpeciesImage {
  id: string
  speciesId: string
  growthStage: GrowthStage
  imageData: string // data:image/svg+xml;base64,...
  createdAt: string
}

// 도감 발견 기록
export interface Codex {
  id: string
  userId: string
  speciesId: string
  discoveredAt: string
}

// 도감 목록 응답 (species + 발견 여부)
export interface CodexEntry {
  species: MonsterSpecies
  discovered: boolean
  discoveredAt: string | null
}

// 소환 결과
export interface SummonResult {
  monsterId: string
  speciesId: string
  speciesName: string
  rarity: Rarity
  element: Element
  personality: Personality
  stats: MonsterStats
  imageUrl: string | null
  isNew: boolean // 도감에 처음 등록 여부
  pityCounter: number
}

// 소환 이력
export interface SummonHistory {
  id: string
  userId: string
  speciesId: string
  summonType: SummonType
  createdAt: string
}
