import { useRef, useEffect } from 'react'
import classnames from 'classnames/bind'
import type { CharacterClass } from '@soulblade/shared'
import styles from './ClassPreview.module.scss'

const cx = classnames.bind(styles)

interface ClassPreviewProps {
  readonly classType: CharacterClass
}

const SCALE = 6
const W = 32
const H = 48

// Canvas 2D 헬퍼
const fillCircle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
): void => {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

const fillRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fill()
}

const fillTriangle = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): void => {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x3, y3)
  ctx.closePath()
  ctx.fill()
}

const setFill = (
  ctx: CanvasRenderingContext2D,
  color: number,
  alpha = 1,
): void => {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
}

const setStroke = (
  ctx: CanvasRenderingContext2D,
  width: number,
  color: number,
  alpha = 1,
): void => {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
  ctx.lineWidth = width
}

// --- 클래스별 idle 프레임 그리기 ---

const drawWarrior = (ctx: CanvasRenderingContext2D): void => {
  // 몸체
  setFill(ctx, 0x666666)
  fillCircle(ctx, 16, 8, 7)
  setFill(ctx, 0x888888)
  ctx.fillRect(10, 2, 12, 3)
  setFill(ctx, 0x222222)
  ctx.fillRect(12, 7, 8, 2)
  setFill(ctx, 0x556677)
  fillRoundedRect(ctx, 8, 15, 16, 14, 2)
  setFill(ctx, 0x667788)
  ctx.fillRect(12, 16, 8, 12)
  setFill(ctx, 0x778899)
  fillRoundedRect(ctx, 4, 14, 8, 6, 2)
  fillRoundedRect(ctx, 20, 14, 8, 6, 2)
  setFill(ctx, 0x445566)
  fillRoundedRect(ctx, 3, 20, 6, 10, 1)
  setFill(ctx, 0x8899aa)
  ctx.fillRect(4, 21, 4, 8)
  setFill(ctx, 0x445566)
  fillRoundedRect(ctx, 10, 29, 5, 12, 1)
  fillRoundedRect(ctx, 17, 29, 5, 12, 1)
  setFill(ctx, 0x554433)
  fillRoundedRect(ctx, 9, 38, 7, 5, 1)
  fillRoundedRect(ctx, 16, 38, 7, 5, 1)
  // 무기 (검 수직)
  setFill(ctx, 0x445566)
  fillRoundedRect(ctx, 23, 20, 5, 8, 1)
  setFill(ctx, 0xccccdd)
  ctx.fillRect(25, 12, 2, 14)
  setFill(ctx, 0x886633)
  ctx.fillRect(23, 25, 6, 2)
}

const drawMage = (ctx: CanvasRenderingContext2D): void => {
  // 몸체
  setFill(ctx, 0x443366)
  fillCircle(ctx, 16, 8, 7)
  setFill(ctx, 0x332255)
  fillTriangle(ctx, 10, 4, 16, 0, 22, 4)
  setFill(ctx, 0x221133)
  fillCircle(ctx, 16, 9, 4)
  setFill(ctx, 0xaa88ff, 0.8)
  fillCircle(ctx, 14, 8, 1.5)
  fillCircle(ctx, 18, 8, 1.5)
  setFill(ctx, 0x443366)
  fillTriangle(ctx, 6, 44, 16, 15, 26, 44)
  setFill(ctx, 0x554477)
  ctx.fillRect(13, 16, 6, 10)
  setFill(ctx, 0xaa8833)
  ctx.fillRect(10, 26, 12, 2)
  // 팔 + 지팡이
  setFill(ctx, 0x443366)
  fillRoundedRect(ctx, 5, 20, 5, 8, 1)
  fillRoundedRect(ctx, 22, 20, 5, 8, 1)
  setFill(ctx, 0x886644)
  ctx.fillRect(25, 6, 2, 34)
  setFill(ctx, 0xaa66ff, 0.9)
  fillCircle(ctx, 26, 5, 4)
  setFill(ctx, 0xcc99ff, 0.6)
  fillCircle(ctx, 26, 5, 2)
}

const drawPaladin = (ctx: CanvasRenderingContext2D): void => {
  // 몸체
  setFill(ctx, 0xccaa44)
  fillCircle(ctx, 16, 8, 7)
  setFill(ctx, 0xddbb55)
  fillTriangle(ctx, 6, 6, 10, 0, 12, 8)
  fillTriangle(ctx, 20, 8, 22, 0, 26, 6)
  setFill(ctx, 0x222222)
  ctx.fillRect(12, 7, 8, 2)
  setFill(ctx, 0xddddee, 0.6)
  fillTriangle(ctx, 8, 15, 16, 14, 24, 15)
  fillTriangle(ctx, 5, 42, 16, 15, 27, 42)
  setFill(ctx, 0xccaa44)
  fillRoundedRect(ctx, 8, 15, 16, 14, 2)
  setFill(ctx, 0xeedd66)
  ctx.fillRect(14, 17, 4, 10)
  ctx.fillRect(11, 20, 10, 3)
  setFill(ctx, 0xddbb55)
  fillRoundedRect(ctx, 4, 14, 7, 6, 2)
  fillRoundedRect(ctx, 21, 14, 7, 6, 2)
  setFill(ctx, 0xbbaa44)
  fillRoundedRect(ctx, 4, 20, 5, 9, 1)
  fillRoundedRect(ctx, 10, 29, 5, 11, 1)
  fillRoundedRect(ctx, 17, 29, 5, 11, 1)
  setFill(ctx, 0xaa8833)
  fillRoundedRect(ctx, 9, 38, 7, 5, 1)
  fillRoundedRect(ctx, 16, 38, 7, 5, 1)
  // 무기 (해머)
  setFill(ctx, 0xbbaa44)
  fillRoundedRect(ctx, 23, 20, 5, 9, 1)
  setFill(ctx, 0x887733)
  ctx.fillRect(25, 10, 2, 18)
  setFill(ctx, 0xccaa44)
  ctx.fillRect(22, 8, 8, 5)
}

const drawArcher = (ctx: CanvasRenderingContext2D): void => {
  // 몸체
  setFill(ctx, 0x336633)
  fillCircle(ctx, 16, 8, 6)
  setFill(ctx, 0x447744)
  fillTriangle(ctx, 13, 3, 16, 0, 19, 3)
  setFill(ctx, 0xddbb88)
  fillCircle(ctx, 16, 9, 4)
  setFill(ctx, 0x224422)
  fillCircle(ctx, 14, 8, 1)
  fillCircle(ctx, 18, 8, 1)
  setFill(ctx, 0x557755)
  fillRoundedRect(ctx, 10, 15, 12, 12, 2)
  setFill(ctx, 0x775533)
  ctx.fillRect(10, 25, 12, 2)
  setFill(ctx, 0x336633, 0.5)
  fillTriangle(ctx, 8, 15, 16, 14, 24, 15)
  fillTriangle(ctx, 7, 38, 16, 15, 25, 38)
  setFill(ctx, 0x557755)
  fillRoundedRect(ctx, 6, 17, 4, 8, 1)
  setFill(ctx, 0x664422)
  ctx.fillRect(6, 16, 3, 14)
  setFill(ctx, 0xcccccc)
  ctx.fillRect(6, 14, 1, 4)
  ctx.fillRect(8, 14, 1, 3)
  setFill(ctx, 0x557755)
  fillRoundedRect(ctx, 11, 27, 4, 12, 1)
  fillRoundedRect(ctx, 17, 27, 4, 12, 1)
  setFill(ctx, 0x664422)
  fillRoundedRect(ctx, 10, 37, 6, 5, 1)
  fillRoundedRect(ctx, 16, 37, 6, 5, 1)
  // 무기 (활)
  setFill(ctx, 0x557755)
  fillRoundedRect(ctx, 22, 17, 4, 8, 1)
  setStroke(ctx, 2, 0x886644)
  ctx.beginPath()
  ctx.arc(28, 18, 14, -1.2, 1.2, false)
  ctx.stroke()
  setStroke(ctx, 1, 0xcccccc, 0.8)
  ctx.beginPath()
  ctx.moveTo(28, 5)
  ctx.lineTo(28, 31)
  ctx.stroke()
}

const DRAW_MAP: Record<
  CharacterClass,
  (ctx: CanvasRenderingContext2D) => void
> = {
  Warrior: drawWarrior,
  Mage: drawMage,
  Paladin: drawPaladin,
  Archer: drawArcher,
}

export const ClassPreview = ({ classType }: ClassPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.scale(SCALE, SCALE)

    DRAW_MAP[classType](ctx)

    ctx.restore()
  }, [classType])

  return (
    <div className={cx('preview')}>
      <canvas
        ref={canvasRef}
        width={W * SCALE}
        height={H * SCALE}
        className={cx('canvas')}
      />
    </div>
  )
}
