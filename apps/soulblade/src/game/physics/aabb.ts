/**
 * 커스텀 AABB/Circle 물리 엔진
 * Phaser Arcade Physics 대체 — gravity 없는 탑다운 2D
 *
 * ⚠️ 성능 최적화: 물리 함수들은 의도적으로 PhysicsBody를 직접 변이(mutate)합니다.
 * 60fps useFrame 루프에서 매 프레임 새 객체를 생성하면 GC 압박이 발생하므로,
 * 게임 물리 엔진의 표준 패턴인 in-place mutation을 사용합니다.
 */

import type { PhysicsBody, WorldBounds, CollisionResult } from '../types'

// ── AABB 충돌 감지 ──

export const checkAABB = (a: PhysicsBody, b: PhysicsBody): boolean => {
  const aLeft = a.x - a.width / 2
  const aRight = a.x + a.width / 2
  const aTop = a.y - a.height / 2
  const aBottom = a.y + a.height / 2

  const bLeft = b.x - b.width / 2
  const bRight = b.x + b.width / 2
  const bTop = b.y - b.height / 2
  const bBottom = b.y + b.height / 2

  return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop
}

// ── Circle 충돌 감지 ──

export const checkCircle = (a: PhysicsBody, b: PhysicsBody): boolean => {
  const ra = a.radius ?? Math.min(a.width, a.height) / 2
  const rb = b.radius ?? Math.min(b.width, b.height) / 2
  const dx = a.x - b.x
  const dy = a.y - b.y
  const distSq = dx * dx + dy * dy
  const sumR = ra + rb
  return distSq < sumR * sumR
}

// ── AABB 충돌 해소 (이동체 vs 정적체) ──
/** @mutates moving — 최소 침투 방향으로 위치/속도를 in-place 보정 */
export const resolveAABB = (
  moving: PhysicsBody,
  static_: PhysicsBody,
): CollisionResult => {
  if (!checkAABB(moving, static_)) {
    return { overlapping: false, separationX: 0, separationY: 0 }
  }

  const mLeft = moving.x - moving.width / 2
  const mRight = moving.x + moving.width / 2
  const mTop = moving.y - moving.height / 2
  const mBottom = moving.y + moving.height / 2

  const sLeft = static_.x - static_.width / 2
  const sRight = static_.x + static_.width / 2
  const sTop = static_.y - static_.height / 2
  const sBottom = static_.y + static_.height / 2

  // 4방향 침투 깊이
  const overlapLeft = mRight - sLeft
  const overlapRight = sRight - mLeft
  const overlapTop = mBottom - sTop
  const overlapBottom = sBottom - mTop

  // 최소 침투 방향으로 분리
  const minX = overlapLeft < overlapRight ? -overlapLeft : overlapRight
  const minY = overlapTop < overlapBottom ? -overlapTop : overlapBottom

  let separationX = 0
  let separationY = 0

  if (Math.abs(minX) < Math.abs(minY)) {
    separationX = minX
  } else {
    separationY = minY
  }

  moving.x += separationX
  moving.y += separationY

  // 분리 방향의 속도 제거
  if (separationX !== 0) moving.vx = 0
  if (separationY !== 0) moving.vy = 0

  return { overlapping: true, separationX, separationY }
}

// ── 부채꼴 (Fan) 충돌 감지 ──
// 플레이어 기본 공격(melee_fan) 판정용

export const checkFanSector = (
  originX: number,
  originY: number,
  facingAngle: number,
  range: number,
  halfAngle: number, // 부채꼴 반각 (라디안)
  targetX: number,
  targetY: number,
): boolean => {
  const dx = targetX - originX
  const dy = targetY - originY
  const distSq = dx * dx + dy * dy

  if (distSq > range * range) return false

  const angleToTarget = Math.atan2(dy, dx)
  const angleDiff = angleWrap(angleToTarget - facingAngle)

  return Math.abs(angleDiff) <= halfAngle
}

// ── 월드 바운드 클램프 ──
/** @mutates body — 월드 경계를 넘으면 위치/속도를 in-place 클램프 */
export const clampToWorldBounds = (
  body: PhysicsBody,
  bounds: WorldBounds,
): void => {
  const halfW = body.width / 2
  const halfH = body.height / 2

  if (body.x - halfW < bounds.x) {
    body.x = bounds.x + halfW
    body.vx = 0
  } else if (body.x + halfW > bounds.x + bounds.width) {
    body.x = bounds.x + bounds.width - halfW
    body.vx = 0
  }

  if (body.y - halfH < bounds.y) {
    body.y = bounds.y + halfH
    body.vy = 0
  } else if (body.y + halfH > bounds.y + bounds.height) {
    body.y = bounds.y + bounds.height - halfH
    body.vy = 0
  }
}

// ── 물리 스텝: velocity → position ──
/** @mutates body — 속도에 따라 위치를 in-place 갱신 */
export const physicsStep = (body: PhysicsBody, deltaSec: number): void => {
  if (body.isStatic) return
  body.x += body.vx * deltaSec
  body.y += body.vy * deltaSec
}

// ── 배열 기반 충돌 처리 ──
/** @mutates moving — 모든 정적체와 순차 충돌 해소. 순서 의존성 있음 (의도된 동작) */
export const resolveAllStaticCollisions = (
  moving: PhysicsBody,
  statics: ReadonlyArray<PhysicsBody>,
): void => {
  for (const s of statics) {
    resolveAABB(moving, s)
  }
}

// ── 수학 유틸 (Phaser.Math 대체) ──

export const distanceBetween = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

export const distanceBetweenSq = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => (x2 - x1) ** 2 + (y2 - y1) ** 2

export const angleBetween = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => Math.atan2(y2 - y1, x2 - x1)

export const angleWrap = (angle: number): number => {
  const TWO_PI = Math.PI * 2
  const a = angle % TWO_PI
  if (a > Math.PI) return a - TWO_PI
  if (a < -Math.PI) return a + TWO_PI
  return a
}

// Phaser.Math.Between 대체 (정수 랜덤)
export const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

// 정규화된 방향 벡터
export const normalizeDirection = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { nx: number; ny: number } => {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return { nx: 0, ny: 0 }
  return { nx: dx / len, ny: dy / len }
}

// lerp
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

// clamp
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))
