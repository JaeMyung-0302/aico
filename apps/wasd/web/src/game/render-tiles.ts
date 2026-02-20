import type { TileMap } from '@wasd/shared'
import { TileType, TILE_SIZE } from '@wasd/shared'
import type { StageTheme } from './types'

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

const renderWall = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: StageTheme,
) => {
  ctx.save()
  ctx.fillStyle = theme.wall
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)

  ctx.strokeStyle = theme.wallBorder
  ctx.lineWidth = 1

  switch (theme.name) {
    case 'Forest':
      // 나무 판자 — 가로 4줄 + 나뭇결
      for (let i = 1; i < 4; i++) {
        const ly = y + (TILE_SIZE / 4) * i
        ctx.beginPath()
        ctx.moveTo(x, ly)
        ctx.lineTo(x + TILE_SIZE, ly)
        ctx.stroke()
      }
      // 나뭇결 (작은 곡선)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.beginPath()
      ctx.arc(x + 10, y + 8, 4, 0, Math.PI)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x + 22, y + 22, 3, Math.PI, Math.PI * 2)
      ctx.stroke()
      break
    case 'Cave':
      // 크리스탈/바위 — 대각 균열
      ctx.beginPath()
      ctx.moveTo(x + 6, y)
      ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE / 2)
      ctx.lineTo(x + TILE_SIZE - 4, y + TILE_SIZE)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + TILE_SIZE, y + 8)
      ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE / 2)
      ctx.stroke()
      // 크리스탈 반짝임
      ctx.fillStyle = 'rgba(110,168,215,0.08)'
      ctx.fillRect(x + 4, y + 4, 6, 6)
      break
    case 'Volcano':
      // 용암 균열 — 붉은 균열선
      ctx.strokeStyle = '#ff4500'
      ctx.globalAlpha = 0.3
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x + 4, y + 2)
      ctx.lineTo(x + 14, y + 16)
      ctx.lineTo(x + 8, y + 30)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + 20, y + 6)
      ctx.lineTo(x + 26, y + 20)
      ctx.stroke()
      ctx.globalAlpha = 1
      // 열기 하이라이트
      ctx.fillStyle = 'rgba(255,69,0,0.06)'
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      break
    case 'Desert':
      // 사암 블록 — 큰 벽돌 (2단)
      ctx.beginPath()
      ctx.moveTo(x, y + TILE_SIZE / 2)
      ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2)
      ctx.stroke()
      // 세로 분할 (상단 중앙, 하단 1/3·2/3)
      ctx.beginPath()
      ctx.moveTo(x + TILE_SIZE / 2, y)
      ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + TILE_SIZE / 3, y + TILE_SIZE / 2)
      ctx.lineTo(x + TILE_SIZE / 3, y + TILE_SIZE)
      ctx.stroke()
      // 모래 질감
      ctx.fillStyle = 'rgba(240,192,64,0.04)'
      ctx.fillRect(x, y, TILE_SIZE, 2)
      ctx.fillRect(x, y + TILE_SIZE / 2, TILE_SIZE, 2)
      break
    case 'Abyss':
      // 어둠 에너지 — 대각 격자 + 보라 글로우
      ctx.strokeStyle = theme.wallBorder
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + TILE_SIZE, y)
      ctx.lineTo(x, y + TILE_SIZE)
      ctx.stroke()
      // 보라 글로우
      ctx.fillStyle = 'rgba(180,77,255,0.06)'
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
      break
    default:
      // 기본 벽돌 패턴
      ctx.beginPath()
      ctx.moveTo(x, y + TILE_SIZE / 2)
      ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x + TILE_SIZE / 2, y)
      ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE / 2)
      ctx.stroke()
      break
  }

  // 상단 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  ctx.fillRect(x, y, TILE_SIZE, 2)
  ctx.restore()
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
