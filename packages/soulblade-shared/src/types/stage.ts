// 스테이지 ID (3종, 서바이벌 모드 레거시)
export type StageId = 'serpent_forest' | 'ice_cave' | 'flame_castle'

// 맵 ID re-export (RPG 모드)
export type { MapId } from './map.js'

// 이벤트 타입 (7분/12분 시점)
export type EventType = 'merchant' | 'curse' | 'miniboss_rush'

// 몬스터 타입
export type MonsterType = 'normal' | 'fast' | 'tank' | 'ranged' | 'swarm'

// 엘리트 변이 타입 (5종)
export type EliteMutationType = 'speedy' | 'armored' | 'splitting' | 'ranged' | 'explosive'

// 보스 타입
export type BossType = 'serpent_king' | 'ice_golem' | 'flame_dragon'

// 웨이브 설정
export interface WaveConfig {
  readonly timeStart: number // 초
  readonly timeEnd: number // 초
  readonly monsterTypes: readonly MonsterType[]
  readonly spawnRate: number // 초당 몬스터 수
  readonly maxConcurrent: number
  readonly eliteChance: number // 0-1
}

// 보스 설정
export interface BossConfig {
  readonly type: BossType
  readonly spawnTime: number // 초
  readonly hp: number
  readonly atk: number
  readonly phases: number // 다단계 패턴 수
}

// 이벤트 설정
export interface EventConfig {
  readonly type: EventType
  readonly triggerTime: number // 초
  readonly duration: number // 초
}

// 스테이지 설정
export interface StageConfig {
  readonly id: StageId
  readonly name: string
  readonly description: string
  readonly duration: number // 초 (총 플레이 시간)
  readonly tilemap: string // 타일맵 경로
  readonly waves: readonly WaveConfig[]
  readonly boss: BossConfig
  readonly events: readonly EventConfig[]
  readonly unlockCondition: StageId | null // null = 기본 해금
  readonly recommendedLevel: number
}
