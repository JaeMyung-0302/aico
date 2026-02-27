import type { Position, Direction, GameState } from '@wasd/shared'
import { TICK_INTERVAL, PLAYER_SPEED_PER_TICK } from '@wasd/shared'

interface InterpolationState {
  prevPosition: Position
  currentPosition: Position
  lastUpdateTime: number
}

export const createInterpolationState = (
  position: Position,
): InterpolationState => ({
  prevPosition: { ...position },
  currentPosition: { ...position },
  lastUpdateTime: performance.now(),
})

export const updateInterpolationState = (
  state: InterpolationState,
  newPosition: Position,
): InterpolationState => ({
  prevPosition: { ...state.currentPosition },
  currentPosition: { ...newPosition },
  lastUpdateTime: performance.now(),
})

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const directionToDelta = (direction: Direction): Position => {
  switch (direction) {
    case 'up':
      return { x: 0, y: -PLAYER_SPEED_PER_TICK }
    case 'down':
      return { x: 0, y: PLAYER_SPEED_PER_TICK }
    case 'left':
      return { x: -PLAYER_SPEED_PER_TICK, y: 0 }
    case 'right':
      return { x: PLAYER_SPEED_PER_TICK, y: 0 }
  }
}

export const getInterpolatedPosition = (
  state: InterpolationState,
  direction: Direction,
  moving: boolean,
): Position => {
  const elapsed = performance.now() - state.lastUpdateTime
  const t = elapsed / TICK_INTERVAL

  if (t <= 1) {
    return {
      x: lerp(state.prevPosition.x, state.currentPosition.x, clamp(t, 0, 1)),
      y: lerp(state.prevPosition.y, state.currentPosition.y, clamp(t, 0, 1)),
    }
  }

  // 외삽: 서버 응답 대기 중 현재 방향으로 예측 이동
  if (!moving) return state.currentPosition

  const extraTicks = clamp(t - 1, 0, 2)
  const delta = directionToDelta(direction)
  return {
    x: state.currentPosition.x + delta.x * extraTicks,
    y: state.currentPosition.y + delta.y * extraTicks,
  }
}

export const shouldResetInterpolation = (
  prev: GameState | null,
  current: GameState,
): boolean => {
  if (!prev) return true
  if (prev.stage !== current.stage) return true
  if (prev.deaths !== current.deaths) return true
  return false
}
