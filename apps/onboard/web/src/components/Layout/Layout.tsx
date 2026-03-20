import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './Layout.module.scss'

export const Layout = () => {
  const { user, tenant, signOut } = useAuthStore()

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>Onboard</div>
        <nav className={styles.nav}>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.active : ''}>
            Dashboard
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => isActive ? styles.active : ''}>
            Chat
          </NavLink>
          <NavLink to="/checklist" className={({ isActive }) => isActive ? styles.active : ''}>
            Checklist
          </NavLink>
          <NavLink to="/integrations" className={({ isActive }) => isActive ? styles.active : ''}>
            Integrations
          </NavLink>
          <NavLink to="/knowledge-base" className={({ isActive }) => isActive ? styles.active : ''}>
            Knowledge Base
          </NavLink>
        </nav>
        <div className={styles.userInfo}>
          {tenant && <span className={styles.teamName}>{tenant.name}</span>}
          <span>{user?.name || user?.email}</span>
          <button onClick={signOut} className={styles.signOut}>로그아웃</button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
