import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhaserGame } from '@/game/PhaserGame'
import { BootScene } from '@/game/scenes/BootScene'
import { GameScene } from '@/game/scenes/GameScene'
import { UIScene } from '@/game/scenes/UIScene'
import { useGameStore } from '@/stores/useGameStore'
import { useGrowthStore } from '@/stores/useGrowthStore'
import { useReactionStore } from '@/stores/useReactionStore'
import { eventBus } from '@/lib/event-bus'
import type { ReactionType } from '@/types'
import classNames from 'classnames/bind'
import styles from './GamePage.module.scss'

const cx = classNames.bind(styles)

const scenes = [BootScene, GameScene, UIScene]

interface GameEventPayload {
  wave: number
  score: number
  artifacts: string[]
}

const GamePage = () => {
  const navigate = useNavigate()
  const { isGameOver, isGameClear, updateFromPhaser, setGameOver, setGameClear, reset } = useGameStore()

  useEffect(() => {
    reset()

    // 성장 트리 보너스를 Phaser에 전달
    const growthBonuses = useGrowthStore.getState().getBonuses()
    eventBus.emit('growth-bonuses', growthBonuses)

    const handleStateUpdate = (...args: unknown[]) => {
      const state = args[0] as Partial<{ wave: number; gold: number; hp: number; maxHp: number; score: number; unitCount: number; isWaveActive: boolean }>
      updateFromPhaser(state)
    }
    const handleGameOver = (...args: unknown[]) => {
      const data = args[0] as GameEventPayload | undefined
      if (data) updateFromPhaser({ wave: data.wave, score: data.score, artifacts: data.artifacts })
      setGameOver()
    }
    const handleGameClear = (...args: unknown[]) => {
      const data = args[0] as GameEventPayload | undefined
      if (data) updateFromPhaser({ wave: data.wave, score: data.score, artifacts: data.artifacts })
      setGameClear()
    }

    const VALID_REACTIONS: Set<string> = new Set([
      'steam', 'firestorm', 'overload', 'magma', 'blizzard',
      'electro', 'swamp_reaction', 'thunderstorm', 'sandstorm', 'quake',
    ])
    const handleReactionTriggered = (...args: unknown[]) => {
      const data = args[0] as { type: string } | undefined
      if (data?.type && VALID_REACTIONS.has(data.type)) {
        useReactionStore.getState().discoverReaction(data.type as ReactionType)
      }
    }

    eventBus.on('game-state-update', handleStateUpdate)
    eventBus.on('game-over', handleGameOver)
    eventBus.on('game-clear', handleGameClear)
    eventBus.on('reaction_triggered', handleReactionTriggered)

    return () => {
      eventBus.off('game-state-update', handleStateUpdate)
      eventBus.off('game-over', handleGameOver)
      eventBus.off('game-clear', handleGameClear)
      eventBus.off('reaction_triggered', handleReactionTriggered)
    }
  }, [reset, updateFromPhaser, setGameOver, setGameClear])

  useEffect(() => {
    if (isGameOver || isGameClear) {
      navigate('/result')
    }
  }, [isGameOver, isGameClear, navigate])

  return (
    <div className={cx('container')}>
      <PhaserGame scenes={scenes} className={cx('gameCanvas')} />
    </div>
  )
}

export default GamePage
