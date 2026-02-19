import type { ElementMark, ReactionData, ActiveDebuff, ReactionType } from '@/types'
import { getReaction } from '@/game/data/reactions'
import { addDebuff } from './DebuffSystem'
import type { EnemyEntity } from '@/game/entities/Enemy'

const MARK_WINDOW_MS = 2000
const REACTION_COOLDOWN_MS = 3000
const AOE_RADIUS = 80 // pixels

// 반응 쿨다운 추적 (적 ID + 반응 타입 → 마지막 발동 시간)
const reactionCooldowns = new Map<string, number>()

// 활성 마킹에서 반응 조합 판정
export const checkReaction = (
  marks: ElementMark[],
  currentTime: number,
): ReactionData | null => {
  const activeMarks = marks.filter(m => currentTime - m.appliedAt <= MARK_WINDOW_MS)
  const uniqueElements = [...new Set(activeMarks.map(m => m.element))]

  if (uniqueElements.length < 2) return null

  for (let i = 0; i < uniqueElements.length; i++) {
    for (let j = i + 1; j < uniqueElements.length; j++) {
      const el1 = uniqueElements[i]
      const el2 = uniqueElements[j]
      if (!el1 || !el2) continue
      const reaction = getReaction(el1, el2)
      if (reaction) return reaction
    }
  }

  return null
}

// 쿨다운 체크
export const canReact = (
  enemyId: string,
  reactionType: ReactionType,
  currentTime: number,
): boolean => {
  const key = `${enemyId}:${reactionType}`
  const lastTime = reactionCooldowns.get(key) ?? 0
  return currentTime - lastTime >= REACTION_COOLDOWN_MS
}

// 쿨다운 기록
export const recordReaction = (
  enemyId: string,
  reactionType: ReactionType,
  currentTime: number,
): void => {
  reactionCooldowns.set(`${enemyId}:${reactionType}`, currentTime)
}

// 적 사망 시 쿨다운 정리
export const clearCooldowns = (enemyId: string): void => {
  for (const key of reactionCooldowns.keys()) {
    if (key.startsWith(`${enemyId}:`)) {
      reactionCooldowns.delete(key)
    }
  }
}

export interface ReactionResult {
  debuffs: ActiveDebuff[]
  damageEvents: Array<{ enemy: EnemyEntity; damage: number }>
}

// 반응 효과 적용 (데미지 이벤트 반환, GameScene에서 적용)
export const applyReactionEffect = (
  reaction: ReactionData,
  target: EnemyEntity,
  referenceDamage: number,
  enemies: EnemyEntity[],
  debuffs: ActiveDebuff[],
): ReactionResult => {
  let updatedDebuffs = debuffs
  const damageEvents: Array<{ enemy: EnemyEntity; damage: number }> = []

  switch (reaction.effectType) {
    case 'debuff_evasion_zero':
      updatedDebuffs = addDebuff(updatedDebuffs, 'evasion_zero', target.instanceId, 1, reaction.duration)
      break

    case 'single_damage': {
      const dmg = Math.round(referenceDamage * reaction.value)
      damageEvents.push({ enemy: target, damage: dmg })
      break
    }

    case 'aoe_damage': {
      const aoeDmg = Math.round(referenceDamage * reaction.value)
      const nearby = findNearbyEnemies(target, enemies, AOE_RADIUS)
      for (const enemy of nearby) {
        damageEvents.push({ enemy, damage: aoeDmg })
      }
      break
    }

    case 'dot': {
      const dotDps = Math.round(referenceDamage * reaction.value)
      updatedDebuffs = addDebuff(updatedDebuffs, 'dot', target.instanceId, dotDps, reaction.duration)
      break
    }

    case 'aoe_stun': {
      const nearbyStun = findNearbyEnemies(target, enemies, AOE_RADIUS)
      for (const enemy of [target, ...nearbyStun]) {
        updatedDebuffs = addDebuff(updatedDebuffs, 'stun', enemy.instanceId, 1, reaction.duration)
      }
      break
    }

    case 'chain_dot': {
      const dotDmg = Math.round(referenceDamage * reaction.value)
      updatedDebuffs = addDebuff(updatedDebuffs, 'dot', target.instanceId, dotDmg, reaction.duration)
      const nearbyChain = findNearbyEnemies(target, enemies, AOE_RADIUS)
      for (const enemy of nearbyChain) {
        updatedDebuffs = addDebuff(updatedDebuffs, 'dot', enemy.instanceId, Math.round(dotDmg * 0.5), reaction.duration)
      }
      break
    }

    case 'mega_slow':
      updatedDebuffs = addDebuff(updatedDebuffs, 'slow', target.instanceId, reaction.value, reaction.duration)
      break

    case 'random_chain_damage': {
      const chainDmg = Math.round(referenceDamage * reaction.value)
      const aliveEnemies = enemies.filter(e => !e.isDead && e !== target)
      const targets = shuffleAndTake(aliveEnemies, 3)
      for (const enemy of targets) {
        damageEvents.push({ enemy, damage: chainDmg })
      }
      break
    }

    case 'aoe_atk_reduce': {
      const nearbyAtk = findNearbyEnemies(target, enemies, AOE_RADIUS)
      for (const enemy of [target, ...nearbyAtk]) {
        updatedDebuffs = addDebuff(updatedDebuffs, 'atk_reduce', enemy.instanceId, reaction.value, reaction.duration)
      }
      break
    }

    case 'stun_armor_break': {
      const nearbyQuake = findNearbyEnemies(target, enemies, AOE_RADIUS)
      for (const enemy of [target, ...nearbyQuake]) {
        updatedDebuffs = addDebuff(updatedDebuffs, 'stun', enemy.instanceId, 1, 1000)
        updatedDebuffs = addDebuff(updatedDebuffs, 'armor_break', enemy.instanceId, reaction.value, reaction.duration)
      }
      break
    }
  }

  return { debuffs: updatedDebuffs, damageEvents }
}

// 주변 적 검색
const findNearbyEnemies = (
  target: EnemyEntity,
  enemies: EnemyEntity[],
  radius: number,
): EnemyEntity[] =>
  enemies.filter(e => {
    if (e === target || e.isDead) return false
    const dx = e.x - target.x
    const dy = e.y - target.y
    return Math.sqrt(dx * dx + dy * dy) <= radius
  })

// 배열 셔플 후 N개 추출
const shuffleAndTake = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = shuffled[i]!
    shuffled[i] = shuffled[j]!
    shuffled[j] = temp
  }
  return shuffled.slice(0, n)
}
