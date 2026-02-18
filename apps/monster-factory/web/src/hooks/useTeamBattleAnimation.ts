import { useState, useEffect, useCallback, useRef } from 'react'
import type { TeamBattleRound, TeamBattlePhase, TeamMember } from '@monster-factory/shared'

interface TeamBattleAnimationState {
  currentRoundIndex: number
  currentTurnIndex: number
  phase: TeamBattlePhase
  playerMember: TeamMember | null
  enemyMember: TeamMember | null
  playerHp: number
  enemyHp: number
  maxPlayerHp: number
  maxEnemyHp: number
  currentDamage: number | null
  currentAttacker: 'player' | 'enemy' | null
  isCritical: boolean
  isPlaying: boolean
  isFinished: boolean
  isSkipped: boolean
  skillName: string | null
  skillElement: string | null
  skillCategory: 'physical' | 'magical' | null
}

const PHASE_DURATIONS: Record<TeamBattlePhase, number> = {
  idle: 500,
  round_intro: 800,
  attack: 400,
  hit: 300,
  damage: 500,
  wait: 300,
  round_end: 600,
  round_transition: 600,
  battle_end: 500,
}

const MAX_ROUNDS = 50

export const useTeamBattleAnimation = (rounds: TeamBattleRound[]) => {
  const [state, setState] = useState<TeamBattleAnimationState>({
    currentRoundIndex: -1,
    currentTurnIndex: -1,
    phase: 'idle',
    playerMember: null,
    enemyMember: null,
    playerHp: 0,
    enemyHp: 0,
    maxPlayerHp: 0,
    maxEnemyHp: 0,
    currentDamage: null,
    currentAttacker: null,
    isCritical: false,
    isPlaying: false,
    isFinished: false,
    isSkipped: false,
    skillName: null,
    skillElement: null,
    skillCategory: null,
  })

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skippedRef = useRef(false)
  const roundsRef = useRef(rounds)

  // rounds 변경 시 ref 업데이트
  useEffect(() => {
    roundsRef.current = rounds
  }, [rounds])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleNext = useCallback(
    (fn: () => void, duration: number) => {
      clearTimer()
      timerRef.current = setTimeout(fn, duration)
    },
    [clearTimer],
  )

  const playPhase = useCallback(
    (roundIdx: number, turnIdx: number, phase: TeamBattlePhase) => {
      if (skippedRef.current) return
      const currentRounds = roundsRef.current

      if (roundIdx >= currentRounds.length || roundIdx >= MAX_ROUNDS) {
        setState((prev) => ({
          ...prev,
          phase: 'battle_end',
          isPlaying: false,
          isFinished: true,
          currentDamage: null,
          currentAttacker: null,
        }))
        return
      }

      const round = currentRounds[roundIdx]
      if (!round) return

      const turns = round.battleResult.turns

      switch (phase) {
        case 'round_intro': {
          const firstTurn = turns[0]
          const maxPHp = firstTurn
            ? firstTurn.playerHp + (firstTurn.attacker === 'enemy' ? firstTurn.damage : 0)
            : round.playerMember.stats.hp
          const maxEHp = firstTurn
            ? firstTurn.enemyHp + (firstTurn.attacker === 'player' ? firstTurn.damage : 0)
            : round.enemyMember.stats.hp

          setState((prev) => ({
            ...prev,
            currentRoundIndex: roundIdx,
            currentTurnIndex: -1,
            phase: 'round_intro',
            playerMember: round.playerMember,
            enemyMember: round.enemyMember,
            playerHp: maxPHp,
            enemyHp: maxEHp,
            maxPlayerHp: maxPHp,
            maxEnemyHp: maxEHp,
            currentDamage: null,
            currentAttacker: null,
            isCritical: false,
          }))
          scheduleNext(
            () => playPhase(roundIdx, 0, 'attack'),
            PHASE_DURATIONS.round_intro,
          )
          break
        }

        case 'attack': {
          if (turnIdx >= turns.length) {
            playPhase(roundIdx, turnIdx, 'round_end')
            return
          }
          const turn = turns[turnIdx]
          if (!turn) return

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
          scheduleNext(
            () => playPhase(roundIdx, turnIdx, 'hit'),
            PHASE_DURATIONS.attack,
          )
          break
        }

        case 'hit': {
          const turn = turns[turnIdx]
          if (!turn) return

          setState((prev) => ({
            ...prev,
            phase: 'hit',
            currentDamage: turn.damage,
            playerHp: turn.playerHp,
            enemyHp: turn.enemyHp,
          }))
          scheduleNext(
            () => playPhase(roundIdx, turnIdx, 'damage'),
            PHASE_DURATIONS.hit,
          )
          break
        }

        case 'damage': {
          setState((prev) => ({ ...prev, phase: 'damage' }))
          scheduleNext(
            () => playPhase(roundIdx, turnIdx, 'wait'),
            PHASE_DURATIONS.damage,
          )
          break
        }

        case 'wait': {
          setState((prev) => ({
            ...prev,
            phase: 'wait',
            currentDamage: null,
            currentAttacker: null,
          }))
          scheduleNext(
            () => playPhase(roundIdx, turnIdx + 1, 'attack'),
            PHASE_DURATIONS.wait,
          )
          break
        }

        case 'round_end': {
          setState((prev) => ({ ...prev, phase: 'round_end' }))
          const nextRoundIdx = roundIdx + 1
          if (nextRoundIdx < currentRounds.length) {
            scheduleNext(
              () => playPhase(roundIdx, turnIdx, 'round_transition'),
              PHASE_DURATIONS.round_end,
            )
          } else {
            scheduleNext(
              () => playPhase(nextRoundIdx, 0, 'round_intro'),
              PHASE_DURATIONS.round_end,
            )
          }
          break
        }

        case 'round_transition': {
          setState((prev) => ({ ...prev, phase: 'round_transition' }))
          scheduleNext(
            () => playPhase(roundIdx + 1, 0, 'round_intro'),
            PHASE_DURATIONS.round_transition,
          )
          break
        }

        default:
          break
      }
    },
    [scheduleNext],
  )

  const skip = useCallback(() => {
    skippedRef.current = true
    clearTimer()
    setState((prev) => ({
      ...prev,
      phase: 'battle_end',
      isPlaying: false,
      isFinished: true,
      isSkipped: true,
      currentDamage: null,
      currentAttacker: null,
    }))
  }, [clearTimer])

  useEffect(() => {
    if (rounds.length === 0) {
      setState((prev) => ({ ...prev, isFinished: true }))
      return
    }

    scheduleNext(() => {
      setState((prev) => ({ ...prev, isPlaying: true }))
      playPhase(0, 0, 'round_intro')
    }, PHASE_DURATIONS.idle)

    return () => {
      clearTimer()
    }
  }, [rounds.length, playPhase, scheduleNext, clearTimer])

  return { ...state, skip }
}
