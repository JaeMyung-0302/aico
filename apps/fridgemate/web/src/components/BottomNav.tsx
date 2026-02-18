import { useLocation, useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import styles from './BottomNav.module.scss'

const cx = classNames.bind(styles)

interface NavItem {
  path: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { path: '/select', label: '냉장고', icon: '🧊' },
  { path: '/alerts', label: '알림', icon: '⏰' },
  { path: '/settings', label: '설정', icon: '⚙️' },
]

export const BottomNav = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  return (
    <nav className={cx('nav')}>
      {NAV_ITEMS.map((item) => (
        <button
          key={item.path}
          className={cx('tab', {
            tabActive: location.pathname.startsWith(item.path)
              || (item.path === '/select' && location.pathname.startsWith('/fridge')),
          })}
          onClick={() => handleNavigate(item.path)}
          type="button"
        >
          <span className={cx('icon')}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  )
}
