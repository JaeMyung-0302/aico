import { TILE_SIZE } from '@wasd/shared'
import type { StageTheme } from './types'

export const renderWall = (
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
