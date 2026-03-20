import type { TileMap } from '@wasd/shared'
import { TileType, TILE_SIZE } from '@wasd/shared'
import type { StageTheme } from './types'
import { renderWall } from './render-wall'

export const renderTileMap = (
  ctx: CanvasRenderingContext2D,
  tileMap: TileMap,
  collectedCoins: Set<string>,
  theme: StageTheme,
  timestamp: number,
) => {
  for (let row = 0; row < tileMap.length; row++) {
    const tileRow = tileMap[row]
    if (!tileRow) continue
    for (let col = 0; col < tileRow.length; col++) {
      const tile = tileRow[col]
      const x = col * TILE_SIZE
      const y = row * TILE_SIZE

      switch (tile) {
        case TileType.WALL:
          renderWall(ctx, x, y, theme)
          break
        case TileType.COIN: {
          renderFloor(ctx, x, y, theme)
          const key = `${row},${col}`
          if (!collectedCoins.has(key)) {
            renderCoin(ctx, x, y, theme, timestamp)
          }
          break
        }
        case TileType.START:
          renderStart(ctx, x, y, theme, timestamp)
          break
        case TileType.GOAL:
          renderGoal(ctx, x, y, theme, timestamp)
          break
        default:
          renderFloor(ctx, x, y, theme)
          break
      }
    }
  }
}

const renderFloor = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: StageTheme,
) => {
  ctx.fillStyle = theme.floor
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  // 그리드 라인 (바닥 타일 경계)
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'
  ctx.lineWidth = 0.5
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
}

const renderCoin = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: StageTheme,
  timestamp: number,
) => {
  const cx = x + TILE_SIZE / 2
  const cy = y + TILE_SIZE / 2

  // 회전 효과 (수평 스케일을 sin으로 변화 → 3D 회전 느낌)
  const scaleX = 0.5 + 0.5 * Math.abs(Math.cos(timestamp * 0.003))
  const sparkle = 0.7 + 0.3 * Math.sin(timestamp * 0.005)

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(scaleX, 1)

  // 외곽 글로우
  ctx.fillStyle = `rgba(255, 215, 0, ${0.2 * sparkle})`
  ctx.beginPath()
  ctx.arc(0, 0, 8, 0, Math.PI * 2)
  ctx.fill()

  // 메인 코인
  ctx.fillStyle = theme.coin
  ctx.globalAlpha = sparkle
  ctx.beginPath()
  ctx.arc(0, 0, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.arc(-1.5, -1.5, 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

const renderStart = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: StageTheme,
  timestamp: number,
) => {
  renderFloor(ctx, x, y, theme)

  const pulse = 0.2 + 0.15 * Math.sin(timestamp * 0.003)
  ctx.fillStyle = theme.start
  ctx.globalAlpha = pulse
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
  ctx.globalAlpha = 1

  // 시작 표시 화살표 (아래 방향)
  const cx = x + TILE_SIZE / 2
  const cy = y + TILE_SIZE / 2 + Math.sin(timestamp * 0.004) * 2
  ctx.fillStyle = theme.start
  ctx.globalAlpha = 0.8
  ctx.beginPath()
  ctx.moveTo(cx, cy + 4)
  ctx.lineTo(cx - 4, cy - 3)
  ctx.lineTo(cx + 4, cy - 3)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}

const renderGoal = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: StageTheme,
  timestamp: number,
) => {
  renderFloor(ctx, x, y, theme)

  const pulse = 0.25 + 0.2 * Math.sin(timestamp * 0.004)
  ctx.fillStyle = theme.goal
  ctx.globalAlpha = pulse
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
  ctx.globalAlpha = 1

  // 골 표시 (빛나는 별)
  const cx = x + TILE_SIZE / 2
  const cy = y + TILE_SIZE / 2
  const starSize = 4 + Math.sin(timestamp * 0.005) * 1.5

  ctx.fillStyle = theme.goal
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2
    const outerX = cx + Math.cos(angle) * starSize
    const outerY = cy + Math.sin(angle) * starSize
    if (i === 0) ctx.moveTo(outerX, outerY)
    else ctx.lineTo(outerX, outerY)

    const innerAngle = angle + Math.PI / 5
    const innerX = cx + Math.cos(innerAngle) * (starSize * 0.4)
    const innerY = cy + Math.sin(innerAngle) * (starSize * 0.4)
    ctx.lineTo(innerX, innerY)
  }
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}
