/**
 * 투사체 엔티티 순수 함수
 * Phaser Projectile 클래스의 게임 로직을 순수 함수로 포팅
 *
 * 모든 함수는 ProjectileEntity를 in-place mutate (60fps 성능 패턴)
 */

import type { ProjectileEntity } from '../types'
import type { WorldBounds } from '../types'

// ── 투사체 설정 ──

export interface ProjectileConfig {
  readonly speed: number
  readonly damage: number
  readonly piercing: boolean
  readonly lifetime: number // ms
}

// ── 팩토리 ──

let projectileIdCounter = 0

export const createProjectile = (): ProjectileEntity => {
  projectileIdCounter += 1
  return {
    id: `p_${projectileIdCounter}`,
    active: false,
    body: {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      width: 8,
      height: 8,
      isStatic: false,
    },
    damage: 0,
    piercing: false,
    lifetimeTimer: 0,
    angle: 0,
    speed: 0,
  }
}

// ── 발사 ──

/** @mutates projectile 전체 필드 */
export const fireProjectile = (
  projectile: ProjectileEntity,
  x: number,
  y: number,
  angle: number,
  config: ProjectileConfig,
): void => {
  projectile.body.x = x
  projectile.body.y = y
  projectile.angle = angle
  projectile.speed = config.speed
  projectile.damage = config.damage
  projectile.piercing = config.piercing
  projectile.lifetimeTimer = config.lifetime
  projectile.active = true

  projectile.body.vx = Math.cos(angle) * config.speed
  projectile.body.vy = Math.sin(angle) * config.speed
}

// ── 매 프레임 업데이트 ──

/** @mutates projectile.lifetimeTimer, projectile.active, projectile.body.vx/vy */
export const updateProjectile = (
  projectile: ProjectileEntity,
  deltaMs: number,
  worldBounds: WorldBounds,
): void => {
  if (!projectile.active) return

  projectile.lifetimeTimer -= deltaMs
  if (projectile.lifetimeTimer <= 0) {
    deactivateProjectile(projectile)
    return
  }

  // 월드 밖 체크 (50px 패딩)
  const { x, y } = projectile.body
  if (
    x < worldBounds.x - 50 ||
    x > worldBounds.x + worldBounds.width + 50 ||
    y < worldBounds.y - 50 ||
    y > worldBounds.y + worldBounds.height + 50
  ) {
    deactivateProjectile(projectile)
  }
}

// ── 히트 처리 ──

/** @mutates projectile.active, projectile.body.vx/vy */
export const onProjectileHit = (projectile: ProjectileEntity): void => {
  if (!projectile.piercing) {
    deactivateProjectile(projectile)
  }
}

// ── 비활성화 ──

/** @mutates projectile.active, projectile.body.vx/vy */
export const deactivateProjectile = (projectile: ProjectileEntity): void => {
  projectile.active = false
  projectile.body.vx = 0
  projectile.body.vy = 0
}

// ID 카운터 리셋 (테스트용)
export const resetProjectileIdCounter = (): void => {
  projectileIdCounter = 0
}
