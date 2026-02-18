import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDungeonStore } from '@/stores/useDungeonStore'
import { useGameStore } from '@/stores/useGameStore'
import { useMonsterStore } from '@/stores/useMonsterStore'
import { DUNGEON_FLOORS, type DungeonDifficulty } from '@monster-factory/shared'
import styles from './DungeonSelectPage.module.scss'

const DIFFICULTIES: { value: DungeonDifficulty; label: string }[] = [
  { value: 'Easy', label: '쉬움' },
  { value: 'Normal', label: '보통' },
  { value: 'Hard', label: '어려움' },
  { value: 'Hell', label: '지옥' },
]

export const DungeonSelectPage = () => {
  const navigate = useNavigate()
  const { enterDungeon, loading } = useDungeonStore()
  const { energy, fetchEnergy } = useGameStore()
  const { fetchMonsters } = useMonsterStore()
  const [selectedFloor, setSelectedFloor] = useState(1)
  const [selectedDifficulty, setSelectedDifficulty] = useState<DungeonDifficulty>('Easy')

  const handleEnter = async () => {
    try {
      await enterDungeon(selectedFloor, selectedDifficulty)
      fetchEnergy()
      fetchMonsters()
      navigate('/dungeon/battle')
    } catch {
      // 에너지 부족 등
    }
  }

  const hasEnergy = energy !== null && energy.remaining >= 2

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>솔로 던전</h2>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>층 선택</h3>
        <div className={styles.floorGrid}>
          {Array.from({ length: DUNGEON_FLOORS }, (_, i) => i + 1).map(
            (floor) => (
              <button
                key={floor}
                className={`${styles.floorBtn} ${selectedFloor === floor ? styles.selected : ''}`}
                onClick={() => setSelectedFloor(floor)}
              >
                {floor}F
              </button>
            ),
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>난이도</h3>
        <div className={styles.difficultyGrid}>
          {DIFFICULTIES.map(({ value, label }) => (
            <button
              key={value}
              className={`${styles.diffBtn} ${selectedDifficulty === value ? styles.selected : ''}`}
              onClick={() => setSelectedDifficulty(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        className={styles.enterBtn}
        onClick={handleEnter}
        disabled={loading || !hasEnergy}
      >
        {loading ? '전투 중...' : !hasEnergy ? '에너지 부족 (2 필요)' : '입장'}
      </button>

      <button className={styles.backBtn} onClick={() => navigate('/game')}>
        돌아가기
      </button>
    </div>
  )
}
