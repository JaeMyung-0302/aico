import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMonsterStore } from '@/stores/useMonsterStore'
import { useGameStore } from '@/stores/useGameStore'
import { MonsterCard } from '@/components/MonsterCard'
import { EnergyIndicator } from '@/components/EnergyIndicator'
import styles from './GamePage.module.scss'

const QUICK_ACTIONS = [
  { path: '/stages', label: '모험', emoji: '⚔️' },
  { path: '/dungeon', label: '던전', emoji: '🏰' },
  { path: '/minigame', label: '훈련', emoji: '💪' },
  { path: '/party', label: '파티', emoji: '👥' },
  { path: '/fusion', label: '합성', emoji: '🔮' },
  { path: '/inventory', label: '인벤토리', emoji: '🎒' },
]

export const GamePage = () => {
  const navigate = useNavigate()
  const { activeMonster: monster, loading, fetchMonsters } = useMonsterStore()
  const { energy, fetchEnergy } = useGameStore()

  useEffect(() => {
    fetchMonsters()
    fetchEnergy()
  }, [fetchMonsters, fetchEnergy])

  useEffect(() => {
    if (!loading && !monster) {
      navigate('/summon')
    }
  }, [loading, monster, navigate])

  if (loading || !monster) {
    return null
  }

  return (
    <div className={styles.container}>
      <div className={styles.activeCard}>
        <MonsterCard
          imageUrl={monster.imageUrl}
          name={monster.name ?? monster.speciesName ?? '이름 없음'}
          element={monster.element}
          rarity={monster.rarity ?? 'Common'}
          growthStage={monster.growthStage}
          onClick={() => navigate(`/monsters/${monster.id}`)}
          size="lg"
        />
      </div>

      {energy && <EnergyIndicator energy={energy} />}

      <div className={styles.actionGrid}>
        {QUICK_ACTIONS.map(({ path, label, emoji }) => (
          <button
            key={path}
            className={styles.actionBtn}
            onClick={() => navigate(path)}
          >
            <span className={styles.actionEmoji}>{emoji}</span>
            <span className={styles.actionLabel}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
