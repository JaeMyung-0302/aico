import Phaser from 'phaser'
import type { PlacedUnit } from '@/types'
import { getUnitById } from '@/game/data/units'
import { countAdjacentSameElement } from '@/game/systems/SynergySystem'
import { ELEMENT_COLORS } from '@/game/systems/ElementSystem'

interface AuraEffect {
  circle: Phaser.GameObjects.Ellipse
  position: { row: number; col: number }
}

// 시너지 활성화된 유닛에 오라 이펙트 표시
export class SynergyVisual {
  private scene: Phaser.Scene
  private auras: AuraEffect[] = []
  private getSlotWorldPosition: (pos: { row: number; col: number }) => { x: number; y: number } | null
  private slotSize: number

  constructor(
    scene: Phaser.Scene,
    getSlotWorldPosition: (pos: { row: number; col: number }) => { x: number; y: number } | null,
    slotSize: number,
  ) {
    this.scene = scene
    this.getSlotWorldPosition = getSlotWorldPosition
    this.slotSize = slotSize
  }

  // 배치 변경 시 호출하여 시너지 표시 갱신
  update(placedUnits: PlacedUnit[]) {
    this.clearAuras()

    for (const unit of placedUnits) {
      const unitData = getUnitById(unit.unitDataId)
      const element = unitData?.element ?? 'fire'

      const adjacentCount = countAdjacentSameElement(unit, placedUnits)
      if (adjacentCount < 3) continue

      const worldPos = this.getSlotWorldPosition(unit.position)
      if (!worldPos) continue

      const color = ELEMENT_COLORS[element] ?? 0xffffff
      this.createAura(worldPos.x, worldPos.y, unit.position, color)
    }
  }

  private createAura(x: number, y: number, position: { row: number; col: number }, color: number) {
    const radius = this.slotSize * 0.55
    const circle = this.scene.add.ellipse(x, y, radius * 2, radius * 2, color, 0.15)
    circle.setStrokeStyle(1.5, color, 0.4)
    circle.setDepth(5)

    // 맥동 애니메이션
    this.scene.tweens.add({
      targets: circle,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.08,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.auras.push({ circle, position })
  }

  private clearAuras() {
    for (const aura of this.auras) {
      this.scene.tweens.killTweensOf(aura.circle)
      aura.circle.destroy()
    }
    this.auras = []
  }

  destroy() {
    this.clearAuras()
  }
}
