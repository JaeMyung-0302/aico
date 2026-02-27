import Phaser from 'phaser'

/**
 * 몬스터 HP 바 시스템
 * Graphics 기반 실시간 렌더링 + LOD 대응
 */

export interface HpBarConfig {
  readonly width: number
  readonly height: number
  readonly yOffset: number
  readonly showBorder: boolean
  readonly borderColor?: number
}

// 사전 할당 RGB 튜플 (매 프레임 GC 압력 방지, 객체 할당 0)
const GREEN = [0, 200, 0] as const
const YELLOW = [255, 255, 0] as const
const RED = [200, 0, 0] as const

// HP 비율에 따른 색상 보간: green(100%) → yellow(50%) → red(0%)
const lerp = (a: number, b: number, t: number): number =>
  Math.floor(a + (b - a) * t)

const getHpColor = (percent: number): number => {
  if (percent > 0.5) {
    const t = (percent - 0.5) * 2
    return Phaser.Display.Color.GetColor(
      lerp(YELLOW[0], GREEN[0], t),
      lerp(YELLOW[1], GREEN[1], t),
      lerp(YELLOW[2], GREEN[2], t),
    )
  }
  const t = percent * 2
  return Phaser.Display.Color.GetColor(
    lerp(RED[0], YELLOW[0], t),
    lerp(RED[1], YELLOW[1], t),
    lerp(RED[2], YELLOW[2], t),
  )
}

export const createHpBar = (
  scene: Phaser.Scene,
  config: HpBarConfig,
): Phaser.GameObjects.Graphics => {
  const bar = scene.add.graphics()
  bar.setDepth(18)
  bar.setAlpha(0) // 기본 숨김 (피격 시 표시)
  return bar
}

export const updateHpBar = (
  bar: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  hpPercent: number,
  config: HpBarConfig,
): void => {
  bar.clear()

  const barX = x - config.width / 2
  const barY = y + config.yOffset

  // 외곽선 (elite용)
  if (config.showBorder) {
    bar.fillStyle(config.borderColor ?? 0x000000, 0.8)
    bar.fillRect(barX - 1, barY - 1, config.width + 2, config.height + 2)
  }

  // 배경 (검정)
  bar.fillStyle(0x000000, 0.6)
  bar.fillRect(barX, barY, config.width, config.height)

  // HP 바 (색상 보간)
  const clampedPercent = Phaser.Math.Clamp(hpPercent, 0, 1)
  const fillWidth = config.width * clampedPercent
  if (fillWidth > 0) {
    bar.fillStyle(getHpColor(clampedPercent), 1)
    bar.fillRect(barX, barY, fillWidth, config.height)
  }
}

export const destroyHpBar = (bar: Phaser.GameObjects.Graphics | null): void => {
  if (bar && bar.scene) {
    bar.destroy()
  }
}
