import type { TileMap, Position, GameState } from '@wasd/shared'
import type { EffectsState } from './types'
import { getStageTheme } from './stage-themes'
import { renderTileMap } from './render-tiles'
import { renderPlayer } from './render-player'
import { renderObstacles } from './render-obstacles'
import { renderEffects, applyShakeTransform } from './render-effects'

export const renderFrame = (
  ctx: CanvasRenderingContext2D,
  tileMap: TileMap,
  gameState: GameState,
  renderPosition: Position,
  collectedSet: Set<string>,
  cameraOffset: Position = { x: 0, y: 0 },
  stage: number = 1,
  timestamp: number = 0,
  effects: EffectsState | null = null,
) => {
  const theme = getStageTheme(stage)

  ctx.fillStyle = theme.background
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.save()

  // Screen shake
  if (effects?.shake) {
    applyShakeTransform(ctx, effects.shake)
  }

  ctx.translate(-cameraOffset.x, -cameraOffset.y)

  renderTileMap(ctx, tileMap, collectedSet, theme, timestamp)
  renderObstacles(ctx, gameState.obstacles, theme, timestamp)
  renderPlayer(ctx, renderPosition, gameState.direction, gameState.moving, timestamp)

  // Particles (camera space)
  if (effects) {
    renderEffects(ctx, effects)
  }

  ctx.restore()
}
