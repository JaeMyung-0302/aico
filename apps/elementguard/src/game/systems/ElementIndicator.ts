import Phaser from 'phaser'
import type { Element, FusionElement } from '@/types'
import { getElementMultiplier, getFusionElementMultiplier, ELEMENT_COLORS, FUSION_COLORS } from '@/game/systems/ElementSystem'

interface IndicatorLabel {
  text: Phaser.GameObjects.Text
  bg: Phaser.GameObjects.Rectangle
}

// 드래그 중인 유닛의 속성 상성을 적에게 시각적으로 표시
export class ElementIndicator {
  private scene: Phaser.Scene
  private indicators: IndicatorLabel[] = []
  private isActive = false

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  // 드래그 시작 시 호출 — 현재 적들에 대한 상성 표시
  show(attackerElement: Element, attackerFusion?: FusionElement, enemyPositions: { x: number; y: number; element: Element }[] = []) {
    this.hide()
    this.isActive = true

    for (const enemy of enemyPositions) {
      const multiplier = attackerFusion
        ? getFusionElementMultiplier(attackerFusion, enemy.element)
        : getElementMultiplier(attackerElement, enemy.element)

      if (multiplier === 1.0) continue // 상성 없으면 표시 안 함

      const label = this.createLabel(enemy.x, enemy.y - 30, multiplier, attackerElement, attackerFusion)
      this.indicators.push(label)
    }
  }

  hide() {
    this.isActive = false
    for (const ind of this.indicators) {
      ind.text.destroy()
      ind.bg.destroy()
    }
    this.indicators = []
  }

  private createLabel(x: number, y: number, multiplier: number, element: Element, fusion?: FusionElement): IndicatorLabel {
    const isAdvantage = multiplier > 1.0
    const displayText = isAdvantage ? `x${multiplier.toFixed(1)} ▲` : `x${multiplier.toFixed(1)} ▼`
    const color = isAdvantage ? '#44ff44' : '#ff4444'
    const bgColor = fusion ? (FUSION_COLORS[fusion] ?? 0x333333) : (ELEMENT_COLORS[element] ?? 0x333333)

    const bg = this.scene.add.rectangle(x, y, 60, 20, bgColor, 0.7)
    bg.setOrigin(0.5)
    bg.setDepth(150)

    const text = this.scene.add.text(x, y, displayText, {
      fontSize: '11px',
      color,
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    })
    text.setOrigin(0.5)
    text.setDepth(151)

    // 페이드인 애니메이션
    bg.setAlpha(0)
    text.setAlpha(0)
    this.scene.tweens.add({
      targets: [bg, text],
      alpha: 1,
      duration: 200,
    })

    return { text, bg }
  }

  getIsActive(): boolean {
    return this.isActive
  }

  destroy() {
    this.hide()
  }
}
