import type { Obstacle } from '@wasd/shared'
import type { StageTheme } from './types'

const isLargeObstacle = (obs: Obstacle): boolean =>
  obs.size.width > 16 || obs.size.height > 16

export const renderObstacles = (
  ctx: CanvasRenderingContext2D,
  obstacles: Obstacle[],
  theme: StageTheme,
  timestamp: number,
) => {
  for (const obs of obstacles) {
    ctx.save()
    const large = isLargeObstacle(obs)
    const { x, y } = obs.position
    const { width, height } = obs.size

    // 위험 글로우 (펄스)
    const glowAlpha = 0.15 + 0.1 * Math.sin(timestamp * 0.004)
    const fillColor = large ? theme.obstacleLarge : theme.obstacle
    const borderColor = large ? theme.obstacleLargeBorder : theme.obstacleBorder

    // 글로우 후광
    ctx.fillStyle = fillColor
    ctx.globalAlpha = glowAlpha
    ctx.fillRect(x - 2, y - 2, width + 4, height + 4)
    ctx.globalAlpha = 1

    // 메인 바디
    ctx.fillStyle = fillColor
    ctx.fillRect(x, y, width, height)

    // X 위험 패턴
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 2, y + 2)
    ctx.lineTo(x + width - 2, y + height - 2)
    ctx.moveTo(x + width - 2, y + 2)
    ctx.lineTo(x + 2, y + height - 2)
    ctx.stroke()

    // 테두리
    ctx.strokeStyle = borderColor
    ctx.lineWidth = large ? 2 : 1
    ctx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1)
    ctx.restore()
  }
}
