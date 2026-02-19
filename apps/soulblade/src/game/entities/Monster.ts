import Phaser from 'phaser'

export interface MonsterConfig {
  readonly hp: number
  readonly atk: number
  readonly def: number
  readonly spd: number
  readonly level: number
  readonly expReward: number
  readonly goldReward: number
}

export class Monster extends Phaser.Physics.Arcade.Sprite {
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  level: number
  expReward: number
  goldReward: number

  // 상태 효과
  slowMultiplier = 0
  private dotDamage = 0
  private dotTimer = 0
  private dotTickTimer = 0

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: MonsterConfig,
  ) {
    super(scene, x, y, 'monster')

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.hp = config.hp
    this.maxHp = config.hp
    this.atk = config.atk
    this.def = config.def
    this.spd = config.spd
    this.level = config.level
    this.expReward = config.expReward
    this.goldReward = config.goldReward

    this.setCollideWorldBounds(true)
    this.setDepth(5)
  }

  // AI: 플레이어 추적 (slow 적용)
  chasePlayer = (playerX: number, playerY: number): void => {
    if (!this.active) return

    const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY)
    const baseSpeed = 50 + this.spd * 10
    const speed = baseSpeed * (1 - this.slowMultiplier)

    this.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
    )
  }

  takeDamage = (amount: number): boolean => {
    this.hp -= amount

    // 피격 플래시
    this.setTint(0xff0000)
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint()
    })

    if (this.hp <= 0) {
      this.die()
      return true
    }
    return false
  }

  // DoT 적용 (화상 등)
  applyDot = (damage: number, durationMs: number): void => {
    this.dotDamage = damage
    this.dotTimer = durationMs
    this.dotTickTimer = 0
  }

  // 슬로우 적용
  applySlow = (percent: number): void => {
    this.slowMultiplier = Math.min(percent, 0.8) // 최대 80% 감속
  }

  // 매 프레임 효과 업데이트
  updateEffects = (delta: number): void => {
    // DoT 처리 (1초마다 틱)
    if (this.dotTimer > 0) {
      this.dotTimer -= delta
      this.dotTickTimer += delta
      if (this.dotTickTimer >= 1000) {
        this.dotTickTimer -= 1000
        this.takeDamage(this.dotDamage)
      }
      if (this.dotTimer <= 0) {
        this.dotDamage = 0
        this.dotTickTimer = 0
      }
    }

  }

  private die(): void {
    this.setActive(false)
    this.setVisible(false)
    if (this.body) this.body.enable = false
  }

  // Object Pool 재활용
  reset = (x: number, y: number, config: MonsterConfig): void => {
    this.setPosition(x, y)
    this.hp = config.hp
    this.maxHp = config.hp
    this.atk = config.atk
    this.def = config.def
    this.spd = config.spd
    this.level = config.level
    this.expReward = config.expReward
    this.goldReward = config.goldReward
    this.slowMultiplier = 0
    this.dotDamage = 0
    this.dotTimer = 0
    this.dotTickTimer = 0
    this.setActive(true)
    this.setVisible(true)
    if (this.body) this.body.enable = true
    this.clearTint()
  }
}
