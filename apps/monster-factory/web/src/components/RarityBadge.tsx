import styles from './RarityBadge.module.scss'

interface RarityBadgeProps {
  rarity: string
}

export const RarityBadge = ({ rarity }: RarityBadgeProps) => {
  const className = `${styles.badge} ${styles[rarity.toLowerCase()] ?? ''}`
  return <span className={className}>{rarity}</span>
}
