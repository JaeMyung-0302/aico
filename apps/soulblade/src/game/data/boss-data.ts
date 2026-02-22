/**
 * 보스 엔티티 순수 함수
 * Phaser Boss 클래스의 게임 로직을 순수 함수로 포팅
 *
 * 모든 함수는 BossEntity를 in-place mutate (60fps 성능 패턴)
 */

import { angleBetween } from '../physics/aabb'
import type { BossEntity, BossPhase } from '../types'

// ── 보스 설정 ──

export interface BossConfig {
  readonly hp: number
  readonly atk: number
  readonly def: number
  readonly spd: number
  readonly level: number
  readonly phases: number // 2, 3, or 4 — 페이즈 전환 공격성 결정
}

// ── 팩토리 ──

let bossIdCounter = 0

export const createBoss = (
  x: number,
  y: number,
  config: BossConfig,
): BossEntity => {
  bossIdCounter += 1
  return {
    id: `boss_${bossIdCounter}`,
    active: true,
    body: {
      x,
      y,
      vx: 0,
      vy: 0,
      width: 64,
      height: 64,
      isStatic: false,
    },
    hp: config.hp,
    maxHp: config.hp,
    atk: config.atk,
    def: config.def,
    spd: config.spd,
    level: config.level,
    expReward: Math.floor(config.hp * 0.5),
    goldReward: Math.floor(config.hp * 0.3),
    currentPhase: 'chase',
    phaseTimer: 3000,
    chargeTarget: null,
    isCharging: false,
    slowMultiplier: 0,
    dotDamage: 0,
    dotTimer: 0,
    dotTickTimer: 0,
  }
}

// ── AI: 페이즈 기반 행동 ──

// 페이즈 지속시간 (HP 비율에 따라 단축)
const getPhaseDuration = (boss: BossEntity): number => {
  const hpRatio = boss.hp / boss.maxHp
  if (hpRatio < 0.33) return 2000  // 격노
  if (hpRatio < 0.66) return 2500
  return 3000
}

// 다음 페이즈 결정 (HP 비율에 따른 확률)
const pickNextPhase = (boss: BossEntity): BossPhase => {
  const hpRatio = boss.hp / boss.maxHp
  const r = Math.random()

  if (hpRatio > 0.66) {
    // 60% chase | 25% charge | 15% aoe
    if (r < 0.6) return 'chase'
    if (r < 0.85) return 'charge'
    return 'aoe'
  } else if (hpRatio > 0.33) {
    // 40% chase | 30% charge | 30% aoe
    if (r < 0.4) return 'chase'
    if (r < 0.7) return 'charge'
    return 'aoe'
  } else {
    // 50% charge | 30% aoe | 20% summon
    if (r < 0.5) return 'charge'
    if (r < 0.8) return 'aoe'
    return 'summon'
  }
}

/**
 * 보스 AI 업데이트 (매 프레임)
 * @mutates boss.currentPhase, boss.phaseTimer, boss.chargeTarget, boss.isCharging, boss.body.vx, boss.body.vy
 * @returns 현재 페이즈 (렌더링/이펙트 용)
 */
export const bossUpdateAI = (
  boss: BossEntity,
  deltaMs: number,
  playerX: number,
  playerY: number,
): BossPhase => {
  if (!boss.active) return boss.currentPhase

  boss.phaseTimer -= deltaMs

  // 페이즈 전환
  if (boss.phaseTimer <= 0) {
    boss.currentPhase = pickNextPhase(boss)
    boss.phaseTimer = getPhaseDuration(boss)
    boss.isCharging = false
    boss.chargeTarget = null
  }

  const speed = (50 + boss.spd * 10) * (1 - boss.slowMultiplier)

  switch (boss.currentPhase) {
    case 'chase': {
      const angle = angleBetween(boss.body.x, boss.body.y, playerX, playerY)
      boss.body.vx = Math.cos(angle) * speed
      boss.body.vy = Math.sin(angle) * speed
      break
    }
    case 'charge': {
      if (!boss.isCharging) {
        // 돌진 대상 위치 고정
        boss.chargeTarget = { x: playerX, y: playerY }
        boss.isCharging = true
      }
      if (boss.chargeTarget) {
        const angle = angleBetween(boss.body.x, boss.body.y, boss.chargeTarget.x, boss.chargeTarget.y)
        const chargeSpeed = speed * 2.5
        boss.body.vx = Math.cos(angle) * chargeSpeed
        boss.body.vy = Math.sin(angle) * chargeSpeed
      }
      break
    }
    case 'aoe':
    case 'summon': {
      // AoE/소환 중 정지
      boss.body.vx = 0
      boss.body.vy = 0
      break
    }
  }

  return boss.currentPhase
}

// ── 데미지 처리 ──

/** @mutates boss.hp, boss.active */
export const bossTakeDamage = (boss: BossEntity, amount: number): boolean => {
  boss.hp -= amount

  if (boss.hp <= 0) {
    boss.active = false
    boss.body.vx = 0
    boss.body.vy = 0
    return true // killed
  }
  return false
}

// ── 상태 효과 ──

/** @mutates boss.dotDamage, boss.dotTimer, boss.dotTickTimer */
export const bossApplyDot = (boss: BossEntity, damage: number, durationMs: number): void => {
  boss.dotDamage = damage
  boss.dotTimer = durationMs
  boss.dotTickTimer = 0
}

/** @mutates boss.slowMultiplier */
export const bossApplySlow = (boss: BossEntity, percent: number): void => {
  boss.slowMultiplier = Math.min(percent, 0.5) // 보스는 최대 50% 감속
}

/** @mutates boss.dotTimer, boss.dotTickTimer, boss.dotDamage, boss.hp, boss.active */
export const bossUpdateEffects = (boss: BossEntity, deltaMs: number): boolean => {
  if (!boss.active) return false

  let killed = false

  if (boss.dotTimer > 0) {
    boss.dotTimer -= deltaMs
    boss.dotTickTimer += deltaMs
    if (boss.dotTickTimer >= 1000) {
      boss.dotTickTimer -= 1000
      killed = bossTakeDamage(boss, boss.dotDamage)
    }
    if (boss.dotTimer <= 0) {
      boss.dotDamage = 0
      boss.dotTickTimer = 0
    }
  }

  return killed
}

// ID 카운터 리셋 (테스트용)
export const resetBossIdCounter = (): void => {
  bossIdCounter = 0
}
