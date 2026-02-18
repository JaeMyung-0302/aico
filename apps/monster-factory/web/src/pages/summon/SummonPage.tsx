import { useState } from 'react'
import { useMonsterStore } from '@/stores/useMonsterStore'
import { useUserStore } from '@/stores/useUserStore'
import { SummonAnimation } from '@/components/SummonAnimation'
import { SUMMON_COST } from '@monster-factory/shared'
import type { Monster, SummonType } from '@monster-factory/shared'
import styles from './SummonPage.module.scss'

export const SummonPage = () => {
  const { monsters, summon } = useMonsterStore()
  const { user, fetchUser } = useUserStore()
  const [summoning, setSummoning] = useState(false)
  const [result, setResult] = useState<{ monster: Monster; isNew: boolean } | null>(null)
  const isFirstSummon = monsters.length === 0

  const handleSummon = async (summonType: SummonType) => {
    setSummoning(true)
    try {
      const res = await summon(summonType)
      setResult({ monster: res.monster, isNew: res.isNew })
      await fetchUser()
    } catch {
      // error handled by store
    } finally {
      setSummoning(false)
    }
  }

  if (result) {
    return (
      <SummonAnimation
        imageUrl={result.monster.imageUrl}
        name={result.monster.speciesName ?? `${result.monster.element} ${result.monster.personality}`}
        element={result.monster.element}
        rarity={result.monster.rarity ?? 'Common'}
        growthStage={result.monster.growthStage}
        isNew={result.isNew}
        onComplete={() => setResult(null)}
      />
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{isFirstSummon ? '첫 번째 몬스터를 소환하세요!' : '소환'}</h2>
      <div className={styles.buttons}>
        {isFirstSummon ? (
          <button
            className={`${styles.summonBtn} ${styles.premium}`}
            onClick={() => handleSummon('Gold')}
            disabled={summoning}
          >
            <span className={styles.btnLabel}>무료 소환</span>
            <span className={styles.btnCost}>FREE</span>
          </button>
        ) : (
          <>
            <button
              className={styles.summonBtn}
              onClick={() => handleSummon('Gold')}
              disabled={summoning || !user || user.gold < SUMMON_COST.Gold}
            >
              <span className={styles.btnLabel}>골드 소환</span>
              <span className={styles.btnCost}>{SUMMON_COST.Gold} Gold</span>
            </button>
            <button
              className={`${styles.summonBtn} ${styles.premium}`}
              onClick={() => handleSummon('SummonStone')}
              disabled={summoning || !user || user.summonStones < SUMMON_COST.SummonStone}
            >
              <span className={styles.btnLabel}>소환석 소환</span>
              <span className={styles.btnCost}>{SUMMON_COST.SummonStone} Stone</span>
            </button>
          </>
        )}
      </div>
      {!isFirstSummon && user && (
        <div className={styles.resources}>
          <span>골드: {user.gold}</span>
          <span>소환석: {user.summonStones}</span>
        </div>
      )}
    </div>
  )
}
