import Phaser from 'phaser'
import type { Element } from '@/types'
import { TEXTURE_KEYS } from '@/game/constants/texture-keys'
import { HERO_BASE_STATS } from '@/game/data/hero-skills'

// 히어로 엔티티 (독립 — UnitEntity 미상속)
export class HeroEntity extends Phaser.GameObjects.Container {
  readonly element: Element
  currentHp: number
  maxHp: number
  isDead = false

  private sprite: Phaser.GameObjects.Image
  private hpBarBg: Phaser.GameObjects.Rectangle
  private hpBarFill: Phaser.GameObjects.Rectangle
  private isDragging = false
  private onPointerMove: (pointer: Phaser.Input.Pointer) => void = () => {}
  private onPointerUp: () => void = () => {}

  constructor(scene: Phaser.Scene, x: number, y: number, element: Element) {
    super(scene, x, y)
    this.element = element
    this.maxHp = HERO_BASE_STATS.maxHp
    this.currentHp = this.maxHp

    // 히어로 스프라이트 (36x36)
    this.sprite = scene.add.image(0, 0, TEXTURE_KEYS.hero(element))
    this.sprite.setDisplaySize(36, 36)
    this.add(this.sprite)

    // HP 바
    const barWidth = 40
    const barHeight = 4
    const barY = -22

    this.hpBarBg = scene.add.rectangle(0, barY, barWidth, barHeight, 0x333333)
    this.add(this.hpBarBg)

    this.hpBarFill = scene.add.rectangle(0, barY, barWidth, barHeight, 0x44ff44)
    this.add(this.hpBarFill)

    // 포인터 이벤트 (드래그 이동 — unit의 draggable과 충돌 방지)
    this.setSize(40, 40)
    this.setInteractive()
    this.setupPointerEvents()

    scene.add.existing(this)
  }

  private setupPointerEvents() {
    this.on('pointerdown', () => {
      if (this.isDead) return
      this.isDragging = true
    })

    this.onPointerMove = (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isDead) return
      const { width, height } = this.scene.scale
      const clampedX = Phaser.Math.Clamp(pointer.x, 20, width - 20)
      const clampedY = Phaser.Math.Clamp(pointer.y, 20, height - 20)
      this.setPosition(clampedX, clampedY)
    }
    this.scene.input.on('pointermove', this.onPointerMove)

    this.onPointerUp = () => { this.isDragging = false }
    this.scene.input.on('pointerup', this.onPointerUp)
  }

  takeDamage(amount: number): boolean {
    if (this.isDead) return false
    this.currentHp = Math.max(0, this.currentHp - amount)
    this.updateHpBar()

    // 피격 플래시
    this.sprite.setTint(0xff4444)
    this.scene.tweens.add({
      targets: this,
      x: this.x + 3,
      duration: 40,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.sprite.clearTint(),
    })

    if (this.currentHp <= 0) {
      this.isDead = true
      this.playDeathAnimation()
      return true
    }
    return false
  }

  private updateHpBar() {
    const ratio = this.currentHp / this.maxHp
    const fullWidth = this.hpBarBg.width
    this.hpBarFill.width = fullWidth * ratio
    this.hpBarFill.x = -(fullWidth * (1 - ratio)) / 2

    if (ratio > 0.5) {
      this.hpBarFill.setFillStyle(0x44ff44)
    } else if (ratio > 0.25) {
      this.hpBarFill.setFillStyle(0xffff44)
    } else {
      this.hpBarFill.setFillStyle(0xff4444)
    }
  }

  private playDeathAnimation() {
    // 파티클 분해
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8
      const particle = this.scene.add.circle(
        this.x + Math.cos(angle) * 4,
        this.y + Math.sin(angle) * 4,
        4, 0xffffff, 0.8,
      )
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 24,
        y: this.y + Math.sin(angle) * 24,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      })
    }

    // 페이드아웃
    this.scene.tweens.add({
      targets: this,
      alpha: 0.2,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 300,
    })

    this.disableInteractive()
  }

  heal(amount: number) {
    if (this.isDead) return
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount)
    this.updateHpBar()
  }

  revive() {
    this.isDead = false
    this.currentHp = this.maxHp
    this.updateHpBar()
    this.setAlpha(1)
    this.setScale(1)
    this.setInteractive()

    // 부활 이펙트
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      yoyo: true,
    })
  }

  destroy(fromScene?: boolean) {
    this.scene.input.off('pointermove', this.onPointerMove)
    this.scene.input.off('pointerup', this.onPointerUp)
    super.destroy(fromScene)
  }
}
