import Phaser from 'phaser'
import type { CharacterClass, CharacterStats, BasicAttackPattern, StatAllocationData } from '@soulblade/shared'
import type { PassiveSkillId } from '@soulblade/shared'
import { CLASS_CONFIGS, calcExpForLevel, STAT_POINTS_PER_LEVEL, STAT_POINT_VALUES } from '@soulblade/shared'
import { PLAYER_SPRITESHEET_KEYS, PLAYER_ANIM_KEYS } from '../texture-keys'
import { createPlayerLabel, updatePlayerLabel, syncPlayerLabel, destroyEntityLabel } from '../systems/entity-label'
import { eventBus } from '@/lib/event-bus'

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly classType: CharacterClass
  readonly attackPattern: BasicAttackPattern

  // 전투 스탯
  hp: number
  maxHp: number
  atk: number
  def: number
  spd: number
  crit: number
  critDmg: number
  weaponPower: number

  // 레벨링
  level: number
  exp: number
  expToNext: number

  // In-Run 패시브 스킬
  readonly passiveSkills: Map<PassiveSkillId, number> // skillId -> level

  // 방향 (라디안: 0=오른쪽, PI/2=아래, PI=왼쪽, -PI/2=위)
  facingAngle: number

  // holy_shield 패시브
  holyShieldActive: boolean
  private holyShieldTimer: number
  private holyShieldInterval: number

  // 공격 애니메이션 재생 중 플래그
  isAttacking: boolean

  // 상태
  invincible: boolean
  private invincibleTimer: number

  // 이름 라벨
  private characterName: string
  private nameLabel: Phaser.GameObjects.Text | null = null

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    classType: CharacterClass,
    permanentStats?: Partial<CharacterStats>,
    characterName?: string,
  ) {
    super(scene, x, y, PLAYER_SPRITESHEET_KEYS[classType], 0)
    this.classType = classType

    const config = CLASS_CONFIGS[classType]
    this.attackPattern = config.basicAttackPattern

    scene.add.existing(this)
    scene.physics.add.existing(this)

    const base = config.baseStats
    const perm = permanentStats ?? {}

    this.hp = base.hp + (perm.hp ?? 0)
    this.maxHp = this.hp
    this.atk = base.atk + (perm.atk ?? 0)
    this.def = base.def + (perm.def ?? 0)
    this.spd = base.spd + (perm.spd ?? 0)
    this.crit = base.crit + (perm.crit ?? 0)
    this.critDmg = base.critDmg + (perm.critDmg ?? 0)
    this.weaponPower = 0

    this.level = 1
    this.exp = 0
    this.expToNext = calcExpForLevel(1)

    this.passiveSkills = new Map()

    this.facingAngle = 0

    this.holyShieldActive = false
    this.holyShieldTimer = 0
    this.holyShieldInterval = 0

    this.isAttacking = false

    this.invincible = false
    this.invincibleTimer = 0

    this.characterName = characterName ?? ''
    if (this.characterName) {
      this.nameLabel = createPlayerLabel(scene, this.characterName, this.level)
    }

    this.setCollideWorldBounds(true)
    this.setDepth(10)

    // spritesheet body 크기 명시 (32×48 유지)
    const body = this.body as Phaser.Physics.Arcade.Body
    body.setSize(32, 48)

    // idle 애니메이션 자동 재생
    this.play(PLAYER_ANIM_KEYS[classType].idle)
  }

  // 공격 애니메이션 재생 (LOD enableAttackAnim 조건)
  playAttackAnim = (enableAttackAnim: boolean): void => {
    if (!enableAttackAnim || !this.active) return
    this.isAttacking = true
    this.off(Phaser.Animations.Events.ANIMATION_COMPLETE) // 기존 리스너 제거 (중복 방지)
    this.play(PLAYER_ANIM_KEYS[this.classType].attack)
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.isAttacking = false
      if (!this.active) return
      // 이동 중이면 walk, 아니면 idle
      const body = this.body as Phaser.Physics.Arcade.Body
      const isMoving = body.velocity.x !== 0 || body.velocity.y !== 0
      this.play(isMoving ? PLAYER_ANIM_KEYS[this.classType].walk : PLAYER_ANIM_KEYS[this.classType].idle)
    })
  }

  takeDamage = (amount: number): void => {
    if (this.invincible) return

    // holy_shield 패시브: 피해 1회 무효
    if (this.holyShieldActive) {
      this.holyShieldActive = false
      return
    }

    this.hp = Math.max(0, this.hp - amount)

    // 피격 플래시 (빨간색 → 무적 반투명)
    this.setTint(0xff0000)
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.clearTint()
    })

    this.setInvincible(500)

    this.emitStatsUpdate()

    if (this.hp <= 0) {
      this.setActive(false)
      this.setVisible(false)
    }
  }

  gainExp = (amount: number): void => {
    // exp_boost 패시브 적용
    const expBoostLevel = this.passiveSkills.get('exp_boost') ?? 0
    const boostedAmount = Math.floor(amount * (1 + expBoostLevel * 0.1))

    this.exp += boostedAmount

    let levelsGained = 0
    while (this.exp >= this.expToNext && this.level < 50) {
      this.exp -= this.expToNext
      this.level += 1
      this.expToNext = calcExpForLevel(this.level)
      levelsGained++
    }

    if (levelsGained > 0) {
      // HP 전체 회복
      this.hp = this.maxHp

      // 라벨 갱신
      this.refreshLabel()

      // 스탯 포인트 배분 이벤트 (누적 레벨만큼 한 번에)
      eventBus.emit('player:levelup', {
        level: this.level,
        statPoints: STAT_POINTS_PER_LEVEL * levelsGained,
      })
    }

    this.emitStatsUpdate()
  }

  addPassiveSkill = (skillId: PassiveSkillId, level: number): void => {
    const prevLevel = this.passiveSkills.get(skillId) ?? 0
    this.passiveSkills.set(skillId, level)
    this.applyPassiveEffect(skillId, level - prevLevel)
  }

  // 스탯 포인트 배분 (레벨업 모달에서 호출)
  allocateStats = (allocation: StatAllocationData): void => {
    const hpIncrease = allocation.hp * STAT_POINT_VALUES.hp
    this.maxHp += hpIncrease
    this.hp += hpIncrease
    this.atk += allocation.atk * STAT_POINT_VALUES.atk
    this.def += allocation.def * STAT_POINT_VALUES.def
    this.spd += allocation.spd * STAT_POINT_VALUES.spd
    this.crit += allocation.crit * STAT_POINT_VALUES.crit

    this.emitStatsUpdate()
  }

  private applyPassiveEffect(skillId: PassiveSkillId, deltaLevel: number): void {
    switch (skillId) {
      case 'atk_boost':
        this.atk += deltaLevel * 3
        break
      case 'def_boost':
        this.def += deltaLevel * 2
        break
      case 'hp_boost': {
        const hpIncrease = deltaLevel * 15
        this.maxHp += hpIncrease
        this.hp += hpIncrease
        break
      }
      case 'spd_boost':
        this.spd += deltaLevel * 1
        break
      case 'crit_boost':
        this.crit += deltaLevel * 0.03
        break
      case 'crit_dmg_boost':
        this.critDmg += deltaLevel * 0.15
        break
      case 'holy_shield':
        // 쉴드 간격 업데이트: 레벨업 시 타이머 리셋
        this.holyShieldInterval = (this.passiveSkills.get('holy_shield') ?? 0) > 0
          ? 30000 / (this.passiveSkills.get('holy_shield') ?? 1)
          : 0
        this.holyShieldTimer = 0
        this.holyShieldActive = true
        break
      default:
        break
    }
  }

  // holy_shield 타이머 업데이트
  updateHolyShield = (delta: number): void => {
    const shieldLevel = this.passiveSkills.get('holy_shield') ?? 0
    if (shieldLevel <= 0) return
    if (this.holyShieldActive) return

    this.holyShieldTimer += delta
    const interval = 30000 / shieldLevel
    if (this.holyShieldTimer >= interval) {
      this.holyShieldActive = true
      this.holyShieldTimer = 0
    }
  }

  setInvincible(durationMs: number): void {
    this.invincible = true
    this.invincibleTimer = durationMs
    this.setAlpha(0.5)
  }

  updateInvincibility = (delta: number): void => {
    if (!this.invincible) return

    this.invincibleTimer -= delta
    if (this.invincibleTimer <= 0) {
      this.invincible = false
      this.setAlpha(1)
    }
  }

  // 이름 라벨 위치 동기화 (매 프레임 호출)
  updateLabel = (): void => {
    if (this.nameLabel) {
      syncPlayerLabel(this.nameLabel, this.x, this.y)
    }
  }

  // 이름 라벨 텍스트 갱신 (레벨업 시)
  private refreshLabel(): void {
    if (this.nameLabel && this.characterName) {
      updatePlayerLabel(this.nameLabel, this.characterName, this.level)
    }
  }

  preDestroy(): void {
    destroyEntityLabel(this.nameLabel)
    this.nameLabel = null
  }

  emitStatsUpdate = (): void => {
    eventBus.emit('player:statsUpdate', {
      hp: this.hp,
      maxHp: this.maxHp,
      atk: this.atk,
      def: this.def,
      spd: this.spd,
      crit: this.crit,
      critDmg: this.critDmg,
      level: this.level,
      exp: this.exp,
      expToNext: this.expToNext,
    })
  }
}
