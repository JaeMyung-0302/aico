import Phaser from 'phaser'
import type { Element } from '@/types'
import { TEXTURE_KEYS } from '@/game/constants/texture-keys'

export class Projectile extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Image
  private targetX: number
  private targetY: number
  private speed = 300
  private trailTimer = 0
  hasReached = false

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    targetX: number,
    targetY: number,
    element: Element,
  ) {
    super(scene, x, y)
    this.targetX = targetX
    this.targetY = targetY

    this.sprite = scene.add.image(0, 0, TEXTURE_KEYS.projectile(element))
    this.sprite.setDisplaySize(10, 10)
    this.add(this.sprite)

    scene.add.existing(this)
  }

  update(_time: number, delta: number) {
    if (this.hasReached) return

    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = (this.speed * delta) / 1000

    // 트레일 생성 (30ms 간격)
    this.trailTimer += delta
    while (this.trailTimer >= 30) {
      this.trailTimer -= 30
      this.spawnTrail()
    }

    if (dist <= step) {
      this.setPosition(this.targetX, this.targetY)
      this.hasReached = true
      return
    }

    this.x += (dx / dist) * step
    this.y += (dy / dist) * step

    // 이동 방향으로 회전
    this.rotation = Math.atan2(dy, dx)
  }

  private spawnTrail() {
    const trail = this.scene.add.circle(this.x, this.y, 2, 0xffffff, 0.4)
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 150,
      onComplete: () => trail.destroy(),
    })
  }
}
