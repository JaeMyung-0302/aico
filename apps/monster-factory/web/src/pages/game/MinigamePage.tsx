import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhaserGame } from '@/game/PhaserGame'
import { TimingClickScene } from '@/game/scenes/TimingClickScene'
import { PatternMemoryScene } from '@/game/scenes/PatternMemoryScene'
import { MashChallengeScene } from '@/game/scenes/MashChallengeScene'
import { eventBus } from '@/lib/event-bus'
import { useGameStore } from '@/stores/useGameStore'
import { useMonsterStore } from '@/stores/useMonsterStore'
import { GradeResult } from '@/components/GradeResult'
import type { GradeResult as GradeResultType, MinigameType } from '@monster-factory/shared'
import styles from './MinigamePage.module.scss'

const SCENE_MAP: Record<string, Phaser.Types.Scenes.SceneType> = {
  TimingClick: TimingClickScene,
  PatternMemory: PatternMemoryScene,
  MashChallenge: MashChallengeScene,
}

export const MinigamePage = () => {
  const navigate = useNavigate()
  const { currentMinigame, submitMinigameResult, fetchEnergy } = useGameStore()
  const { fetchMonsters } = useMonsterStore()
  const [gradeResult, setGradeResult] = useState<GradeResultType | null>(null)

  const scenes = useMemo(() => {
    if (!currentMinigame) return []
    const scene = SCENE_MAP[currentMinigame]
    return scene ? [scene] : []
  }, [currentMinigame])

  useEffect(() => {
    if (!currentMinigame) {
      navigate('/game')
      return
    }

    const handleComplete = async (data: unknown) => {
      const { minigameType, score, inputLog } = data as {
        minigameType: MinigameType
        score: number
        inputLog: unknown
      }

      try {
        const result = await submitMinigameResult(minigameType, score, inputLog)
        setGradeResult(result)
        fetchMonsters()
        fetchEnergy()
      } catch {
        navigate('/game')
      }
    }

    eventBus.on('minigame:complete', handleComplete)
    return () => {
      eventBus.off('minigame:complete', handleComplete)
    }
  }, [currentMinigame, navigate, submitMinigameResult, fetchMonsters, fetchEnergy])

  const handleClose = () => {
    setGradeResult(null)
    navigate('/game')
  }

  return (
    <div className={styles.container}>
      <div className={styles.gameArea}>
        {scenes.length > 0 && <PhaserGame scenes={scenes} />}
      </div>
      {gradeResult && <GradeResult result={gradeResult} onClose={handleClose} />}
    </div>
  )
}
