import { useAuthStore } from '@/stores/useAuthStore'
import { useMonsterStore } from '@/stores/useMonsterStore'
import { useGameStore } from '@/stores/useGameStore'
import styles from './Header.module.scss'

export const Header = () => {
  const { signOut } = useAuthStore()
  const { activeMonster: monster } = useMonsterStore()
  const { energy } = useGameStore()

  return (
    <header className={styles.header}>
      <span className={styles.name}>
        {monster?.name ?? monster?.element ?? 'Monster Factory'}
      </span>
      <div className={styles.right}>
        {energy && (
          <span className={styles.energy}>
            ⚡{energy.remaining}/{energy.max}
          </span>
        )}
        <button className={styles.logoutBtn} onClick={signOut}>
          로그아웃
        </button>
      </div>
    </header>
  )
}
