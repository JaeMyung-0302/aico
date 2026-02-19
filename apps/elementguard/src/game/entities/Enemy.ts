import Phaser from 'phaser'
import type { EnemyData } from '@/types'
import { TEXTURE_KEYS } from '@/game/constants/texture-keys'

export class EnemyEntity extends Phaser.GameObjects.Container {
  readonly enemyData: EnemyData
  currentHp: number
  maxHp: number
  speed: number
  private sprite: Phaser.GameObjects.Image
  private hpBarBg: Phaser.GameObjects.Rectangle
  private hpBarFill: Phaser.GameObjects.Rectangle
  private pathIndex = 0
  isDead = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyData: EnemyData,
    scaledHp: number,
  ) {
    super(scene, x, y)
    this.enemyData = enemyData
    this.maxHp = scaledHp
    this.currentHp = scaledHp
    this.speed = enemyData.speed

    // 스프라이트
    const textureKey = enemyData.type === 'boss'
      ? TEXTURE_KEYS.boss(enemyData.element)
      : TEXTURE_KEYS.enemy(enemyData.element)

    const size = enemyData.type === 'boss' ? 40 : 24
    this.sprite = scene.add.image(0, 0, textureKey)
    this.sprite.setDisplaySize(size, size)
    this.add(this.sprite)

    // HP 바
    const barWidth = size + 8
    const barHeight = 4
    const barY = -size / 2 - 6

    this.hpBarBg = scene.add.rectangle(0, barY, barWidth, barHeight, 0x333333)
    this.add(this.hpBarBg)

    this.hpBarFill = scene.add.rectangle(0, barY, barWidth, barHeight, 0x44ff44)
    this.add(this.hpBarFill)

    scene.add.existing(this)
  }

  takeDamage(amount: number): boolean {
    this.currentHp = Math.max(0, this.currentHp - amount)
    this.updateHpBar()

    // 피격 이펙트: 흰색 플래시 + 흔들림
    this.sprite.setTint(0xffffff)
    this.scene.tweens.add({
      targets: this,
      x: this.x + 2,
      duration: 30,
      yoyo: true,
      repeat: 1,
      onComplete: () => this.sprite.clearTint(),
    })

    if (this.currentHp <= 0) {
      this.isDead = true
      return true
    }
    return false
  }

  private updateHpBar() {
    const ratio = this.currentHp / this.maxHp
    const fullWidth = this.hpBarBg.width
    this.hpBarFill.width = fullWidth * ratio
    this.hpBarFill.x = -(fullWidth * (1 - ratio)) / 2

    // 색상 변경 (초록 → 노랑 → 빨강)
    if (ratio > 0.5) {
      this.hpBarFill.setFillStyle(0x44ff44)
    } else if (ratio > 0.25) {
      this.hpBarFill.setFillStyle(0xffff44)
    } else {
      this.hpBarFill.setFillStyle(0xff4444)
    }
  }

  // 경로를 따라 이동
  moveAlongPath(path: Phaser.Math.Vector2[], delta: number): boolean {
    if (this.pathIndex >= path.length) return true // 끝 도달

    const target = path[this.pathIndex]
    if (!target) return true

    const dx = target.x - this.x
    const dy = target.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = (this.speed * delta) / 1000

    if (dist <= step) {
      this.setPosition(target.x, target.y)
      this.pathIndex++
      return this.pathIndex >= path.length
    }

    this.x += (dx / dist) * step
    this.y += (dy / dist) * step
    return false
  }

  playDeathAnimation(onComplete?: () => void) {
    // 파티클 분해 효과
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6
      const particle = this.scene.add.circle(
        this.x + Math.cos(angle) * 4,
        this.y + Math.sin(angle) * 4,
        3, 0xffffff, 0.8,
      )
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 20,
        y: this.y + Math.sin(angle) * 20,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 300,
        onComplete: () => particle.destroy(),
      })
    }

    // 본체 축소 + 페이드
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 250,
      onComplete: () => onComplete?.(),
    })
  }
}
