import Phaser from 'phaser'
import type { Player } from '../entities/Player'
import { Monster } from '../entities/Monster'
import { EliteMonster } from '../entities/EliteMonster'
import { Projectile } from '../entities/Projectile'
import type { ProjectileConfig } from '../entities/Projectile'
import { calcDamage, BASE_ATTACK_COOLDOWN, CLASS_CONFIGS } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import { spawnDeathParticles, showDamageNumber, screenShake } from './juiciness'
import type { VisualFxManager } from './visual-fx'

export type CombatEffectLevel = 'enhanced' | 'basic' | 'none'
export type AtmosphereDetail = 'full' | 'simplified'

export interface JuicyConfig {
  readonly enableParticles: boolean
  readonly enableScreenShake: boolean
  readonly enableDamageNumbers: boolean
  readonly maxMonsters: number
  readonly effectLayers: number
  readonly deathParticles: number
  readonly enableEffectGlow: boolean
  readonly enableHpBars: boolean
  readonly enableAttackAnim: boolean
  // 시각적 깊이 이펙트 플래그
  readonly enableShadows: boolean
  readonly enableParallax: boolean
  readonly parallaxLayers: number
  readonly enableAtmosphere: boolean
  readonly atmosphereDetail: AtmosphereDetail
  readonly enableEnvironmentParticles: boolean
  readonly enableEntityGlow: boolean
  readonly enableBreathTween: boolean
  readonly combatEffectLevel: CombatEffectLevel
}

const DEFAULT_JUICY: JuicyConfig = {
  enableParticles: true,
  enableScreenShake: true,
  enableDamageNumbers: true,
  maxMonsters: 30,
  effectLayers: 4,
  deathParticles: 12,
  enableEffectGlow: true,
  enableHpBars: true,
  enableAttackAnim: true,
  enableShadows: true,
  enableParallax: true,
  parallaxLayers: 3,
  enableAtmosphere: true,
  atmosphereDetail: 'full',
  enableEnvironmentParticles: true,
  enableEntityGlow: true,
  enableBreathTween: true,
  combatEffectLevel: 'enhanced',
}

interface CombatState {
  lastAttackTime: number
  killCount: number
  juicy: JuicyConfig
  visualFx: VisualFxManager | null
}

export const createCombatState = (): CombatState => ({
  lastAttackTime: 0,
  killCount: 0,
  juicy: DEFAULT_JUICY,
  visualFx: null,
})

// 킬 후처리 (공통)
const handleKill = (
  player: Player,
  monster: Monster,
  state: CombatState,
): void => {
  state.killCount += 1
  player.gainExp(monster.expReward)
  eventBus.emit('hud:killCount', { count: state.killCount })

  // 사망 파티클 + 화면 흔들림 (LOD 조건)
  if (state.juicy.enableParticles && state.juicy.deathParticles > 0) {
    spawnDeathParticles(player.scene, monster.x, monster.y, state.juicy.deathParticles, state.juicy.enableEffectGlow)
  }
  if (state.juicy.enableScreenShake) {
    screenShake(player.scene, 0.003, 80)
  }

  // 사망 강화 이펙트 (충격파/잔류 글로우)
  if (state.visualFx) {
    const entityType = monster instanceof EliteMonster ? 'elite' as const : 'normal' as const
    state.visualFx.onEntityDeath(monster.x, monster.y, entityType, state.juicy.combatEffectLevel)
  }

  // 직업 패시브: heal_on_kill (Paladin)
  const classPassive = CLASS_CONFIGS[player.classType].classPassive
  if (classPassive.type === 'heal_on_kill') {
    const heal = Math.floor(player.maxHp * classPassive.value)
    player.hp = Math.min(player.hp + heal, player.maxHp)
    player.emitStatsUpdate()
  }

  // vampire_touch 패시브
  const vampireLevel = player.passiveSkills.get('vampire_touch') ?? 0
  if (vampireLevel > 0) {
    const heal = Math.floor(player.maxHp * vampireLevel * 0.02)
    player.hp = Math.min(player.hp + heal, player.maxHp)
    player.emitStatsUpdate()
  }

  // chain_lightning 패시브: 처치 시 주변 적 3명에게 체인 데미지
  const chainLevel = player.passiveSkills.get('chain_lightning') ?? 0
  if (chainLevel > 0) {
    const chainRange = 120
    const chainDmg = chainLevel * 5
    let chainCount = 0
    const scene = player.scene as Phaser.Scene & { enemies?: Phaser.Physics.Arcade.Group; eliteGroup?: Phaser.Physics.Arcade.Group }
    const groups = [scene.enemies, scene.eliteGroup].filter(Boolean) as Phaser.Physics.Arcade.Group[]
    for (const group of groups) {
      for (const child of group.getChildren()) {
        if (chainCount >= 3) break
        const target = child as Monster
        if (!target.active || target === monster) continue
        const dist = Phaser.Math.Distance.Between(monster.x, monster.y, target.x, target.y)
        if (dist <= chainRange) {
          target.takeDamage(chainDmg)
          chainCount++
        }
      }
      if (chainCount >= 3) break
    }
  }
}

// --- 공격 이펙트 ---

// 부채꼴 슬래시 (Warrior) — 멀티레이어 잔상 + 글로우
const showSlashEffect = (scene: Phaser.Scene, x: number, y: number, facingAngle: number, juicy: JuicyConfig): void => {
  const g = scene.add.graphics()
  g.setDepth(15)
  const ba = facingAngle
  const layers = juicy.effectLayers

  // Layer 1: 외곽 글로우 (full/reduced)
  if (juicy.enableEffectGlow) {
    g.lineStyle(8, 0x4488ff, 0.15)
    g.beginPath()
    g.arc(x, y, 62, ba - 0.9, ba + 0.9)
    g.strokePath()
  }

  // Layer 2: 메인 슬래시
  g.lineStyle(4, 0xffffff, 0.9)
  g.beginPath()
  g.arc(x, y, 55, ba - 0.8, ba + 0.8)
  g.strokePath()

  // Layer 3: 내부 트레일
  if (layers >= 2) {
    g.lineStyle(2, 0x88ccff, 0.6)
    g.beginPath()
    g.arc(x, y, 42, ba - 0.6, ba + 0.6)
    g.strokePath()
  }

  scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() })

  // Layer 4: 잔상 + 스파크 (full only)
  if (layers >= 4) {
    const afterG = scene.add.graphics()
    afterG.setDepth(15)
    afterG.lineStyle(3, 0xaaddff, 0.35)
    afterG.beginPath()
    afterG.arc(x, y, 50, ba - 0.75, ba + 0.75)
    afterG.strokePath()
    scene.tweens.add({ targets: afterG, alpha: 0, duration: 250, delay: 40, onComplete: () => afterG.destroy() })

    // 스파크 입자
    for (let i = 0; i < 5; i++) {
      const sa = ba + (i / 4 - 0.5) * 1.6
      const sx = x + Math.cos(sa) * 55
      const sy = y + Math.sin(sa) * 55
      const spark = scene.add.circle(sx, sy, 1.5, 0xffffff, 0.8)
      spark.setDepth(15)
      scene.tweens.add({
        targets: spark,
        x: sx + Math.cos(sa) * 18,
        y: sy + Math.sin(sa) * 18,
        alpha: 0,
        scale: 0.2,
        duration: 200,
        onComplete: () => spark.destroy(),
      })
    }
  }
}

// AoE 마법진 (Mage) — 동심원 + 확산 파동 + 스파크
const showAoeEffect = (scene: Phaser.Scene, x: number, y: number, radius: number, juicy: JuicyConfig): void => {
  const g = scene.add.graphics()
  g.setDepth(15)
  const layers = juicy.effectLayers

  // Layer 1: 내부 글로우
  g.fillStyle(0x6633cc, 0.12)
  g.fillCircle(x, y, radius * 0.6)

  // Layer 2: 메인 마법진 원
  g.lineStyle(3, 0x9966ff, 0.8)
  g.strokeCircle(x, y, radius)
  g.fillStyle(0x9966ff, 0.08)
  g.fillCircle(x, y, radius)

  // Layer 3: 내부 룬 원 + 마크
  if (layers >= 2) {
    g.lineStyle(1.5, 0xbb88ff, 0.5)
    g.strokeCircle(x, y, radius * 0.65)

    // 룬 마크
    const runeCount = 6
    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2
      const rx = x + Math.cos(angle) * radius * 0.82
      const ry = y + Math.sin(angle) * radius * 0.82
      g.fillStyle(0xbb88ff, 0.5)
      g.fillRect(rx - 2, ry - 1, 4, 2)
    }
  }

  scene.tweens.add({ targets: g, alpha: 0, duration: 280, onComplete: () => g.destroy() })

  // Layer 4: 확산 파동 + 스파크 (full only)
  if (layers >= 4) {
    const waveG = scene.add.graphics()
    waveG.setDepth(15)
    waveG.lineStyle(2, 0xcc99ff, 0.4)
    waveG.strokeCircle(x, y, radius * 0.3)
    scene.tweens.add({
      targets: waveG,
      scaleX: 3.5,
      scaleY: 3.5,
      alpha: 0,
      duration: 400,
      onComplete: () => waveG.destroy(),
    })

    // 스파크 입자
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const sx = x + Math.cos(angle) * radius * 0.8
      const sy = y + Math.sin(angle) * radius * 0.8
      const spark = scene.add.circle(sx, sy, 2, 0xcc88ff, 0.7)
      spark.setDepth(15)
      scene.tweens.add({
        targets: spark,
        x: sx + Math.cos(angle) * 25,
        y: sy + Math.sin(angle) * 25,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        delay: 50,
        onComplete: () => spark.destroy(),
      })
    }
  }
}

// 성스러운 빛 (Paladin) — 황금 성광 + 십자 + 입자
const showHolyEffect = (scene: Phaser.Scene, x: number, y: number, facingAngle: number, range: number, width: number, juicy: JuicyConfig): void => {
  const g = scene.add.graphics()
  g.setDepth(15)
  const layers = juicy.effectLayers

  const cosA = Math.cos(facingAngle)
  const sinA = Math.sin(facingAngle)
  const rectX = x + cosA * range / 2 - range / 2
  const rectY = y + sinA * range / 2 - width / 2

  // Layer 1: 성스러운 빛 사각형
  g.fillStyle(0xffdd44, 0.2)
  g.fillRect(rectX, rectY, range, width)
  g.lineStyle(2, 0xffdd44, 0.8)
  g.strokeRect(rectX, rectY, range, width)

  // Layer 2: 내부 십자 패턴
  if (layers >= 2) {
    const cx = rectX + range / 2
    const cy = rectY + width / 2
    g.fillStyle(0xffee66, 0.3)
    g.fillRect(cx - 2, cy - width / 2, 4, width) // 세로
    g.fillRect(cx - range * 0.3, cy - 2, range * 0.6, 4) // 가로
  }

  // Layer 3: 외곽 글로우
  if (juicy.enableEffectGlow) {
    g.fillStyle(0xffdd44, 0.06)
    g.fillRect(rectX - 4, rectY - 4, range + 8, width + 8)
  }

  scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() })

  // Layer 4: 성스러운 입자 (full only)
  if (layers >= 4) {
    for (let i = 0; i < 6; i++) {
      const px = rectX + Math.random() * range
      const py = rectY + Math.random() * width
      const spark = scene.add.circle(px, py, 1.5, 0xffee88, 0.8)
      spark.setDepth(15)
      scene.tweens.add({
        targets: spark,
        y: py - 20 - Math.random() * 15,
        alpha: 0,
        scale: 0.3,
        duration: 350,
        delay: Math.random() * 100,
        onComplete: () => spark.destroy(),
      })
    }
  }
}

/**
 * 수동 공격 처리 (A키로 트리거)
 * extraGroups: 엘리트/보스 등 추가 적 그룹
 */
export const processAttack = (
  player: Player,
  enemies: Phaser.Physics.Arcade.Group,
  projectiles: Phaser.Physics.Arcade.Group,
  state: CombatState,
  time: number,
  extraGroups: readonly Phaser.Physics.Arcade.Group[] = [],
): void => {
  const cdrLevel = player.passiveSkills.get('cooldown_reduction') ?? 0
  const atkSpdLevel = player.passiveSkills.get('attack_speed_up') ?? 0
  const cooldown = (BASE_ATTACK_COOLDOWN * 1000) * (1 - cdrLevel * 0.08) * (1 - atkSpdLevel * 0.1)
  if (time - state.lastAttackTime < cooldown) return

  state.lastAttackTime = time
  const allGroups = [enemies, ...extraGroups]

  // 공격 애니메이션 재생 (LOD 조건)
  player.playAttackAnim(state.juicy.enableAttackAnim)

  switch (player.attackPattern) {
    case 'melee_fan':
      showSlashEffect(player.scene, player.x, player.y, player.facingAngle, state.juicy)
      attackMeleeFan(player, allGroups, state)
      break
    case 'ranged_projectile': {
      attackRangedProjectile(player, projectiles, state)
      break
    }
    case 'aoe_circle': {
      const aoeBoost = player.passiveSkills.get('aoe_range_up') ?? 0
      const effectiveRange = 180 + aoeBoost * 20
      showAoeEffect(player.scene, player.x, player.y, effectiveRange, state.juicy)
      attackAoeCircle(player, allGroups, state)
      break
    }
    case 'mid_range_holy':
      showHolyEffect(player.scene, player.x, player.y, player.facingAngle, 150, 60, state.juicy)
      attackMidRangeHoly(player, allGroups, state)
      break
  }
}

// Warrior: 근접 부채꼴 (범위 100, 다수 타격)
const attackMeleeFan = (
  player: Player,
  groups: readonly Phaser.Physics.Arcade.Group[],
  state: CombatState,
): void => {
  const range = 100
  const fanAngle = Math.PI / 2
  const playerAngle = player.facingAngle

  for (const group of groups) {
    for (const child of group.getChildren()) {
      const enemy = child as Monster
      if (!enemy.active) continue

      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y)
      if (dist > range) continue

      const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y)
      const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angle - playerAngle))

      if (angleDiff <= fanAngle / 2) {
        applyDamageToMonster(player, enemy, state)
      }
    }
  }
}

// Archer: 원거리 투사체 (바라보는 방향으로 발사, 짧은 사거리)
const attackRangedProjectile = (
  player: Player,
  projectiles: Phaser.Physics.Arcade.Group,
  _state: CombatState,
): void => {
  const angle = player.facingAngle

  const isCrit = Math.random() < player.crit
  const passive = CLASS_CONFIGS[player.classType].classPassive
  const critBonus = (isCrit && passive.type === 'crit_damage_bonus') ? passive.value : 1.0
  const critMultiplier = isCrit ? player.critDmg * critBonus : 1.0
  const damage = calcDamage(player.atk, player.weaponPower, 0, 1.0, player.level, 1, critMultiplier)

  const extraCount = player.passiveSkills.get('extra_projectile') ?? 0
  const totalProjectiles = 1 + extraCount
  const spreadAngle = totalProjectiles > 1 ? 0.15 : 0

  for (let i = 0; i < totalProjectiles; i++) {
    const offsetAngle = totalProjectiles > 1
      ? angle + (i - (totalProjectiles - 1) / 2) * spreadAngle
      : angle

    fireProjectile(player, projectiles, offsetAngle, {
      speed: 400,
      damage,
      piercing: (player.passiveSkills.get('pierce_shot') ?? 0) > 0,
      lifetime: 500,
    })
  }
}

// Mage: 원형 범위 (AoE)
const attackAoeCircle = (
  player: Player,
  groups: readonly Phaser.Physics.Arcade.Group[],
  state: CombatState,
): void => {
  const range = 180
  const aoeBoost = player.passiveSkills.get('aoe_range_up') ?? 0
  const effectiveRange = range + aoeBoost * 20

  for (const group of groups) {
    for (const child of group.getChildren()) {
      const enemy = child as Monster
      if (!enemy.active) continue

      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y)
      if (dist <= effectiveRange) {
        applyDamageToMonster(player, enemy, state)
      }
    }
  }
}

// Paladin: 중거리 성스러운 타격
const attackMidRangeHoly = (
  player: Player,
  groups: readonly Phaser.Physics.Arcade.Group[],
  state: CombatState,
): void => {
  const range = 150
  const width = 60
  const playerAngle = player.facingAngle
  const cosA = Math.cos(playerAngle)
  const sinA = Math.sin(playerAngle)

  for (const group of groups) {
    for (const child of group.getChildren()) {
      const enemy = child as Monster
      if (!enemy.active) continue

      const dx = enemy.x - player.x
      const dy = enemy.y - player.y
      const forward = dx * cosA + dy * sinA
      const lateral = Math.abs(-dx * sinA + dy * cosA)

      if (forward > 0 && forward <= range && lateral <= width / 2) {
        applyDamageToMonster(player, enemy, state)
      }
    }
  }
}

const applyDamageToMonster = (
  player: Player,
  monster: Monster,
  state: CombatState,
): boolean => {
  const passive = CLASS_CONFIGS[player.classType].classPassive
  const isCrit = Math.random() < player.crit
  const critBonus = (isCrit && passive.type === 'crit_damage_bonus') ? passive.value : 1.0
  const critMultiplier = isCrit ? player.critDmg * critBonus : 1.0
  const skillMul = passive.type === 'skill_multiplier' ? passive.value : 1.0
  const damage = calcDamage(player.atk, player.weaponPower, monster.def, skillMul, player.level, monster.level, critMultiplier)

  // 데미지 텍스트 (LOD 조건)
  if (state.juicy.enableDamageNumbers) {
    showDamageNumber(player.scene, monster.x, monster.y, damage, isCrit)
  }

  // 히트 스파크 이펙트
  if (state.visualFx) {
    state.visualFx.onEntityHit(monster.x, monster.y, isCrit, state.juicy.combatEffectLevel)
  }

  const killed = monster.takeDamage(damage)

  if (killed) {
    handleKill(player, monster, state)
  } else {
    // burn_dot 패시브: 공격 시 DoT 적용 (처치되지 않은 경우만)
    const burnLevel = player.passiveSkills.get('burn_dot') ?? 0
    if (burnLevel > 0) {
      monster.applyDot(burnLevel * 2, 3000) // dotDmg per tick, 3초 지속
    }
  }

  return killed
}

/**
 * 적 -> 플레이어 충돌 데미지
 */
export const processEnemyDamage = (
  player: Player,
  monster: Monster,
  state: CombatState,
): void => {
  // 무적 상태면 데미지 텍스트도 표시하지 않음
  if (player.invincible) return

  const dodgeLevel = player.passiveSkills.get('dodge_chance') ?? 0
  if (dodgeLevel > 0 && Math.random() < dodgeLevel * 0.05) return

  const thornLevel = player.passiveSkills.get('thorn_armor') ?? 0
  if (thornLevel > 0) {
    const reflectDamage = Math.floor(monster.atk * thornLevel * 0.1)
    monster.takeDamage(reflectDamage)
  }

  const passive = CLASS_CONFIGS[player.classType].classPassive
  const rawDamage = calcDamage(monster.atk, 0, player.def, 1.0, monster.level, player.level, 1.0)
  const damage = passive.type === 'damage_reduction'
    ? Math.floor(rawDamage * passive.value)
    : rawDamage

  // 피격 데미지 숫자 (빨간색)
  if (state.juicy.enableDamageNumbers) {
    showDamageNumber(player.scene, player.x, player.y, damage, false, '#ff4444')
  }

  player.takeDamage(damage)
}

/**
 * 투사체 <-> 몬스터 충돌
 */
export const processProjectileHit = (
  projectile: Projectile,
  monster: Monster,
  state: CombatState,
  player: Player,
): void => {
  // 데미지 텍스트 (LOD 조건)
  if (state.juicy.enableDamageNumbers) {
    showDamageNumber(player.scene, monster.x, monster.y, projectile.damage, false)
  }

  // 히트 스파크 이펙트
  if (state.visualFx) {
    state.visualFx.onEntityHit(monster.x, monster.y, false, state.juicy.combatEffectLevel)
  }

  const killed = monster.takeDamage(projectile.damage)
  projectile.onHit()

  if (killed) {
    handleKill(player, monster, state)
  }
}

const fireProjectile = (
  player: Player,
  projectiles: Phaser.Physics.Arcade.Group,
  angle: number,
  config: ProjectileConfig,
): void => {
  let projectile = projectiles.getFirstDead(false) as Projectile | null
  if (!projectile) {
    projectile = new Projectile(player.scene, player.x, player.y)
    projectiles.add(projectile)
  }
  projectile.fire(player.x, player.y, angle, config)
}

const findNearestEnemy = (
  player: Player,
  groups: readonly Phaser.Physics.Arcade.Group[],
): Monster | null => {
  let nearest: Monster | null = null
  let minDist = Infinity

  for (const group of groups) {
    for (const child of group.getChildren()) {
      const enemy = child as Monster
      if (!enemy.active) continue
      const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y)
      if (dist < minDist) {
        minDist = dist
        nearest = enemy
      }
    }
  }

  return nearest
}
