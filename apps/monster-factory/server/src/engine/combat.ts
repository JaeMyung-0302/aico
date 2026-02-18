import {
  calcPhysDamage,
  calcMagDamage,
  calcElementMultiplier,
  CRITICAL_MULTIPLIER,
  BASE_CRITICAL_RATE,
  HP_MULTIPLIER,
  type BattleTurnLog,
  type BattleResult,
  type MonsterStats,
  type Element,
  type Skill,
} from '@monster-factory/shared'
import { selectSkill, updateCooldowns } from './skill-select.js'

interface Combatant {
  stats: MonsterStats
  element: Element
  hp: number
  skills: Skill[]
  cooldownMap: Map<string, number>
}

/**
 * 턴제 자동 전투 실행
 */
export const executeBattle = (
  player: { stats: MonsterStats; element: Element; skills?: Skill[] },
  enemy: { stats: MonsterStats; element: Element; skills?: Skill[] },
): BattleResult => {
  const playerState: Combatant = {
    ...player,
    hp: player.stats.hp * HP_MULTIPLIER,
    skills: player.skills ?? [],
    cooldownMap: new Map(),
  }
  const enemyState: Combatant = {
    ...enemy,
    hp: enemy.stats.hp * HP_MULTIPLIER,
    skills: enemy.skills ?? [],
    cooldownMap: new Map(),
  }

  const turns: BattleTurnLog[] = []
  let turn = 0
  const maxTurns = 50

  while (playerState.hp > 0 && enemyState.hp > 0 && turn < maxTurns) {
    turn++

    // 속도 순서 (agi 높은 쪽 먼저)
    const playerFirst = player.stats.agi >= enemy.stats.agi

    if (playerFirst) {
      attackTurn(playerState, enemyState, turns, turn, 'player')
      if (enemyState.hp <= 0) break
      attackTurn(enemyState, playerState, turns, turn, 'enemy')
    } else {
      attackTurn(enemyState, playerState, turns, turn, 'enemy')
      if (playerState.hp <= 0) break
      attackTurn(playerState, enemyState, turns, turn, 'player')
    }
  }

  const winner = playerState.hp > 0 ? 'player' : 'enemy'

  return {
    winner: winner as 'player' | 'enemy',
    turns,
    goldReward: 0, // dungeon 엔진에서 설정
  }
}

const attackTurn = (
  attacker: Combatant,
  defender: Combatant,
  turns: BattleTurnLog[],
  turn: number,
  who: 'player' | 'enemy',
) => {
  // 스킬 선택 (쿨다운 기반)
  const skill = selectSkill(attacker.skills, attacker.cooldownMap, attacker.element)

  // TODO: accuracy 기반 miss 판정 추가 (현재 모든 스킬 accuracy=1.0)

  // 물리/마법 분기 (마법: INT vs INT — 물리형 몬스터는 마법에 취약하게 설계)
  const baseDmg =
    skill.category === 'physical'
      ? calcPhysDamage(attacker.stats.atk, skill.power, defender.stats.def)
      : calcMagDamage(attacker.stats.int, skill.power, defender.stats.int)

  const elementMul = calcElementMultiplier(skill.element, defender.element)
  const isCritical = Math.random() < BASE_CRITICAL_RATE
  const critMul = isCritical ? CRITICAL_MULTIPLIER : 1

  const damage = Math.max(1, Math.floor(baseDmg * elementMul * critMul))
  defender.hp = Math.max(0, defender.hp - damage)

  // 쿨다운 업데이트
  attacker.cooldownMap = updateCooldowns(attacker.cooldownMap, skill)

  turns.push({
    turn,
    attacker: who,
    damage,
    playerHp: who === 'player' ? attacker.hp : defender.hp,
    enemyHp: who === 'player' ? defender.hp : attacker.hp,
    isCritical,
    skillName: skill.name,
    skillElement: skill.element,
    skillCategory: skill.category,
  })
}
