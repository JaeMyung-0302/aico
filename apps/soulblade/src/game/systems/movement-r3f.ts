/**
 * R3F용 이동 시스템
 * Phaser movement.ts 대체 — 순수 함수 (Phaser 의존성 0)
 *
 * PhysicsBody.vx/vy에 속도를 설정하고,
 * 실제 위치 갱신은 physicsStep()에서 처리
 */

import type { PhysicsBody } from '../types'

interface JoystickInput {
  readonly x: number
  readonly y: number
}

const BASE_SPEED = 150

/**
 * 조이스틱 입력 → PhysicsBody 속도 설정
 * @mutates body — vx, vy를 직접 설정
 */
export const applyMovementR3F = (
  body: PhysicsBody,
  joystick: JoystickInput,
  spdStat: number,
): void => {
  const speed = BASE_SPEED + spdStat * 5

  if (joystick.x === 0 && joystick.y === 0) {
    body.vx = 0
    body.vy = 0
    return
  }

  // 대각선 이동 정규화
  const magnitude = Math.sqrt(joystick.x * joystick.x + joystick.y * joystick.y)
  const nx = joystick.x / magnitude
  const ny = joystick.y / magnitude

  body.vx = nx * speed
  body.vy = ny * speed
}
