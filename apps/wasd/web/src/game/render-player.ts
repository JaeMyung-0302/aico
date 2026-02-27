import type { Position, Direction } from '@wasd/shared'
import { PLAYER_SIZE } from '@wasd/shared'

const BODY_RADIUS = 7
const EYE_RADIUS = 1.5
const PLAYER_COLOR = '#00d4ff'
const PLAYER_OUTLINE = '#0099cc'
const EYE_COLOR = '#ffffff'
const PUPIL_COLOR = '#1a1a2e'

// 방향별 눈 오프셋 (cx 기준)
const EYE_OFFSETS: Record<
  Direction,
  { lx: number; ly: number; rx: number; ry: number }
> = {
  right: { lx: 1, ly: -2.5, rx: 1, ry: 0.5 },
  left: { lx: -1, ly: -2.5, rx: -1, ry: 0.5 },
  up: { lx: -2.5, ly: -2, rx: 2.5, ry: -2 },
  down: { lx: -2.5, ly: 1, rx: 2.5, ry: 1 },
}

export const renderPlayer = (
  ctx: CanvasRenderingContext2D,
  position: Position,
  direction: Direction,
  moving: boolean,
  timestamp: number,
) => {
  const cx = position.x + PLAYER_SIZE / 2
  const cy = position.y + PLAYER_SIZE / 2

  // idle bounce
  const bounceY = moving ? 0 : Math.sin(timestamp * 0.003) * 1.5

  // squash/stretch 이동 시
  const scaleX = moving ? 0.92 : 1
  const scaleY = moving ? 1.08 : 1

  ctx.save()
  ctx.translate(cx, cy + bounceY)
  ctx.scale(scaleX, scaleY)

  // 이동 시 잔상 글로우
  if (moving) {
    ctx.globalAlpha = 0.15
    ctx.fillStyle = PLAYER_COLOR
    ctx.beginPath()
    ctx.arc(0, 0, BODY_RADIUS + 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(0, BODY_RADIUS - 1, BODY_RADIUS * 0.8, 2, 0, 0, Math.PI * 2)
  ctx.fill()

  // 몸통 (원)
  ctx.fillStyle = PLAYER_COLOR
  ctx.beginPath()
  ctx.arc(0, 0, BODY_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  // 몸통 아웃라인
  ctx.strokeStyle = PLAYER_OUTLINE
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 몸통 하이라이트 (상단)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath()
  ctx.arc(-2, -3, 3, 0, Math.PI * 2)
  ctx.fill()

  // 눈
  const eyes = EYE_OFFSETS[direction]

  // 눈 깜빡임: 3초 주기, 100ms 동안
  const blinkCycle = timestamp % 3000
  const isBlinking = blinkCycle > 2900

  const eyeScaleY = isBlinking ? 0.2 : 1

  // 왼쪽 눈
  renderEye(ctx, eyes.lx, eyes.ly, eyeScaleY)
  // 오른쪽 눈
  renderEye(ctx, eyes.rx, eyes.ry, eyeScaleY)

  ctx.restore()
}

const renderEye = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scaleY: number,
) => {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, scaleY)

  // 흰자
  ctx.fillStyle = EYE_COLOR
  ctx.beginPath()
  ctx.arc(0, 0, EYE_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  // 동공
  ctx.fillStyle = PUPIL_COLOR
  ctx.beginPath()
  ctx.arc(0.3, 0.3, EYE_RADIUS * 0.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}
