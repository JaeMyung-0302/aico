import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './Layout.module.scss'

const TeamSwitcher = () => {
  const { tenant, tenants, setTenant } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!tenant) return null
  if (tenants.length <= 1) {
    return <span className={styles.teamName}>{tenant.name}</span>
  }

  const handleSelect = (t: typeof tenant) => {
    setTenant(t)
    setIsOpen(false)
    window.location.reload()
  }

  return (
    <div className={styles.teamSwitcher} ref={ref}>
      <button
        className={styles.teamSwitcherButton}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <span>{tenant.name}</span>
        <span className={styles.chevron}>{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>
      {isOpen && (
        <ul className={styles.teamDropdown}>
          {tenants.map((t) => (
            <li key={t.id}>
              <button
                className={`${styles.teamOption} ${t.id === tenant.id ? styles.teamOptionActive : ''}`}
                onClick={() => handleSelect(t)}
                type="button"
              >
                {t.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const Layout = () => {
  const { user, tenant, signOut } = useAuthStore()
  const location = useLocation()

  // TeamSetupPage renders its own full-screen layout
  if (!tenant && location.pathname === '/team-setup') {
    return <Outlet />
  }

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
          <NavLink to="/members" className={({ isActive }) => isActive ? styles.active : ''}>
            팀원 관리
          </NavLink>
        </nav>
        <div className={styles.userInfo}>
          <TeamSwitcher />
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
