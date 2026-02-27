/**
 * R3F 전투 시스템
 * Phaser combat.ts의 순수 함수 포팅
 *
 * Phaser.Physics.Arcade.Group → 배열 기반
 * Phaser.Math → aabb.ts 유틸 사용
 */

import type {
  PlayerEntity,
  MonsterEntity,
  EliteEntity,
  ProjectileEntity,
} from '../types'
import { calcDamage, CLASS_CONFIGS } from '@soulblade/shared'
import { distanceBetween, angleBetween, angleWrap } from '../physics/aabb'
import { playerHealOnKill, playerGainExp } from '../data/player-data'
import { monsterTakeDamage, monsterApplyDot } from '../data/monster-data'
import { eliteTakeDamage } from '../data/elite-data'
import { onProjectileHit } from '../data/projectile-data'
import { eventBus } from '@/lib/event-bus'

// ── 전투 상태 ──

export interface CombatState {
  lastAttackTime: number
  killCount: number
  gold: number
}

export const createCombatState = (): CombatState => ({
  lastAttackTime: -Infinity,
  killCount: 0,
  gold: 0,
})

// ── 킬 후처리 ──

/** @mutates state.killCount, player (힐 패시브, 경험치) */
export const handleKill = (
  player: PlayerEntity,
  expReward: number,
  goldReward: number,
  state: CombatState,
  deathX: number,
  deathY: number,
): void => {
  state.killCount += 1
  state.gold += goldReward

  playerGainExp(player, expReward)

  eventBus.emit('hud:killCount', { count: state.killCount })
  eventBus.emit('hud:gold', { gold: state.gold })
  eventBus.emit('monster:death', { x: deathX, y: deathY })

  // 클래스 패시브 & vampire_touch 힐
  playerHealOnKill(player)
}

// ── chain_lightning 패시브 ──

const processChainLightning = (
  player: PlayerEntity,
  sourceX: number,
  sourceY: number,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
): void => {
  const chainLevel = player.passiveSkills.get('chain_lightning') ?? 0
  if (chainLevel <= 0) return

  const chainRange = 120
  const chainDmg = chainLevel * 5
  let chainCount = 0

  for (const m of monsters) {
    if (chainCount >= 3) break
    if (!m.active) continue
    const dist = distanceBetween(sourceX, sourceY, m.body.x, m.body.y)
    if (dist <= chainRange) {
      monsterTakeDamage(m, chainDmg)
      chainCount++
    }
  }

  for (const e of elites) {
    if (chainCount >= 3) break
    if (!e.active) continue
    const dist = distanceBetween(sourceX, sourceY, e.body.x, e.body.y)
    if (dist <= chainRange) {
      eliteTakeDamage(e, chainDmg)
      chainCount++
    }
  }
}

// ── 몬스터에 데미지 적용 (공통) ──

const applyDamageToTarget = (
  player: PlayerEntity,
  targetDef: number,
  targetLevel: number,
): { damage: number; isCrit: boolean } => {
  const passive = CLASS_CONFIGS[player.classType].classPassive
  const isCrit = Math.random() < player.crit
  const critBonus =
    isCrit && passive.type === 'crit_damage_bonus' ? passive.value : 1.0
  const critMultiplier = isCrit ? player.critDmg * critBonus : 1.0
  const skillMul = passive.type === 'skill_multiplier' ? passive.value : 1.0
  const damage = calcDamage(
    player.atk,
    player.weaponPower,
    targetDef,
    skillMul,
    player.level,
    targetLevel,
    critMultiplier,
  )
  return { damage, isCrit }
}

/** @mutates monster.hp, monster.active, monster.dotDamage/Timer, state.killCount */
const attackMonster = (
  player: PlayerEntity,
  monster: MonsterEntity,
  state: CombatState,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
): void => {
  const { damage, isCrit } = applyDamageToTarget(
    player,
    monster.def,
    monster.level,
  )

  eventBus.emit('combat:damageNumber', {
    x: monster.body.x,
    y: monster.body.y,
    damage,
    isCrit,
  })

  const killed = monsterTakeDamage(monster, damage)

  if (killed) {
    handleKill(
      player,
      monster.expReward,
      monster.goldReward,
      state,
      monster.body.x,
      monster.body.y,
    )
    processChainLightning(
      player,
      monster.body.x,
      monster.body.y,
      monsters,
      elites,
    )
  } else {
    // burn_dot 패시브
    const burnLevel = player.passiveSkills.get('burn_dot') ?? 0
    if (burnLevel > 0) {
      monsterApplyDot(monster, burnLevel * 2, 3000)
    }
  }
}

/** @mutates elite.hp, elite.active, state.killCount */
const attackElite = (
  player: PlayerEntity,
  elite: EliteEntity,
  state: CombatState,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
): void => {
  const { damage, isCrit } = applyDamageToTarget(player, elite.def, elite.level)

  eventBus.emit('combat:damageNumber', {
    x: elite.body.x,
    y: elite.body.y,
    damage,
    isCrit,
  })

  const killed = eliteTakeDamage(elite, damage)

  if (killed) {
    handleKill(
      player,
      elite.expReward,
      elite.goldReward,
      state,
      elite.body.x,
      elite.body.y,
    )
    processChainLightning(player, elite.body.x, elite.body.y, monsters, elites)
  }
}

// ── 공격 패턴 ──

// Warrior: 근접 부채꼴 (범위 100, 90도)
const attackMeleeFan = (
  player: PlayerEntity,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
  state: CombatState,
): void => {
  const range = 100
  const fanAngle = Math.PI / 2
  const playerAngle = player.facingAngle

  for (const m of monsters) {
    if (!m.active) continue
    const dist = distanceBetween(
      player.body.x,
      player.body.y,
      m.body.x,
      m.body.y,
    )
    if (dist > range) continue
    const angle = angleBetween(player.body.x, player.body.y, m.body.x, m.body.y)
    if (Math.abs(angleWrap(angle - playerAngle)) <= fanAngle / 2) {
      attackMonster(player, m, state, monsters, elites)
    }
  }

  for (const e of elites) {
    if (!e.active) continue
    const dist = distanceBetween(
      player.body.x,
      player.body.y,
      e.body.x,
      e.body.y,
    )
    if (dist > range) continue
    const angle = angleBetween(player.body.x, player.body.y, e.body.x, e.body.y)
    if (Math.abs(angleWrap(angle - playerAngle)) <= fanAngle / 2) {
      attackElite(player, e, state, monsters, elites)
    }
  }
}

// Mage: 원형 범위 (AoE)
const attackAoeCircle = (
  player: PlayerEntity,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
  state: CombatState,
): void => {
  const aoeBoost = player.passiveSkills.get('aoe_range_up') ?? 0
  const range = 180 + aoeBoost * 20

  for (const m of monsters) {
    if (!m.active) continue
    if (
      distanceBetween(player.body.x, player.body.y, m.body.x, m.body.y) <= range
    ) {
      attackMonster(player, m, state, monsters, elites)
    }
  }

  for (const e of elites) {
    if (!e.active) continue
    if (
      distanceBetween(player.body.x, player.body.y, e.body.x, e.body.y) <= range
    ) {
      attackElite(player, e, state, monsters, elites)
    }
  }
}

// Paladin: 중거리 사각형
const attackMidRangeHoly = (
  player: PlayerEntity,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
  state: CombatState,
): void => {
  const range = 150
  const width = 60
  const cosA = Math.cos(player.facingAngle)
  const sinA = Math.sin(player.facingAngle)

  const checkTarget = (tx: number, ty: number): boolean => {
    const dx = tx - player.body.x
    const dy = ty - player.body.y
    const forward = dx * cosA + dy * sinA
    const lateral = Math.abs(-dx * sinA + dy * cosA)
    return forward > 0 && forward <= range && lateral <= width / 2
  }

  for (const m of monsters) {
    if (!m.active) continue
    if (checkTarget(m.body.x, m.body.y)) {
      attackMonster(player, m, state, monsters, elites)
    }
  }

  for (const e of elites) {
    if (!e.active) continue
    if (checkTarget(e.body.x, e.body.y)) {
      attackElite(player, e, state, monsters, elites)
    }
  }
}

// ── 수동 공격 처리 ──

/**
 * 플레이어 공격 데미지 처리 (쿨다운/모션은 GameLoop에서 관리)
 * @mutates state.killCount, 대상 몬스터/엘리트 hp/active
 * @returns 투사체 발사 정보 (Archer용) 또는 null
 */
export const processAttackR3F = (
  player: PlayerEntity,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
  state: CombatState,
): { angle: number; damage: number; piercing: boolean }[] | null => {
  // 데미지 처리만 (쿨다운/모션은 GameLoop에서 관리)
  switch (player.attackPattern) {
    case 'melee_fan':
      attackMeleeFan(player, monsters, elites, state)
      return null

    case 'ranged_projectile': {
      // 투사체 발사 정보 반환 (호출자가 투사체 생성)
      const isCrit = Math.random() < player.crit
      const passive = CLASS_CONFIGS[player.classType].classPassive
      const critBonus =
        isCrit && passive.type === 'crit_damage_bonus' ? passive.value : 1.0
      const critMultiplier = isCrit ? player.critDmg * critBonus : 1.0
      const damage = calcDamage(
        player.atk,
        player.weaponPower,
        0,
        1.0,
        player.level,
        1,
        critMultiplier,
      )

      const extraCount = player.passiveSkills.get('extra_projectile') ?? 0
      const totalProjectiles = 1 + extraCount
      const spreadAngle = totalProjectiles > 1 ? 0.15 : 0

      const projectiles: {
        angle: number
        damage: number
        piercing: boolean
      }[] = []
      for (let i = 0; i < totalProjectiles; i++) {
        const offsetAngle =
          totalProjectiles > 1
            ? player.facingAngle +
              (i - (totalProjectiles - 1) / 2) * spreadAngle
            : player.facingAngle
        projectiles.push({
          angle: offsetAngle,
          damage,
          piercing: (player.passiveSkills.get('pierce_shot') ?? 0) > 0,
        })
      }
      return projectiles
    }

    case 'aoe_circle':
      attackAoeCircle(player, monsters, elites, state)
      return null

    case 'mid_range_holy':
      attackMidRangeHoly(player, monsters, elites, state)
      return null
  }
}

/**
 * 투사체 ↔ 몬스터 충돌
 * @mutates monster/elite.hp, projectile.active, state.killCount
 */
export const processProjectileHitR3F = (
  projectile: ProjectileEntity,
  target: MonsterEntity | EliteEntity,
  player: PlayerEntity,
  state: CombatState,
  monsters: readonly MonsterEntity[],
  elites: readonly EliteEntity[],
): void => {
  eventBus.emit('combat:damageNumber', {
    x: target.body.x,
    y: target.body.y,
    damage: projectile.damage,
    isCrit: false,
  })

  // 대상 타입 판별: EliteEntity는 mutationType 필드 보유
  const isElite = 'mutationType' in target
  const killed = isElite
    ? eliteTakeDamage(target as EliteEntity, projectile.damage)
    : monsterTakeDamage(target as MonsterEntity, projectile.damage)

  onProjectileHit(projectile)

  if (killed) {
    handleKill(
      player,
      target.expReward,
      target.goldReward,
      state,
      target.body.x,
      target.body.y,
    )
    processChainLightning(
      player,
      target.body.x,
      target.body.y,
      monsters,
      elites,
    )
  }
}
