/**
 * 몬스터 엔티티 순수 함수
 * Phaser Monster 클래스의 게임 로직을 순수 함수로 포팅
 *
 * 모든 함수는 MonsterEntity를 in-place mutate (60fps 성능 패턴)
 */

import type { MonsterType } from '@soulblade/shared'
import { MONSTER_TYPE_BASE_DEF } from '@soulblade/shared'
import { angleBetween } from '../physics/aabb'
import type { MonsterEntity } from '../types'

// ── 몬스터 스탯 설정 ──

export interface MonsterSpawnConfig {
  readonly hp: number
  readonly atk: number
  readonly def: number
  readonly spd: number
  readonly level: number
  readonly expReward: number
  readonly goldReward: number
}

// 몬스터 타입별 스탯 배율
const MONSTER_TYPE_MULTIPLIERS: Record<MonsterType, { hp: number; atk: number; spd: number }> = {
  normal: { hp: 1.0, atk: 1.0, spd: 1.0 },
  fast:   { hp: 0.6, atk: 0.8, spd: 2.0 },
  tank:   { hp: 3.0, atk: 0.6, spd: 0.5 },
  ranged: { hp: 0.8, atk: 1.5, spd: 0.8 },
  swarm:  { hp: 0.4, atk: 0.5, spd: 1.5 },
}

// 레벨 기반 몬스터 기본 스탯
export const getMonsterConfigByLevel = (level: number, monsterType: MonsterType = 'normal'): MonsterSpawnConfig => {
  const scale = 1 + (level - 1) * 0.25
  const mul = MONSTER_TYPE_MULTIPLIERS[monsterType]
  return {
    hp: Math.floor(10 * scale * mul.hp),
    atk: Math.floor(4 * scale * mul.atk),
    def: Math.floor(MONSTER_TYPE_BASE_DEF[monsterType] * (1 + 0.25 * (level - 1))),
    spd: Math.min(2 + Math.floor(level / 10), 6) * mul.spd,
    level,
    expReward: Math.floor(5 + level * 2),
    goldReward: Math.floor(2 + level),
  }
}

// ── 팩토리 ──

let monsterIdCounter = 0

export const createMonster = (
  x: number,
  y: number,
  config: MonsterSpawnConfig,
): MonsterEntity => {
  monsterIdCounter += 1
  return {
    id: `m_${monsterIdCounter}`,
    active: true,
    body: {
      x,
      y,
      vx: 0,
      vy: 0,
      width: 32,
      height: 32,
      isStatic: false,
    },
    hp: config.hp,
    maxHp: config.hp,
    atk: config.atk,
    def: config.def,
    spd: config.spd,
    level: config.level,
    expReward: config.expReward,
    goldReward: config.goldReward,
    slowMultiplier: 0,
    dotDamage: 0,
    dotTimer: 0,
    dotTickTimer: 0,
  }
}

// ── AI: 플레이어 추적 ──

/** @mutates monster.body.vx, monster.body.vy */
export const monsterChasePlayer = (monster: MonsterEntity, playerX: number, playerY: number): void => {
  if (!monster.active) return

  const angle = angleBetween(monster.body.x, monster.body.y, playerX, playerY)
  const baseSpeed = 50 + monster.spd * 10
  const speed = baseSpeed * (1 - monster.slowMultiplier)

  monster.body.vx = Math.cos(angle) * speed
  monster.body.vy = Math.sin(angle) * speed
}

// ── 데미지 처리 ──

/** @mutates monster.hp, monster.active */
export const monsterTakeDamage = (monster: MonsterEntity, amount: number): boolean => {
  monster.hp -= amount

  if (monster.hp <= 0) {
    monster.active = false
    monster.body.vx = 0
    monster.body.vy = 0
    return true // killed
  }
  return false
}

// ── 상태 효과 ──

/** @mutates monster.dotDamage, monster.dotTimer, monster.dotTickTimer */
export const monsterApplyDot = (monster: MonsterEntity, damage: number, durationMs: number): void => {
  monster.dotDamage = damage
  monster.dotTimer = durationMs
  monster.dotTickTimer = 0
}

/** @mutates monster.slowMultiplier */
export const monsterApplySlow = (monster: MonsterEntity, percent: number): void => {
  monster.slowMultiplier = Math.min(percent, 0.8)
}

/** @mutates monster.dotTimer, monster.dotTickTimer, monster.dotDamage, monster.hp, monster.active */
export const monsterUpdateEffects = (monster: MonsterEntity, deltaMs: number): boolean => {
  if (!monster.active) return false

  let killed = false

  // DoT 처리 (1초마다 틱)
  if (monster.dotTimer > 0) {
    monster.dotTimer -= deltaMs
    monster.dotTickTimer += deltaMs
    if (monster.dotTickTimer >= 1000) {
      monster.dotTickTimer -= 1000
      killed = monsterTakeDamage(monster, monster.dotDamage)
    }
    if (monster.dotTimer <= 0) {
      monster.dotDamage = 0
      monster.dotTickTimer = 0
    }
  }

  return killed
}

// ── 오브젝트 풀 재활용 ──

/** @mutates monster 전체 필드 */
export const monsterReset = (
  monster: MonsterEntity,
  x: number,
  y: number,
  config: MonsterSpawnConfig,
): void => {
  monster.body.x = x
  monster.body.y = y
  monster.body.vx = 0
  monster.body.vy = 0
  monster.hp = config.hp
  monster.maxHp = config.hp
  monster.atk = config.atk
  monster.def = config.def
  monster.spd = config.spd
  monster.level = config.level
  monster.expReward = config.expReward
  monster.goldReward = config.goldReward
  monster.slowMultiplier = 0
  monster.dotDamage = 0
  monster.dotTimer = 0
  monster.dotTickTimer = 0
  monster.active = true
}

// ID 카운터 리셋 (테스트용)
export const resetMonsterIdCounter = (): void => {
  monsterIdCounter = 0
}
