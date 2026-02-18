import { executeBattle } from './combat.js'
import { ELEMENT_SYNERGY } from '@monster-factory/shared'
import type { MonsterStats, Element, BattleResult, Skill } from '@monster-factory/shared'

interface TeamMember {
  id: string
  stats: MonsterStats
  element: Element
  skills?: Skill[]
}

interface TeamBattleRound {
  roundNumber: number
  playerMemberId: string
  enemyIndex: number
  result: BattleResult
}

export interface TeamBattleResult {
  winner: 'player' | 'enemy'
  rounds: TeamBattleRound[]
  totalGoldReward: number
  stars: number
  synergyType: string | null
}

// 속성 시너지 계산
const calcSynergy = (members: TeamMember[]): { type: string | null; modifiers: Partial<Record<keyof MonsterStats, number>> } => {
  const elements = members.map((m) => m.element)
  const uniqueElements = new Set(elements)

  // TRIO: 같은 속성 3마리
  if (elements.length === 3 && uniqueElements.size === 1) {
    return { type: 'TRIO', modifiers: ELEMENT_SYNERGY.TRIO.bonus }
  }

  // DUO: 같은 속성 2마리
  const elementCounts = new Map<string, number>()
  for (const el of elements) {
    elementCounts.set(el, (elementCounts.get(el) ?? 0) + 1)
  }
  for (const count of elementCounts.values()) {
    if (count >= ELEMENT_SYNERGY.DUO.minCount) {
      return { type: 'DUO', modifiers: ELEMENT_SYNERGY.DUO.bonus }
    }
  }

  // RAINBOW: 3종 이상 다른 속성
  if (uniqueElements.size >= ELEMENT_SYNERGY.RAINBOW.minTypes) {
    return { type: 'RAINBOW', modifiers: ELEMENT_SYNERGY.RAINBOW.bonus }
  }

  return { type: null, modifiers: {} }
}

// 시너지 보너스 적용
const applyModifiers = (stats: MonsterStats, modifiers: Partial<Record<keyof MonsterStats, number>>): MonsterStats => ({
  atk: stats.atk * (modifiers.atk ?? 1),
  def: stats.def * (modifiers.def ?? 1),
  hp: stats.hp * (modifiers.hp ?? 1),
  agi: stats.agi * (modifiers.agi ?? 1),
  int: stats.int * (modifiers.int ?? 1),
  rec: stats.rec * (modifiers.rec ?? 1),
})

/**
 * 팀 전투 실행 (순차 3:3)
 * 플레이어 파티 vs 적 팀. 각 라운드마다 1:1 전투.
 * 이긴 쪽이 다음 라운드에도 계속 싸움 (킹오브전).
 */
export const executeTeamBattle = (
  playerTeam: TeamMember[],
  enemyTeam: { stats: MonsterStats; element: Element; skills?: Skill[] }[],
): TeamBattleResult => {
  const synergy = calcSynergy(playerTeam)

  // 시너지 적용된 플레이어 스탯
  const boostedPlayers = playerTeam.map((m) => ({
    ...m,
    stats: applyModifiers(m.stats, synergy.modifiers),
  }))

  const rounds: TeamBattleRound[] = []
  let playerIdx = 0
  let enemyIdx = 0
  let roundNumber = 0

  while (playerIdx < boostedPlayers.length && enemyIdx < enemyTeam.length) {
    roundNumber++
    const player = boostedPlayers[playerIdx]!
    const enemy = enemyTeam[enemyIdx]!

    const result = executeBattle(
      { stats: player.stats, element: player.element, skills: player.skills },
      { stats: enemy.stats, element: enemy.element, skills: enemy.skills },
    )

    rounds.push({
      roundNumber,
      playerMemberId: player.id,
      enemyIndex: enemyIdx,
      result,
    })

    if (result.winner === 'player') {
      enemyIdx++
    } else {
      playerIdx++
    }
  }

  const winner = enemyIdx >= enemyTeam.length ? 'player' : 'enemy'

  // 별점: 승리 시 남은 파티원 수 기반
  let stars = 0
  if (winner === 'player') {
    const surviving = boostedPlayers.length - playerIdx
    stars = surviving >= 3 ? 3 : surviving >= 2 ? 2 : 1
  }

  return {
    winner,
    rounds,
    totalGoldReward: 0, // stage route에서 설정
    stars,
    synergyType: synergy.type,
  }
}
