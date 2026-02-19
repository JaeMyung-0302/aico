import Phaser from 'phaser'
import type { Player } from '../entities/Player'
import { Monster } from '../entities/Monster'
import { Projectile } from '../entities/Projectile'
import type { ProjectileConfig } from '../entities/Projectile'
import { calcDamage, BASE_ATTACK_COOLDOWN } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import { spawnDeathParticles, showDamageNumber, screenShake } from './juiciness'

export interface JuicyConfig {
  readonly enableParticles: boolean
  readonly enableScreenShake: boolean
  readonly enableDamageNumbers: boolean
}

const DEFAULT_JUICY: JuicyConfig = {
  enableParticles: true,
  enableScreenShake: true,
  enableDamageNumbers: true,
}

interface CombatState {
  lastAttackTime: number
  killCount: number
  juicy: JuicyConfig
}

export const createCombatState = (): CombatState => ({
  lastAttackTime: 0,
  killCount: 0,
  juicy: DEFAULT_JUICY,
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
  if (state.juicy.enableParticles) {
    spawnDeathParticles(player.scene, monster.x, monster.y)
  }
  if (state.juicy.enableScreenShake) {
    screenShake(player.scene, 0.003, 80)
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

// 부채꼴 슬래시 (Warrior)
const showSlashEffect = (scene: Phaser.Scene, x: number, y: number, facingAngle: number): void => {
  const g = scene.add.graphics()
  g.setDepth(15)
  const baseAngle = facingAngle

  g.lineStyle(4, 0xffffff, 0.9)
  g.beginPath()
  g.arc(x, y, 55, baseAngle - 0.8, baseAngle + 0.8)
  g.strokePath()

  g.lineStyle(2, 0x88ccff, 0.6)
  g.beginPath()
  g.arc(x, y, 40, baseAngle - 0.6, baseAngle + 0.6)
  g.strokePath()

  scene.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() })
}

// AoE 서클 (Mage)
const showAoeEffect = (scene: Phaser.Scene, x: number, y: number, radius: number): void => {
  const g = scene.add.graphics()
  g.setDepth(15)

  g.lineStyle(3, 0x9966ff, 0.8)
  g.strokeCircle(x, y, radius)
  g.fillStyle(0x9966ff, 0.15)
  g.fillCircle(x, y, radius)

  scene.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() })
}

// 성스러운 직사각형 (Paladin)
const showHolyEffect = (scene: Phaser.Scene, x: number, y: number, facingAngle: number, range: number, width: number): void => {
  const g = scene.add.graphics()
  g.setDepth(15)

  const rectX = x + Math.cos(facingAngle) * range / 2 - range / 2
  const rectY = y + Math.sin(facingAngle) * range / 2 - width / 2

  g.fillStyle(0xffdd44, 0.25)
  g.fillRect(rectX, rectY, range, width)
  g.lineStyle(2, 0xffdd44, 0.8)
  g.strokeRect(rectX, rectY, range, width)

  scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() })
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

  switch (player.attackPattern) {
    case 'melee_fan':
      showSlashEffect(player.scene, player.x, player.y, player.facingAngle)
      attackMeleeFan(player, allGroups, state)
      break
    case 'ranged_projectile': {
      const nearest = findNearestEnemy(player, allGroups)
      attackRangedProjectile(player, nearest, projectiles, state)
      break
    }
    case 'aoe_circle': {
      const aoeBoost = player.passiveSkills.get('aoe_range_up') ?? 0
      const effectiveRange = 180 + aoeBoost * 20
      showAoeEffect(player.scene, player.x, player.y, effectiveRange)
      attackAoeCircle(player, allGroups, state)
      break
    }
    case 'mid_range_holy':
      showHolyEffect(player.scene, player.x, player.y, player.facingAngle, 150, 60)
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

// Archer: 원거리 투사체 (타겟 없으면 바라보는 방향으로 발사)
const attackRangedProjectile = (
  player: Player,
  target: Monster | null,
  projectiles: Phaser.Physics.Arcade.Group,
  _state: CombatState,
): void => {
  const angle = target
    ? Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y)
    : player.facingAngle

  const isCrit = Math.random() < player.crit
  const critMultiplier = isCrit ? player.critDmg : 1.0
  const damage = calcDamage(player.atk, 0, 1.0, critMultiplier)

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
      lifetime: 1500,
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
        const killed = applyDamageToMonster(player, enemy, state)

        // 팔라딘 특수: 처치 시 HP 회복
        if (killed) {
          const healAmount = Math.floor(player.maxHp * 0.02)
          player.hp = Math.min(player.hp + healAmount, player.maxHp)
        }
      }
    }
  }
}

const applyDamageToMonster = (
  player: Player,
  monster: Monster,
  state: CombatState,
): boolean => {
  const isCrit = Math.random() < player.crit
  const critMultiplier = isCrit ? player.critDmg : 1.0
  const damage = calcDamage(player.atk, monster.atk * 0.1, 1.0, critMultiplier)

  // 데미지 텍스트 (LOD 조건)
  if (state.juicy.enableDamageNumbers) {
    showDamageNumber(player.scene, monster.x, monster.y, damage, isCrit)
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
): void => {
  const dodgeLevel = player.passiveSkills.get('dodge_chance') ?? 0
  if (dodgeLevel > 0 && Math.random() < dodgeLevel * 0.05) return

  const thornLevel = player.passiveSkills.get('thorn_armor') ?? 0
  if (thornLevel > 0) {
    const reflectDamage = Math.floor(monster.atk * thornLevel * 0.1)
    monster.takeDamage(reflectDamage)
  }

  const damage = Math.max(1, calcDamage(monster.atk, player.def, 1.0, 1.0))
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
