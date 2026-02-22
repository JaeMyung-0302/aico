/**
 * 플레이어 엔티티 순수 함수
 * Phaser Player 클래스의 게임 로직을 순수 함수로 포팅
 *
 * 모든 함수는 PlayerEntity를 in-place mutate (60fps 성능 패턴)
 */

import type { PassiveSkillId, StatAllocationData } from '@soulblade/shared'
import { CLASS_CONFIGS, calcExpForLevel, STAT_POINTS_PER_LEVEL, STAT_POINT_VALUES } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import type { PlayerEntity } from '../types'

// ── 데미지 처리 ──

/** @mutates player.hp, player.holyShieldActive, player.invincible, player.invincibleTimer, player.active */
export const playerTakeDamage = (player: PlayerEntity, amount: number): void => {
  if (player.invincible) return

  // holy_shield 패시브: 피해 1회 무효
  if (player.holyShieldActive) {
    player.holyShieldActive = false
    return
  }

  player.hp = Math.max(0, player.hp - amount)

  // 무적 설정 (500ms)
  player.invincible = true
  player.invincibleTimer = 500

  emitPlayerStats(player)

  if (player.hp <= 0) {
    player.active = false
  }
}

// ── 경험치 & 레벨업 ──

/** @mutates player.exp, player.level, player.expToNext, player.hp */
export const playerGainExp = (player: PlayerEntity, amount: number): number => {
  // exp_boost 패시브 적용
  const expBoostLevel = player.passiveSkills.get('exp_boost') ?? 0
  const boostedAmount = Math.floor(amount * (1 + expBoostLevel * 0.1))

  player.exp += boostedAmount

  let levelsGained = 0
  while (player.exp >= player.expToNext && player.level < 50) {
    player.exp -= player.expToNext
    player.level += 1
    player.expToNext = calcExpForLevel(player.level)
    levelsGained++
  }

  if (levelsGained > 0) {
    // HP 전체 회복
    player.hp = player.maxHp

    // 스탯 포인트 배분 이벤트
    eventBus.emit('player:levelup', {
      level: player.level,
      statPoints: STAT_POINTS_PER_LEVEL * levelsGained,
    })
  }

  emitPlayerStats(player)
  return levelsGained
}

// ── 패시브 스킬 ──

/** @mutates player.passiveSkills, player 스탯 (패시브 효과별) */
export const playerAddPassiveSkill = (player: PlayerEntity, skillId: PassiveSkillId, level: number): void => {
  const prevLevel = player.passiveSkills.get(skillId) ?? 0
  player.passiveSkills.set(skillId, level)
  applyPassiveEffect(player, skillId, level - prevLevel)
}

const applyPassiveEffect = (player: PlayerEntity, skillId: PassiveSkillId, deltaLevel: number): void => {
  switch (skillId) {
    case 'atk_boost':
      player.atk += deltaLevel * 3
      break
    case 'def_boost':
      player.def += deltaLevel * 2
      break
    case 'hp_boost': {
      const hpIncrease = deltaLevel * 15
      player.maxHp += hpIncrease
      player.hp += hpIncrease
      break
    }
    case 'spd_boost':
      player.spd += deltaLevel * 1
      break
    case 'crit_boost':
      player.crit += deltaLevel * 0.03
      break
    case 'crit_dmg_boost':
      player.critDmg += deltaLevel * 0.15
      break
    case 'holy_shield': {
      const shieldLevel = player.passiveSkills.get('holy_shield') ?? 0
      player.holyShieldInterval = shieldLevel > 0 ? 30000 / shieldLevel : 0
      player.holyShieldTimer = 0
      player.holyShieldActive = true
      break
    }
    default:
      break
  }
}

// ── 스탯 배분 ──

/** @mutates player.maxHp, player.hp, player.atk, player.def, player.spd, player.crit */
export const playerAllocateStats = (player: PlayerEntity, allocation: StatAllocationData): void => {
  const hpIncrease = allocation.hp * STAT_POINT_VALUES.hp
  player.maxHp += hpIncrease
  player.hp += hpIncrease
  player.atk += allocation.atk * STAT_POINT_VALUES.atk
  player.def += allocation.def * STAT_POINT_VALUES.def
  player.spd += allocation.spd * STAT_POINT_VALUES.spd
  player.crit += allocation.crit * STAT_POINT_VALUES.crit

  emitPlayerStats(player)
}

// ── 타이머 업데이트 (매 프레임) ──

/** @mutates player.holyShieldActive, player.holyShieldTimer */
export const playerUpdateHolyShield = (player: PlayerEntity, deltaMs: number): void => {
  const shieldLevel = player.passiveSkills.get('holy_shield') ?? 0
  if (shieldLevel <= 0) return
  if (player.holyShieldActive) return

  player.holyShieldTimer += deltaMs
  const interval = 30000 / shieldLevel
  if (player.holyShieldTimer >= interval) {
    player.holyShieldActive = true
    player.holyShieldTimer = 0
  }
}

/** @mutates player.invincible, player.invincibleTimer */
export const playerUpdateInvincibility = (player: PlayerEntity, deltaMs: number): void => {
  if (!player.invincible) return

  player.invincibleTimer -= deltaMs
  if (player.invincibleTimer <= 0) {
    player.invincible = false
  }
}

// ── 스탯 이벤트 발행 ──

export const emitPlayerStats = (player: PlayerEntity): void => {
  eventBus.emit('player:statsUpdate', {
    hp: player.hp,
    maxHp: player.maxHp,
    atk: player.atk,
    def: player.def,
    spd: player.spd,
    crit: player.crit,
    critDmg: player.critDmg,
    level: player.level,
    exp: player.exp,
    expToNext: player.expToNext,
  })
}

// ── 킬 시 힐 처리 ──

/** @mutates player.hp */
export const playerHealOnKill = (player: PlayerEntity): void => {
  const classPassive = CLASS_CONFIGS[player.classType].classPassive
  if (classPassive.type === 'heal_on_kill') {
    const heal = Math.floor(player.maxHp * classPassive.value)
    player.hp = Math.min(player.hp + heal, player.maxHp)
    emitPlayerStats(player)
  }

  // vampire_touch 패시브
  const vampireLevel = player.passiveSkills.get('vampire_touch') ?? 0
  if (vampireLevel > 0) {
    const heal = Math.floor(player.maxHp * vampireLevel * 0.02)
    player.hp = Math.min(player.hp + heal, player.maxHp)
    emitPlayerStats(player)
  }
}
