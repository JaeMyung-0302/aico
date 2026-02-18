import type { Element, MonsterStats } from './monster.js'
import type { BattleResult } from './game.js'

// 파티
export interface Party {
  id: string
  userId: string
  slot1Id: string | null
  slot2Id: string | null
  slot3Id: string | null
}

// 팀 전투용 멤버
export interface TeamMember {
  monsterId: string
  name: string | null
  element: Element
  stats: MonsterStats
  imageUrl: string | null
}

// 시너지 타입
export const SynergyType = {
  DUO: 'DUO',
  TRIO: 'TRIO',
  RAINBOW: 'RAINBOW',
} as const

export type SynergyType = (typeof SynergyType)[keyof typeof SynergyType]

// 시너지 보너스
export interface SynergyBonus {
  type: SynergyType
  description: string
  statModifiers: Partial<Record<keyof MonsterStats, number>>
}

// 팀 전투 라운드 결과
export interface TeamBattleRound {
  roundNumber: number
  playerMember: TeamMember
  enemyMember: TeamMember
  battleResult: BattleResult
}

// 팀 전투 최종 결과
export interface TeamBattleResult {
  winner: 'player' | 'enemy'
  rounds: TeamBattleRound[]
  totalGoldReward: number
  synergyBonus: SynergyBonus | null
  stars: number // 1~3 (스테이지 전투용)
}

// 스테이지 전투 API 응답
export interface StageBattleResponse {
  winner: 'player' | 'enemy'
  rounds: TeamBattleRound[]
  totalGoldReward: number
  summonStonesReward: number
  stars: number
  synergyBonus: SynergyBonus | null
  stageId: string
  stageNumber: number
  chapterName: string
}
