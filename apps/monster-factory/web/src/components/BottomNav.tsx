import { useLocation, useNavigate } from 'react-router-dom'
import styles from './BottomNav.module.scss'

const TABS = [
  { path: '/game', label: '홈', match: ['/game', '/'] },
  { path: '/stages', label: '모험', match: ['/stages'] },
  { path: '/summon', label: '소환', match: ['/summon'] },
  { path: '/codex', label: '도감', match: ['/codex'] },
  { path: '/monsters', label: '몬스터', match: ['/monsters'] },
]

export const BottomNav = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav}>
      {TABS.map(({ path, label, match }) => (
        <button
          key={path}
          className={`${styles.tab} ${match.includes(pathname) ? styles.active : ''}`}
          onClick={() => navigate(path)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
