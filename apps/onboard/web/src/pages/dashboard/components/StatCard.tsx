import styles from '../DashboardPage.module.scss'

interface StatCardProps {
  label: string
  value: number
}

export const StatCard = ({ label, value }: StatCardProps) => (
  <div className={styles.statCard}>
    <span className={styles.statValue}>{value}</span>
    <span className={styles.statLabel}>{label}</span>
  </div>
)
