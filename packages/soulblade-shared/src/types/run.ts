import type { CharacterClass } from './character.js'
import type { Equipment } from './equipment.js'
import type { PassiveSkillId } from './skill.js'
import type { StageId } from './stage.js'

// 게임 런 결과
export interface RunResult {
  readonly userId: string
  readonly characterId: string
  readonly classType: CharacterClass
  readonly stageId: StageId
  readonly score: number
  readonly survivedSeconds: number
  readonly monstersKilled: number
  readonly bossKilled: boolean
  readonly maxLevel: number
  readonly skillsAcquired: readonly PassiveSkillId[]
  readonly equipmentDropped: readonly Equipment[]
}

// 런 보상 (서버 계산)
export interface RunReward {
  readonly metaGold: number
  readonly exp: number
  readonly equipmentIds: readonly string[]
}

// 일일 도전
export interface DailyChallenge {
  readonly id: string
  readonly description: string
  readonly condition: DailyChallengeCondition
  readonly reward: number // 메타 골드
  readonly completed: boolean
}

// 도전 조건 타입
export type DailyChallengeCondition =
  | { readonly type: 'kill_monsters'; readonly count: number }
  | { readonly type: 'survive_seconds'; readonly seconds: number }
  | { readonly type: 'reach_level'; readonly level: number }
  | { readonly type: 'complete_stage'; readonly stageId: StageId }

// 출석 기록
export interface AttendanceRecord {
  readonly userId: string
  readonly date: string // YYYY-MM-DD
  readonly claimed: boolean
  readonly consecutiveDays: number
}

// 도전 모드 타입
export type ChallengeMode = 'time_attack' | 'infinite' | 'boss_rush' | 'restricted'
