import type { Player } from '../entities/Player'

// 조이스틱 벡터 (x, y: -1 ~ 1)
interface JoystickVector {
  readonly x: number
  readonly y: number
}

const BASE_SPEED = 150

/**
 * 가상 조이스틱 입력 기반 8방향 이동
 */
export const applyMovement = (
  player: Player,
  joystick: JoystickVector,
): void => {
  const speed = BASE_SPEED + player.spd * 5

  if (joystick.x === 0 && joystick.y === 0) {
    player.setVelocity(0, 0)
    return
  }

  // 정규화 (대각선 속도 보정)
  const magnitude = Math.sqrt(joystick.x * joystick.x + joystick.y * joystick.y)
  const normalizedX = joystick.x / magnitude
  const normalizedY = joystick.y / magnitude

  player.setVelocity(normalizedX * speed, normalizedY * speed)

  // facingAngle 갱신 (공격 방향 결정용)
  player.facingAngle = Math.atan2(normalizedY, normalizedX)

  // 스프라이트 좌우 플립 (렌더링용)
  if (joystick.x < 0) {
    player.setFlipX(true)
  } else if (joystick.x > 0) {
    player.setFlipX(false)
  }
}
