import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import type { GameState, DeathEvent, RankingEntry } from '@wasd/shared'
import { SocketEvents, STAGES, TILE_SIZE, PLAYER_SIZE } from '@wasd/shared'
import { socket } from '@/lib/socket'
import { useGameStore } from '@/stores/useGameStore'
import { useGameInput } from '@/hooks/useGameInput'
import { sound } from '@/game/sound'
import {
  createEffectsState,
  emitDeathParticles,
  emitStageClearParticles,
  triggerScreenShake,
} from '@/game/render-effects'
import GameCanvas from './components/GameCanvas'
import GameHUD from './components/GameHUD'
import KeyIndicator from './components/KeyIndicator'
import StageTransition from './components/StageTransition'
import DeathLog from './components/DeathLog'
import styles from './GamePage.module.scss'

const cx = classNames.bind(styles)

const GamePage = () => {
  const navigate = useNavigate()
  const roomCode = useGameStore((s) => s.roomCode)
  const myKeys = useGameStore((s) => s.myKeys)
  const gameState = useGameStore((s) => s.gameState)
  const gamePhase = useGameStore((s) => s.gamePhase)
  const deathEvent = useGameStore((s) => s.deathEvent)
  const prevCoinsRef = useRef(0)
  const effectsRef = useRef(createEffectsState())

  useGameInput()

  const handleDismissDeathLog = useCallback(() => {
    useGameStore.getState().setDeathEvent(null)
  }, [])

  useEffect(() => {
    if (!roomCode) {
      navigate('/')
      return
    }

    const handleGameState = (state: GameState) => {
      const prevCoins = prevCoinsRef.current
      if (state.coins > prevCoins) {
        sound.coin()
      }
      prevCoinsRef.current = state.coins
      useGameStore.getState().applyServerState(state)
    }

    const handleDeath = (data: DeathEvent) => {
      sound.death()
      useGameStore.getState().setDeathEvent(data)
      // 사망 이펙트: 플레이어 위치
      const state = useGameStore.getState().gameState
      if (state) {
        const px = state.position.x + PLAYER_SIZE / 2
        const py = state.position.y + PLAYER_SIZE / 2
        effectsRef.current = emitDeathParticles(effectsRef.current, px, py)
        effectsRef.current = triggerScreenShake(effectsRef.current)
      }
    }

    const handleStageClear = () => {
      sound.stageClear()
      useGameStore.getState().setGamePhase('stage-clear')
      // 스테이지 클리어 파티클
      const state = useGameStore.getState().gameState
      if (state) {
        const tileMap = STAGES[state.stage - 1]
        const w = (tileMap?.[0]?.length ?? 20) * TILE_SIZE
        const h = (tileMap?.length ?? 15) * TILE_SIZE
        effectsRef.current = emitStageClearParticles(effectsRef.current, w, h)
      }
    }

    const handleGameComplete = (data: { deaths: number; elapsedTime: number; ranking?: RankingEntry[]; myRank?: number | null }) => {
      sound.gameComplete()
      useGameStore.getState().setGameResult(data)
    }

    socket.on(SocketEvents.GAME_STATE, handleGameState)
    socket.on(SocketEvents.DEATH, handleDeath)
    socket.on(SocketEvents.STAGE_CLEAR, handleStageClear)
    socket.on(SocketEvents.GAME_COMPLETE, handleGameComplete)

    return () => {
      socket.off(SocketEvents.GAME_STATE, handleGameState)
      socket.off(SocketEvents.DEATH, handleDeath)
      socket.off(SocketEvents.STAGE_CLEAR, handleStageClear)
      socket.off(SocketEvents.GAME_COMPLETE, handleGameComplete)
    }
  }, [navigate, roomCode])

  useEffect(() => {
    if (gamePhase === 'complete' && roomCode) {
      navigate(`/result/${roomCode}`)
    }
  }, [gamePhase, roomCode, navigate])

  if (!roomCode || !gameState) {
    return (
      <div className={cx('container')}>
        <div className={cx('loading')}>게임 로딩 중...</div>
      </div>
    )
  }

  const tileMap = STAGES[gameState.stage - 1]
  if (!tileMap) return null

  return (
    <div className={cx('container')}>
      <GameHUD gameState={gameState} />
      <div className={cx('gameArea')}>
        <GameCanvas gameState={gameState} tileMap={tileMap} effectsRef={effectsRef} />
      </div>
      <KeyIndicator myKeys={myKeys} />

      {deathEvent && (
        <DeathLog deathEvent={deathEvent} onDismiss={handleDismissDeathLog} />
      )}
      {gamePhase === 'stage-clear' && <StageTransition stage={gameState.stage} />}
    </div>
  )
}

export default GamePage
