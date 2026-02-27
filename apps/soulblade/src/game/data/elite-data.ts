/**
 * 엘리트 엔티티 순수 함수
 * Phaser EliteMonster 클래스의 게임 로직을 순수 함수로 포팅
 *
 * 모든 함수는 EliteEntity를 in-place mutate (60fps 성능 패턴)
 */

import type { EliteMutationType } from '@soulblade/shared'
import { angleBetween, distanceBetween } from '../physics/aabb'
import type { EliteEntity } from '../types'
import type { MonsterSpawnConfig } from './monster-data'

// ── 엘리트 변이 설정 ──

interface EliteMutation {
  readonly type: EliteMutationType
  readonly hpMultiplier: number
  readonly atkMultiplier: number
  readonly spdMultiplier: number
  readonly tint: number
  readonly scale: number
}

export const MUTATIONS: Record<EliteMutationType, EliteMutation> = {
  speedy: {
    type: 'speedy',
    hpMultiplier: 0.8,
    atkMultiplier: 1.0,
    spdMultiplier: 2.0,
    tint: 0xffff00,
    scale: 1.2,
  },
  armored: {
    type: 'armored',
    hpMultiplier: 3.0,
    atkMultiplier: 0.8,
    spdMultiplier: 0.6,
    tint: 0x888888,
    scale: 1.5,
  },
  splitting: {
    type: 'splitting',
    hpMultiplier: 1.5,
    atkMultiplier: 0.7,
    spdMultiplier: 1.0,
    tint: 0x00ff00,
    scale: 1.3,
  },
  ranged: {
    type: 'ranged',
    hpMultiplier: 1.0,
    atkMultiplier: 1.5,
    spdMultiplier: 0.8,
    tint: 0xff00ff,
    scale: 1.2,
  },
  explosive: {
    type: 'explosive',
    hpMultiplier: 1.2,
    atkMultiplier: 2.0,
    spdMultiplier: 1.0,
    tint: 0xff6600,
    scale: 1.4,
  },
}

export const ELITE_MUTATION_TYPES: readonly EliteMutationType[] = [
  'speedy',
  'armored',
  'splitting',
  'ranged',
  'explosive',
]

// ── 팩토리 ──

let eliteIdCounter = 0

export const createElite = (
  x: number,
  y: number,
  baseConfig: MonsterSpawnConfig,
  mutationType: EliteMutationType,
): EliteEntity => {
  eliteIdCounter += 1
  const mutation = MUTATIONS[mutationType]

  return {
    id: `e_${eliteIdCounter}`,
    active: true,
    body: {
      x,
      y,
      vx: 0,
      vy: 0,
      width: Math.floor(32 * mutation.scale),
      height: Math.floor(32 * mutation.scale),
      isStatic: false,
    },
    mutationType,
    hp: Math.floor(baseConfig.hp * mutation.hpMultiplier),
    maxHp: Math.floor(baseConfig.hp * mutation.hpMultiplier),
    atk: Math.floor(baseConfig.atk * mutation.atkMultiplier),
    def:
      mutationType === 'armored'
        ? Math.floor(baseConfig.def * 1.5)
        : baseConfig.def,
    spd: Math.floor(baseConfig.spd * mutation.spdMultiplier),
    level: baseConfig.level,
    expReward: Math.floor(baseConfig.expReward * 2.5),
    goldReward: Math.floor(baseConfig.goldReward * 3),
    tint: mutation.tint,
    scale: mutation.scale,
    chaseRange: mutationType === 'ranged' ? 200 : Infinity,
    attackRange: mutationType === 'ranged' ? 120 : 40,
    splitCount: mutationType === 'splitting' ? 2 : 0,
    slowMultiplier: 0,
    dotDamage: 0,
    dotTimer: 0,
    dotTickTimer: 0,
  }
}

// ── AI: 변이 타입별 행동 ──

/** @mutates elite.body.vx, elite.body.vy */
export const eliteChasePlayer = (
  elite: EliteEntity,
  playerX: number,
  playerY: number,
): void => {
  if (!elite.active) return

  const angle = angleBetween(elite.body.x, elite.body.y, playerX, playerY)
  const speed = (50 + elite.spd * 10) * (1 - elite.slowMultiplier)

  if (elite.mutationType === 'ranged') {
    // 원거리: 일정 거리 유지
    const dist = distanceBetween(elite.body.x, elite.body.y, playerX, playerY)
    if (dist < 120) {
      elite.body.vx = -Math.cos(angle) * speed
      elite.body.vy = -Math.sin(angle) * speed
    } else if (dist > 200) {
      elite.body.vx = Math.cos(angle) * speed
      elite.body.vy = Math.sin(angle) * speed
    } else {
      elite.body.vx = 0
      elite.body.vy = 0
    }
  } else {
    elite.body.vx = Math.cos(angle) * speed
    elite.body.vy = Math.sin(angle) * speed
  }
}

// ── 데미지 처리 ──

/** @mutates elite.hp, elite.active */
export const eliteTakeDamage = (
  elite: EliteEntity,
  amount: number,
): boolean => {
  // armored: 데미지 25% 감소
  const finalDamage =
    elite.mutationType === 'armored' ? Math.floor(amount * 0.75) : amount

  elite.hp -= finalDamage

  if (elite.hp <= 0) {
    elite.active = false
    elite.body.vx = 0
    elite.body.vy = 0
    return true // killed
  }
  return false
}

// ── 상태 효과 ──

/** @mutates elite.dotDamage, elite.dotTimer, elite.dotTickTimer */
export const eliteApplyDot = (
  elite: EliteEntity,
  damage: number,
  durationMs: number,
): void => {
  elite.dotDamage = damage
  elite.dotTimer = durationMs
  elite.dotTickTimer = 0
}

/** @mutates elite.slowMultiplier */
export const eliteApplySlow = (elite: EliteEntity, percent: number): void => {
  elite.slowMultiplier = Math.min(percent, 0.8)
}

/** @mutates elite.dotTimer, elite.dotTickTimer, elite.dotDamage, elite.hp, elite.active */
export const eliteUpdateEffects = (
  elite: EliteEntity,
  deltaMs: number,
): boolean => {
  if (!elite.active) return false

  let killed = false

  if (elite.dotTimer > 0) {
    elite.dotTimer -= deltaMs
    elite.dotTickTimer += deltaMs
    if (elite.dotTickTimer >= 1000) {
      elite.dotTickTimer -= 1000
      killed = eliteTakeDamage(elite, elite.dotDamage)
    }
    if (elite.dotTimer <= 0) {
      elite.dotDamage = 0
      elite.dotTickTimer = 0
    }
  }

  return killed
}

// ── splitting 분열 ──

export const eliteCanSplit = (elite: EliteEntity): boolean =>
  elite.splitCount > 0

// ── 오브젝트 풀 재활용 ──

/** @mutates elite 전체 필드 */
export const eliteReset = (
  elite: EliteEntity,
  x: number,
  y: number,
  baseConfig: MonsterSpawnConfig,
  mutationType: EliteMutationType,
): void => {
  const mutation = MUTATIONS[mutationType]

  elite.body.x = x
  elite.body.y = y
  elite.body.vx = 0
  elite.body.vy = 0
  elite.body.width = Math.floor(32 * mutation.scale)
  elite.body.height = Math.floor(32 * mutation.scale)
  ;(elite as { mutationType: EliteMutationType }).mutationType = mutationType
  elite.hp = Math.floor(baseConfig.hp * mutation.hpMultiplier)
  elite.maxHp = elite.hp
  elite.atk = Math.floor(baseConfig.atk * mutation.atkMultiplier)
  elite.def =
    mutationType === 'armored'
      ? Math.floor(baseConfig.def * 1.5)
      : baseConfig.def
  elite.spd = Math.floor(baseConfig.spd * mutation.spdMultiplier)
  elite.level = baseConfig.level
  elite.expReward = Math.floor(baseConfig.expReward * 2.5)
  elite.goldReward = Math.floor(baseConfig.goldReward * 3)
  elite.tint = mutation.tint
  elite.scale = mutation.scale
  elite.splitCount = mutationType === 'splitting' ? 2 : 0
  elite.slowMultiplier = 0
  elite.dotDamage = 0
  elite.dotTimer = 0
  elite.dotTickTimer = 0
  elite.active = true
}

// ID 카운터 리셋 (테스트용)
export const resetEliteIdCounter = (): void => {
  eliteIdCounter = 0
}
