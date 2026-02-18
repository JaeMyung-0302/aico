import { useEffect, useState } from 'react'
import { MonsterCard } from './MonsterCard'
import styles from './SummonAnimation.module.scss'

interface SummonAnimationProps {
  imageUrl: string | null
  name: string
  element: string
  rarity: string
  growthStage: string
  isNew: boolean
  onComplete: () => void
}

export const SummonAnimation = ({
  imageUrl,
  name,
  element,
  rarity,
  growthStage,
  isNew,
  onComplete,
}: SummonAnimationProps) => {
  const [phase, setPhase] = useState<'glow' | 'reveal' | 'done'>('glow')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), 800)
    const t2 = setTimeout(() => setPhase('done'), 1600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const rarityGlow = rarity === 'Rare' ? styles.glowRare : rarity === 'Uncommon' ? styles.glowUncommon : styles.glowCommon

  return (
    <div className={styles.overlay} onClick={phase === 'done' ? onComplete : undefined}>
      {phase === 'glow' && (
        <div className={`${styles.glowCircle} ${rarityGlow}`} />
      )}

      {(phase === 'reveal' || phase === 'done') && (
        <div className={styles.cardReveal}>
          {isNew && <div className={styles.newBadge}>NEW!</div>}
          <MonsterCard
            imageUrl={imageUrl}
            name={name}
            element={element}
            rarity={rarity}
            growthStage={growthStage}
            size="lg"
          />
          {phase === 'done' && (
            <p className={styles.tapHint}>탭하여 계속</p>
          )}
        </div>
      )}
    </div>
  )
}
