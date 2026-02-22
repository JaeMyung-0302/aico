/**
 * R3F 마이그레이션용 공유 엔티티 타입
 * Phaser 의존성 없음 — 순수 TypeScript
 */

import type { CharacterClass, BasicAttackPattern } from '@soulblade/shared'
import type { PassiveSkillId, EliteMutationType } from '@soulblade/shared'

// ── 물리 바디 ──

export interface PhysicsBody {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  radius?: number // circle collider
  isStatic: boolean
}

export interface WorldBounds {
  x: number
  y: number
  width: number
  height: number
}

// ── 엔티티 기본 ──

export interface EntityBase {
  id: string
  active: boolean
  body: PhysicsBody
}

// ── 플레이어 ──

export interface PlayerEntity extends EntityBase {
  classType: CharacterClass
  attackPattern: BasicAttackPattern

  // 전투 스탯
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  crit: number
  critDmg: number
  weaponPower: number

  // 레벨링
  level: number
  exp: number
  expToNext: number

  // 패시브
  passiveSkills: Map<PassiveSkillId, number>

  // 방향 (라디안)
  facingAngle: number

  // holy_shield
  holyShieldActive: boolean
  holyShieldTimer: number
  holyShieldInterval: number

  // 상태
  isAttacking: boolean
  invincible: boolean
  invincibleTimer: number

  // 이름
  characterName: string
}

// ── 몬스터 ──

export interface MonsterEntity extends EntityBase {
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  level: number
  expReward: number
  goldReward: number

  // 상태 효과
  slowMultiplier: number
  dotDamage: number
  dotTimer: number
  dotTickTimer: number
}

// ── 엘리트 ──

export interface EliteEntity extends EntityBase {
  mutationType: EliteMutationType
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  level: number
  expReward: number
  goldReward: number
  tint: number
  scale: number

  // AI 상태
  chaseRange: number
  attackRange: number

  // splitting 변이: 분열 횟수
  splitCount: number

  // 상태 효과
  slowMultiplier: number
  dotDamage: number
  dotTimer: number
  dotTickTimer: number
}

// ── 보스 ──

export type BossPhase = 'chase' | 'charge' | 'aoe' | 'summon'

export interface BossEntity extends EntityBase {
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  level: number
  expReward: number
  goldReward: number

  // 보스 AI
  currentPhase: BossPhase
  phaseTimer: number
  chargeTarget: { x: number; y: number } | null
  isCharging: boolean

  // 상태 효과
  slowMultiplier: number
  dotDamage: number
  dotTimer: number
  dotTickTimer: number
}

// ── 투사체 ──

export interface ProjectileEntity extends EntityBase {
  damage: number
  piercing: boolean
  lifetimeTimer: number
  angle: number
  speed: number
}

// ── 충돌 결과 ──

export interface CollisionResult {
  overlapping: boolean
  separationX: number
  separationY: number
}
