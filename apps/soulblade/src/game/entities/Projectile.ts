import Phaser from 'phaser'
import { PROJECTILE_TEXTURE } from '../texture-keys'

export interface ProjectileConfig {
  readonly speed: number
  readonly damage: number
  readonly piercing: boolean
  readonly lifetime: number // ms
}

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage: number
  piercing: boolean
  private lifetimeTimer: number

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, PROJECTILE_TEXTURE)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.damage = 0
    this.piercing = false
    this.lifetimeTimer = 0
    this.setDepth(8)
    this.setActive(false)
    this.setVisible(false)
  }

  fire = (
    x: number,
    y: number,
    angle: number,
    config: ProjectileConfig,
  ): void => {
    this.setPosition(x, y)
    this.setRotation(angle)
    this.damage = config.damage
    this.piercing = config.piercing
    this.lifetimeTimer = config.lifetime

    this.setActive(true)
    this.setVisible(true)
    if (this.body) this.body.enable = true

    this.setVelocity(
      Math.cos(angle) * config.speed,
      Math.sin(angle) * config.speed,
    )
  }

  update = (_time: number, delta: number): void => {
    if (!this.active) return

    this.lifetimeTimer -= delta
    if (this.lifetimeTimer <= 0) {
      this.deactivate()
      return
    }

    // 화면 밖 체크
    const bounds = this.scene.physics.world.bounds
    if (
      this.x < bounds.x - 50 ||
      this.x > bounds.x + bounds.width + 50 ||
      this.y < bounds.y - 50 ||
      this.y > bounds.y + bounds.height + 50
    ) {
      this.deactivate()
    }
  }

  onHit = (): void => {
    if (!this.piercing) {
      this.deactivate()
    }
  }

  private deactivate(): void {
    this.setActive(false)
    this.setVisible(false)
    this.setVelocity(0, 0)
    if (this.body) this.body.enable = false
  }
}
