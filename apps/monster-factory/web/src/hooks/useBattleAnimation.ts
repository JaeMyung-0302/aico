import { useState, useEffect, useCallback, useRef } from 'react'
import type { BattleTurnLog } from '@monster-factory/shared'

export type BattlePhase = 'idle' | 'attack' | 'hit' | 'damage' | 'wait'

interface BattleAnimationState {
  currentTurnIndex: number
  phase: BattlePhase
  playerHp: number
  enemyHp: number
  maxPlayerHp: number
  maxEnemyHp: number
  currentDamage: number | null
  currentAttacker: 'player' | 'enemy' | null
  isCritical: boolean
  isPlaying: boolean
  isFinished: boolean
  skillName: string | null
  skillElement: string | null
  skillCategory: 'physical' | 'magical' | null
}

const PHASE_DURATIONS: Record<BattlePhase, number> = {
  idle: 500,
  attack: 400,
  hit: 300,
  damage: 500,
  wait: 300,
}

export const useBattleAnimation = (turns: BattleTurnLog[]) => {
  const firstTurn = turns[0]
  const initialPlayerHp = firstTurn
    ? firstTurn.playerHp + (firstTurn.attacker === 'enemy' ? firstTurn.damage : 0)
    : 0
  const initialEnemyHp = firstTurn
    ? firstTurn.enemyHp + (firstTurn.attacker === 'player' ? firstTurn.damage : 0)
    : 0

  // 첫 턴 이전의 최대 HP 계산
  const maxPlayerHp = turns.length > 0
    ? Math.max(...turns.map((t) => t.playerHp), initialPlayerHp)
    : 0
  const maxEnemyHp = turns.length > 0
    ? Math.max(...turns.map((t) => t.enemyHp), initialEnemyHp)
    : 0

  const [state, setState] = useState<BattleAnimationState>({
    currentTurnIndex: -1,
    phase: 'idle',
    playerHp: maxPlayerHp,
    enemyHp: maxEnemyHp,
    maxPlayerHp,
    maxEnemyHp,
    currentDamage: null,
    currentAttacker: null,
    isCritical: false,
    isPlaying: false,
    isFinished: false,
    skillName: null,
    skillElement: null,
    skillCategory: null,
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const turnIndexRef = useRef(-1)

  const playNextPhase = useCallback(
    (turnIdx: number, phase: BattlePhase) => {
      if (turnIdx >= turns.length) {
        setState((prev) => ({ ...prev, phase: 'idle', isPlaying: false, isFinished: true, currentDamage: null, currentAttacker: null }))
        return
      }

      const turn = turns[turnIdx]
      if (!turn) return

      switch (phase) {
        case 'attack':
          setState((prev) => ({
            ...prev,
            currentTurnIndex: turnIdx,
            phase: 'attack',
            currentAttacker: turn.attacker,
            currentDamage: null,
            isCritical: turn.isCritical,
            skillName: turn.skillName ?? null,
            skillElement: turn.skillElement ?? null,
            skillCategory: turn.skillCategory ?? null,
          }))
          timerRef.current = setTimeout(() => playNextPhase(turnIdx, 'hit'), PHASE_DURATIONS.attack)
          break

        case 'hit':
          setState((prev) => ({
            ...prev,
            phase: 'hit',
            currentDamage: turn.damage,
            playerHp: turn.playerHp,
            enemyHp: turn.enemyHp,
          }))
          timerRef.current = setTimeout(() => playNextPhase(turnIdx, 'damage'), PHASE_DURATIONS.hit)
          break

        case 'damage':
          setState((prev) => ({ ...prev, phase: 'damage' }))
          timerRef.current = setTimeout(() => playNextPhase(turnIdx, 'wait'), PHASE_DURATIONS.damage)
          break

        case 'wait':
          setState((prev) => ({ ...prev, phase: 'wait', currentDamage: null, currentAttacker: null }))
          turnIndexRef.current = turnIdx + 1
          timerRef.current = setTimeout(() => playNextPhase(turnIdx + 1, 'attack'), PHASE_DURATIONS.wait)
          break

        default:
          break
      }
    },
    [turns],
  )

  useEffect(() => {
    if (turns.length === 0) return

    // 초기 대기 후 자동 시작
    timerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isPlaying: true }))
      playNextPhase(0, 'attack')
    }, PHASE_DURATIONS.idle)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [turns, playNextPhase])

  return state
}
