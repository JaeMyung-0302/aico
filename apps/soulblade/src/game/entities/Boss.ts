import Phaser from 'phaser'
import type { BossType } from '@soulblade/shared'
import { MONSTER_TEXTURES } from '../texture-keys'
import { eventBus } from '@/lib/event-bus'

interface BossConfig {
  readonly type: BossType
  readonly hp: number
  readonly atk: number
  readonly phases: number
}

// 보스 AI 상태
type BossPhase = 'idle' | 'chase' | 'charge' | 'aoe' | 'summon'

export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly bossType: BossType
  hp: number
  maxHp: number
  atk: number
  private totalPhases: number
  private currentPhase: BossPhase = 'chase'
  private phaseTimer = 0
  private phaseDuration = 3000 // ms
  private chargeTarget = { x: 0, y: 0 }
  private aoeRadius = 120
  expReward: number
  goldReward: number

  constructor(scene: Phaser.Scene, x: number, y: number, config: BossConfig) {
    super(scene, x, y, MONSTER_TEXTURES.boss)

    scene.add.existing(this)
    scene.physics.add.existing(this)

    this.bossType = config.type
    this.hp = config.hp
    this.maxHp = config.hp
    this.atk = config.atk
    this.totalPhases = config.phases

    // 보스 보상 (HP 비례)
    this.expReward = Math.floor(config.hp * 0.5)
    this.goldReward = Math.floor(config.hp * 0.3)

    this.setCollideWorldBounds(true)
    this.setDepth(6)

    // HP바 이벤트
    this.emitHpUpdate()
  }

  updateAI = (delta: number, playerX: number, playerY: number): void => {
    if (!this.active) return

    this.phaseTimer += delta

    if (this.phaseTimer >= this.phaseDuration) {
      this.phaseTimer = 0
      this.transitionPhase(playerX, playerY)
    }

    switch (this.currentPhase) {
      case 'chase':
        this.doChase(playerX, playerY)
        break
      case 'charge':
        this.doCharge()
        break
      case 'aoe':
        // AoE는 시작 시 1회 처리, 대기
        break
      case 'summon':
        // 소환은 시작 시 1회 처리, 대기
        break
      case 'idle':
        this.setVelocity(0, 0)
        break
    }
  }

  takeDamage = (amount: number): boolean => {
    this.hp -= amount

    // 피격 플래시
    this.setTint(0xffffff)
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint()
    })

    this.emitHpUpdate()

    // HP 구간별 페이즈 전환 (33% / 66%)
    const hpPercent = this.hp / this.maxHp
    if (this.totalPhases >= 3 && hpPercent < 0.33) {
      this.phaseDuration = 2000 // 광폭화
    } else if (this.totalPhases >= 2 && hpPercent < 0.66) {
      this.phaseDuration = 2500
    }

    if (this.hp <= 0) {
      this.die()
      return true
    }
    return false
  }

  private transitionPhase(playerX: number, playerY: number): void {
    const hpPercent = this.hp / this.maxHp
    const roll = Math.random()

    if (hpPercent < 0.33 && this.totalPhases >= 3) {
      // 광폭화: 돌진 비율 증가
      this.currentPhase = roll < 0.5 ? 'charge' : roll < 0.8 ? 'aoe' : 'summon'
    } else if (hpPercent < 0.66 && this.totalPhases >= 2) {
      this.currentPhase = roll < 0.4 ? 'chase' : roll < 0.7 ? 'charge' : 'aoe'
    } else {
      this.currentPhase = roll < 0.6 ? 'chase' : roll < 0.85 ? 'charge' : 'aoe'
    }

    // 돌진 대상 저장
    if (this.currentPhase === 'charge') {
      this.chargeTarget = { x: playerX, y: playerY }
    }

    // AoE 즉시 발동 이벤트
    if (this.currentPhase === 'aoe') {
      eventBus.emit('event:trigger', {
        type: 'miniboss_rush',
        data: { bossX: this.x, bossY: this.y, radius: this.aoeRadius },
      })
    }
  }

  private doChase(playerX: number, playerY: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, playerX, playerY)
    const speed = 80
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)
  }

  private doCharge(): void {
    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.chargeTarget.x,
      this.chargeTarget.y,
    )
    const speed = 250
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed)

    // 목표 도달 시 chase로 전환
    const dist = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.chargeTarget.x,
      this.chargeTarget.y,
    )
    if (dist < 30) {
      this.currentPhase = 'chase'
    }
  }

  getAoeRadius = (): number => this.aoeRadius

  isInAoePhase = (): boolean => this.currentPhase === 'aoe'

  private die(): void {
    this.setActive(false)
    this.setVisible(false)
    if (this.body) this.body.enable = false

    eventBus.emit('event:trigger', {
      type: 'miniboss_rush',
      data: { bossDefeated: true, bossType: this.bossType },
    })
  }

  private emitHpUpdate(): void {
    eventBus.emit('event:trigger', {
      type: 'miniboss_rush',
      data: { bossHp: this.hp, bossMaxHp: this.maxHp, bossName: this.bossType },
    })
  }
}
