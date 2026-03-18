import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import { eventBus } from '@/lib/event-bus'

const EMIT_INTERVAL = 200 // ms

export const createPositionEmitter = (sceneName: string) => {
  let lastEmitTime = 0
  let lastTileX = -1
  let lastTileY = -1

  return (sprite: { x: number; y: number }, time: number) => {
    if (time - lastEmitTime < EMIT_INTERVAL) return

    const tileX = Math.floor(sprite.x / GAME_CONSTANTS.TILE_SIZE)
    const tileY = Math.floor(sprite.y / GAME_CONSTANTS.TILE_SIZE)

    if (tileX === lastTileX && tileY === lastTileY) return

    lastTileX = tileX
    lastTileY = tileY
    lastEmitTime = time
    eventBus.emit('player:moved', { scene: sceneName, tileX, tileY })
  }
}
