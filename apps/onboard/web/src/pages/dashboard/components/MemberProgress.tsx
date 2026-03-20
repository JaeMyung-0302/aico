import styles from '../DashboardPage.module.scss'

interface Member {
  userId: string
  email: string
  name: string | null
  role: string
  completedItems: number
  totalItems: number
  progressPercent: number
}

interface MemberProgressProps {
  members: Member[]
}

export const MemberProgress = ({ members }: MemberProgressProps) => (
  <div className={styles.table}>
    <div className={styles.tableHeader}>
      <span>멤버</span>
      <span>역할</span>
      <span>진행률</span>
    </div>
    {members.map((member) => (
      <div key={member.userId} className={styles.tableRow}>
        <span>{member.name || member.email}</span>
        <span className={styles.role}>{member.role}</span>
        <div className={styles.progressCell}>
          <div className={styles.miniBar}>
            <div className={styles.miniFill} style={{ width: `${member.progressPercent}%` }} />
          </div>
          <span>{member.progressPercent}%</span>
        </div>
      </div>
    ))}
  </div>
)
