import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMonsterStore } from '@/stores/useMonsterStore'
import { MonsterCard } from '@/components/MonsterCard'
import styles from './MonsterListPage.module.scss'

export const MonsterListPage = () => {
  const navigate = useNavigate()
  const { monsters, loading, fetchMonsters } = useMonsterStore()

  useEffect(() => {
    fetchMonsters()
  }, [fetchMonsters])

  if (loading) return <div style={{ padding: 20 }}>로딩 중...</div>

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>보유 몬스터 ({monsters.length})</h2>
      <div className={styles.grid}>
        {monsters.map((m) => (
          <MonsterCard
            key={m.id}
            imageUrl={m.imageUrl}
            name={m.speciesName ?? m.element}
            element={m.element}
            rarity={m.rarity ?? 'Common'}
            growthStage={m.growthStage}
            onClick={() => navigate(`/monsters/${m.id}`)}
          />
        ))}
      </div>
    </div>
  )
}
