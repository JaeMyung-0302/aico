import Phaser from 'phaser'
import type { PlacedUnit, UnitGrade } from '@/types'
import { getUnitById } from '@/game/data/units'
import { TEXTURE_KEYS } from '@/game/constants/texture-keys'

// 등급별 테두리 색상
const GRADE_BORDER_COLORS: Record<UnitGrade, number> = {
  1: 0xaaaaaa,
  2: 0x44ff44,
  3: 0x4488ff,
  4: 0xaa44ff,
  5: 0xff8800,
}

export class UnitEntity extends Phaser.GameObjects.Container {
  readonly placedUnit: PlacedUnit
  private sprite: Phaser.GameObjects.Image
  private gradeText: Phaser.GameObjects.Text
  private border: Phaser.GameObjects.Rectangle
  private rangeCircle: Phaser.GameObjects.Graphics | null = null

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    placedUnit: PlacedUnit,
    size: number,
  ) {
    super(scene, x, y)
    this.placedUnit = placedUnit

    const unitData = getUnitById(placedUnit.unitDataId)

    // 테두리 (등급별 색상)
    const borderColor = GRADE_BORDER_COLORS[placedUnit.grade]
    this.border = scene.add.rectangle(0, 0, size - 4, size - 4)
    this.border.setStrokeStyle(2, borderColor, 1)
    this.border.setFillStyle(0x000000, 0)
    this.add(this.border)

    // 유닛 스프라이트
    const textureKey = placedUnit.fusionElement
      ? TEXTURE_KEYS.fusion(placedUnit.fusionElement)
      : TEXTURE_KEYS.unit(unitData?.element ?? 'fire')

    this.sprite = scene.add.image(0, 0, textureKey)
    this.sprite.setDisplaySize(size * 0.6, size * 0.6)
    this.add(this.sprite)

    // 등급 텍스트
    const stars = '★'.repeat(placedUnit.grade)
    this.gradeText = scene.add.text(0, size * 0.3, stars, {
      fontSize: '10px',
      color: '#ffdd00',
      fontFamily: 'sans-serif',
    })
    this.gradeText.setOrigin(0.5, 0.5)
    this.add(this.gradeText)

    // 드래그 가능
    this.setSize(size - 4, size - 4)
    this.setInteractive({ draggable: true })

    scene.add.existing(this)
  }

  showRange(range: number, slotSize: number) {
    this.hideRange()
    const radius = range * slotSize
    this.rangeCircle = this.scene.add.graphics()
    this.rangeCircle.fillStyle(0x44ff88, 0.1)
    this.rangeCircle.fillCircle(0, 0, radius)
    this.rangeCircle.lineStyle(1, 0x44ff88, 0.4)
    this.rangeCircle.strokeCircle(0, 0, radius)
    this.addAt(this.rangeCircle, 0)
  }

  hideRange() {
    if (this.rangeCircle) {
      this.rangeCircle.destroy()
      this.rangeCircle = null
    }
  }

  // 공격 애니메이션: 스케일 펄스 + 회전 + 발광
  playAttackAnimation() {
    this.sprite.setTint(0xffffff)
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.sprite.scaleX * 1.3,
      scaleY: this.sprite.scaleY * 1.3,
      angle: 15,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        this.sprite.clearTint()
        this.sprite.setAngle(0)
      },
    })
  }

  // 합치기 성공 애니메이션: 확대 + 플래시 파티클
  playMergeAnimation(onComplete?: () => void) {
    // 방사형 파티클
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const particle = this.scene.add.circle(
        this.x, this.y, 4, 0xffff88, 1,
      )
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 25,
        y: this.y + Math.sin(angle) * 25,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      })
    }

    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      yoyo: true,
      onComplete: () => onComplete?.(),
    })
  }

  updateGrade(grade: UnitGrade) {
    const stars = '★'.repeat(grade)
    this.gradeText.setText(stars)
    const borderColor = GRADE_BORDER_COLORS[grade]
    this.border.setStrokeStyle(2, borderColor, 1)
  }

  destroy(fromScene?: boolean) {
    this.hideRange()
    super.destroy(fromScene)
  }
}
