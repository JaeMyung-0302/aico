import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhaserGame } from '@/game/PhaserGame'
import { BootScene } from '@/game/scenes/BootScene'
import { GameScene } from '@/game/scenes/GameScene'
import { UIScene } from '@/game/scenes/UIScene'
import { useGameStore } from '@/stores/useGameStore'
import { useGrowthStore } from '@/stores/useGrowthStore'
import { useReactionStore } from '@/stores/useReactionStore'
import { eventBus } from '@/lib/event-bus'
import type { ReactionType, HeroState, EvolutionBranch } from '@/types'
import classNames from 'classnames/bind'
import styles from './GamePage.module.scss'

const cx = classNames.bind(styles)

const scenes = [BootScene, GameScene, UIScene]

interface GameEventPayload {
  wave: number
  score: number
  artifacts: string[]
}

interface EvolutionModal {
  unitInstanceId: string
  branches: [EvolutionBranch, EvolutionBranch]
}

const ELEMENT_LABELS: Record<string, string> = {
  fire: '🔥', water: '💧', wind: '🌪️', thunder: '⚡', earth: '🪨',
}

const GamePage = () => {
  const navigate = useNavigate()
  const { isGameOver, isGameClear, heroState, updateFromPhaser, setGameOver, setGameClear, reset } = useGameStore()
  const [evolutionModal, setEvolutionModal] = useState<EvolutionModal | null>(null)

  const handleSkillUse = useCallback((skillIndex: number) => {
    eventBus.emit('hero-use-skill', skillIndex)
  }, [])

  const handleEvolutionSelect = useCallback((unitInstanceId: string, branchId: string) => {
    eventBus.emit('evolution-select', { unitInstanceId, branchId })
    setEvolutionModal(null)
  }, [])

  useEffect(() => {
    reset()

    // 성장 트리 보너스를 Phaser에 전달
    const growthBonuses = useGrowthStore.getState().getBonuses()
    eventBus.emit('growth-bonuses', growthBonuses)

    const handleStateUpdate = (...args: unknown[]) => {
      const state = args[0] as Partial<{ wave: number; gold: number; hp: number; maxHp: number; score: number; unitCount: number; isWaveActive: boolean; heroState: HeroState }>
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

    const handleEvolutionAvailable = (...args: unknown[]) => {
      const data = args[0] as { unitInstanceId: string; branches: [EvolutionBranch, EvolutionBranch] } | undefined
      if (data) setEvolutionModal({ unitInstanceId: data.unitInstanceId, branches: data.branches })
    }

    eventBus.on('game-state-update', handleStateUpdate)
    eventBus.on('game-over', handleGameOver)
    eventBus.on('game-clear', handleGameClear)
    eventBus.on('reaction_triggered', handleReactionTriggered)
    eventBus.on('evolution-available', handleEvolutionAvailable)

    return () => {
      eventBus.off('game-state-update', handleStateUpdate)
      eventBus.off('game-over', handleGameOver)
      eventBus.off('game-clear', handleGameClear)
      eventBus.off('reaction_triggered', handleReactionTriggered)
      eventBus.off('evolution-available', handleEvolutionAvailable)
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
      {heroState && (
        <div className={cx('heroPanel')}>
          <div className={cx('heroInfo')}>
            <span className={cx('heroElement')}>{ELEMENT_LABELS[heroState.element] ?? '?'}</span>
            <div className={cx('heroHpBar')}>
              <div
                className={cx('heroHpFill')}
                style={{ width: `${(heroState.currentHp / heroState.maxHp) * 100}%` }}
              />
            </div>
            {heroState.isDead && (
              <span className={cx('reviveTimer')}>부활 {heroState.reviveTimer}s</span>
            )}
          </div>
          <div className={cx('heroSkills')}>
            <button
              className={cx('skillBtn', { disabled: heroState.skill1Cooldown > 0 || heroState.isDead })}
              onClick={() => handleSkillUse(0)}
              disabled={heroState.skill1Cooldown > 0 || heroState.isDead}
            >
              Q{heroState.skill1Cooldown > 0 && <span className={cx('cooldown')}>{heroState.skill1Cooldown}</span>}
            </button>
            <button
              className={cx('skillBtn', { disabled: heroState.skill2Cooldown > 0 || heroState.isDead })}
              onClick={() => handleSkillUse(1)}
              disabled={heroState.skill2Cooldown > 0 || heroState.isDead}
            >
              W{heroState.skill2Cooldown > 0 && <span className={cx('cooldown')}>{heroState.skill2Cooldown}</span>}
            </button>
          </div>
        </div>
      )}
      {evolutionModal && (
        <div className={cx('evoOverlay')} onClick={() => setEvolutionModal(null)}>
          <div className={cx('evoModal')} onClick={(e) => e.stopPropagation()}>
            <h3 className={cx('evoTitle')}>진화 선택</h3>
            <div className={cx('evoBranches')}>
              {evolutionModal.branches.map((branch) => (
                <button
                  key={branch.id}
                  className={cx('evoBranch')}
                  onClick={() => handleEvolutionSelect(evolutionModal.unitInstanceId, branch.id)}
                >
                  <span className={cx('evoBranchName')}>{branch.name}</span>
                  <span className={cx('evoBranchDesc')}>{branch.description}</span>
                  <div className={cx('evoBranchStats')}>
                    <span>공격 {branch.baseAtk}</span>
                    <span>공속 {branch.atkSpeed}</span>
                    <span>사거리 {branch.range}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GamePage
