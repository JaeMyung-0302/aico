import { RarityBadge } from './RarityBadge'
import { ELEMENT_COLORS } from '@monster-factory/shared'
import type { Element } from '@monster-factory/shared'
import styles from './MonsterCard.module.scss'

interface MonsterCardProps {
  imageUrl: string | null
  name: string
  element: string
  rarity: string
  growthStage: string
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

const ELEMENT_EMOJI: Record<string, string> = {
  Chemical: '🧪',
  Gear: '⚙️',
  Neon: '💜',
  Nitro: '🔥',
  Crystal: '💎',
  Plasma: '⚡',
}

export const MonsterCard = ({
  imageUrl,
  name,
  element,
  rarity,
  growthStage,
  onClick,
  size = 'md',
}: MonsterCardProps) => {
  const borderColor = ELEMENT_COLORS[element as Element] ?? '#666'

  return (
    <div
      className={`${styles.card} ${styles[size]}`}
      style={{ borderColor }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className={styles.imageWrap}>
        {imageUrl ? (
          <img src={imageUrl} alt={name} className={styles.image} />
        ) : (
          <div className={styles.placeholder}>
            <span>{ELEMENT_EMOJI[element] ?? element.charAt(0)}</span>
          </div>
        )}
        <span className={styles.stage}>{growthStage}</span>
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{name}</span>
        <RarityBadge rarity={rarity} />
      </div>
    </div>
  )
}
