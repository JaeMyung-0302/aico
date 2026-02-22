import Phaser from 'phaser'
import type { EliteMutationType } from '@soulblade/shared'
import type { MonsterConfig } from './Monster'
import { MONSTER_TEXTURES } from '../texture-keys'
import { createHpBar, updateHpBar, destroyHpBar, type HpBarConfig } from '../systems/hp-bar'
import { createEliteLabel, updateEliteLabel, syncEliteLabel, destroyEntityLabel } from '../systems/entity-label'

// 엘리트 변이 설정
interface EliteMutation {
  readonly type: EliteMutationType
  readonly hpMultiplier: number
  readonly atkMultiplier: number
  readonly spdMultiplier: number
  readonly tint: number
  readonly scale: number
}

const MUTATIONS: Record<EliteMutationType, EliteMutation> = {
  speedy: { type: 'speedy', hpMultiplier: 0.8, atkMultiplier: 1.0, spdMultiplier: 2.0, tint: 0xffff00, scale: 1.2 },
  armored: { type: 'armored', hpMultiplier: 3.0, atkMultiplier: 0.8, spdMultiplier: 0.6, tint: 0x888888, scale: 1.5 },
  splitting: { type: 'splitting', hpMultiplier: 1.5, atkMultiplier: 0.7, spdMultiplier: 1.0, tint: 0x00ff00, scale: 1.3 },
  ranged: { type: 'ranged', hpMultiplier: 1.0, atkMultiplier: 1.5, spdMultiplier: 0.8, tint: 0xff00ff, scale: 1.2 },
  explosive: { type: 'explosive', hpMultiplier: 1.2, atkMultiplier: 2.0, spdMultiplier: 1.0, tint: 0xff6600, scale: 1.4 },
}

export class EliteMonster extends Phaser.Physics.Arcade.Sprite {
  readonly mutationType: EliteMutationType
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
  private hpBarConfig: HpBarConfig

  // 레벨 라벨
  private levelLabel: Phaser.GameObjects.Text | null = null

  // 상태 효과
  slowMultiplier = 0
  private dotDamage = 0
  private dotTimer = 0
  private dotTickTimer = 0

  // splitting 변이: 사망 시 분열 횟수
  private splitCount: number

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    baseConfig: MonsterConfig,
    mutationType: EliteMutationType,
  ) {
    super(scene, x, y, MONSTER_TEXTURES.elite)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.mutationType = mutationType
    const mutation = MUTATIONS[mutationType]

    this.hp = Math.floor(baseConfig.hp * mutation.hpMultiplier)
    this.maxHp = this.hp
    this.atk = Math.floor(baseConfig.atk * mutation.atkMultiplier)
    this.def = mutationType === 'armored' ? Math.floor(baseConfig.def * 1.5) : baseConfig.def
    this.spd = Math.floor(baseConfig.spd * mutation.spdMultiplier)
    this.level = baseConfig.level
    this.expReward = Math.floor(baseConfig.expReward * 2.5)
    this.goldReward = Math.floor(baseConfig.goldReward * 3)
    this.splitCount = mutationType === 'splitting' ? 2 : 0

    this.setScale(mutation.scale)
    this.setTint(mutation.tint)
    this.setCollideWorldBounds(true)
    this.setDepth(6)

    this.hpBarConfig = { width: 32, height: 4, yOffset: -6, showBorder: true, borderColor: mutation.tint }
    this.hpBar = createHpBar(scene, this.hpBarConfig)
    this.levelLabel = createEliteLabel(scene, baseConfig.level)
  }

  // AI: 변이 타입별 행동
  chasePlayer = (playerX: number, playerY: number): void => {
    if (!this.active) return

    const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY)
    const speed = 50 + this.spd * 10

    const effectiveSpeed = speed * (1 - this.slowMultiplier)

    if (this.mutationType === 'ranged') {
      // 원거리: 일정 거리 유지
      const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY)
      if (dist < 120) {
        this.setVelocity(-Math.cos(angle) * effectiveSpeed, -Math.sin(angle) * effectiveSpeed)
      } else if (dist > 200) {
        this.setVelocity(Math.cos(angle) * effectiveSpeed, Math.sin(angle) * effectiveSpeed)
      } else {
        this.setVelocity(0, 0)
      }
    } else {
      this.setVelocity(Math.cos(angle) * effectiveSpeed, Math.sin(angle) * effectiveSpeed)
    }
  }

  takeDamage = (amount: number): boolean => {
    // armored: 데미지 25% 감소
    const finalDamage = this.mutationType === 'armored'
      ? Math.floor(amount * 0.75)
      : amount

    this.hp -= finalDamage

    // HP 바 표시 (피격 시)
    if (this.hpBar) this.hpBar.setAlpha(1)

    this.setTint(0xffffff)
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.setTint(MUTATIONS[this.mutationType].tint)
    })

    if (this.hp <= 0) {
      this.die()
      return true
    }
    return false
  }

  // DoT 적용
  applyDot = (damage: number, durationMs: number): void => {
    this.dotDamage = damage
    this.dotTimer = durationMs
    this.dotTickTimer = 0
  }

  // 슬로우 적용
  applySlow = (percent: number): void => {
    this.slowMultiplier = Math.min(percent, 0.8)
  }

  // 매 프레임 효과 업데이트
  updateEffects = (delta: number, enableHpBars = true): void => {
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
        syncEliteLabel(this.levelLabel, this.x, this.y)
      }
    }
  }

  // splitting 변이: 분열 가능 여부
  canSplit = (): boolean => this.splitCount > 0

  getSplitCount = (): number => this.splitCount

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
  reset = (
    x: number,
    y: number,
    baseConfig: MonsterConfig,
    mutationType: EliteMutationType,
  ): void => {
    const mutation = MUTATIONS[mutationType]

    this.setPosition(x, y)
    ;(this as { mutationType: EliteMutationType }).mutationType = mutationType
    this.hp = Math.floor(baseConfig.hp * mutation.hpMultiplier)
    this.maxHp = this.hp
    this.atk = Math.floor(baseConfig.atk * mutation.atkMultiplier)
    this.def = mutationType === 'armored' ? Math.floor(baseConfig.def * 1.5) : baseConfig.def
    this.spd = Math.floor(baseConfig.spd * mutation.spdMultiplier)
    this.level = baseConfig.level
    this.expReward = Math.floor(baseConfig.expReward * 2.5)
    this.goldReward = Math.floor(baseConfig.goldReward * 3)
    this.splitCount = mutationType === 'splitting' ? 2 : 0

    this.slowMultiplier = 0
    this.dotDamage = 0
    this.dotTimer = 0
    this.dotTickTimer = 0

    this.setScale(mutation.scale)
    this.setTint(mutation.tint)
    this.setActive(true)
    this.setVisible(true)
    if (this.body) this.body.enable = true

    // HP 바 리셋
    this.hpBarConfig = { width: 32, height: 4, yOffset: -6, showBorder: true, borderColor: mutation.tint }
    if (this.hpBar) {
      this.hpBar.clear() // 이전 mutation 색상 draw command 제거
      this.hpBar.setVisible(true)
      this.hpBar.setAlpha(0)
    }

    // 레벨 라벨 리셋
    if (this.levelLabel) {
      updateEliteLabel(this.levelLabel, baseConfig.level)
      this.levelLabel.setVisible(true)
    }
  }
}
