import Phaser from 'phaser'
import { MONSTER_TEXTURES } from '../texture-keys'
import { createHpBar, updateHpBar, destroyHpBar, type HpBarConfig } from '../systems/hp-bar'
import { createMonsterLabel, updateMonsterLabel, syncMonsterLabel, destroyEntityLabel } from '../systems/entity-label'

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

  // HP 바
  private hpBar: Phaser.GameObjects.Graphics | null = null
  private readonly hpBarConfig: HpBarConfig = { width: 24, height: 3, yOffset: -4, showBorder: false }

  // 레벨 라벨
  private levelLabel: Phaser.GameObjects.Text | null = null

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
    super(scene, x, y, MONSTER_TEXTURES.normal)

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

    this.hpBar = createHpBar(scene, this.hpBarConfig)
    this.levelLabel = createMonsterLabel(scene, config.level)
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

    // HP 바 표시 (피격 시)
    if (this.hpBar) this.hpBar.setAlpha(1)

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
  updateEffects = (delta: number, enableHpBars = true): void => {
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

    // HP 바 위치 동기화 (LOD 조건)
    if (!enableHpBars) {
      if (this.hpBar) this.hpBar.setAlpha(0)
    } else if (this.hpBar && this.hpBar.alpha > 0) {
      updateHpBar(this.hpBar, this.x, this.y, this.hp / this.maxHp, this.hpBarConfig)
    }

    // 레벨 라벨 위치 동기화 (LOD 조건)
    if (this.levelLabel) {
      if (!enableHpBars) {
        this.levelLabel.setVisible(false)
      } else {
        this.levelLabel.setVisible(true)
        syncMonsterLabel(this.levelLabel, this.x, this.y)
      }
    }
  }

  // setVisible override: hpBar + 라벨 동기화 (clearAll 경로 대응)
  setVisible(value: boolean): this {
    super.setVisible(value)
    if (this.hpBar) this.hpBar.setVisible(value)
    if (this.levelLabel) this.levelLabel.setVisible(value)
    return this
  }

  // Phaser destroy lifecycle: Graphics + 라벨 정리 (scene.restart/shutdown 대응)
  preDestroy(): void {
    destroyHpBar(this.hpBar)
    this.hpBar = null
    destroyEntityLabel(this.levelLabel)
    this.levelLabel = null
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

    // HP 바 리셋
    if (this.hpBar) {
      this.hpBar.setVisible(true)
      this.hpBar.setAlpha(0) // 피격 전 숨김
    }

    // 레벨 라벨 리셋
    if (this.levelLabel) {
      updateMonsterLabel(this.levelLabel, config.level)
      this.levelLabel.setVisible(true)
    }
  }
}
