import type { Position, Direction, Key } from '@wasd/shared'
import { PLAYER_SPEED_PER_TICK } from '@wasd/shared'

const KEY_DIRECTION_MAP: Record<Key, Direction> = {
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
}

export const keyToDirection = (key: Key): Direction => KEY_DIRECTION_MAP[key]

export const applyMovement = (
  position: Position,
  direction: Direction,
): Position => {
  const speed = PLAYER_SPEED_PER_TICK
  switch (direction) {
    case 'up':
      return { x: position.x, y: position.y - speed }
    case 'down':
      return { x: position.x, y: position.y + speed }
    case 'left':
      return { x: position.x - speed, y: position.y }
    case 'right':
      return { x: position.x + speed, y: position.y }
  }
}
