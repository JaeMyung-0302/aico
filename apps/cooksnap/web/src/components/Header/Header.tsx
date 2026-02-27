import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import { Loading } from '@repo/ui'
import styles from './Header.module.scss'

const cx = classnames.bind(styles)

const Header = () => {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogoClick = () => {
    navigate('/')
  }

  const handleLoginClick = () => {
    navigate('/auth')
  }

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await signOut()
    setIsLoggingOut(false)
    setMenuOpen(false)
    navigate('/')
  }

  return (
    <>
      <Loading overlay loading={isLoggingOut} message="로그아웃 중..." />
      <header className={cx('header')}>
        <div className={cx('inner')}>
          <div className={cx('logo')} onClick={handleLogoClick}>
            <img src="/logo.png" alt="CookSnap" className={cx('logoImage')} />
            Cook<span>Snap</span>
          </div>
          <nav className={cx('nav')}>
            {user ? (
              <div className={cx('profileWrapper')} ref={menuRef}>
                <button
                  className={cx('profileButton', { premium: user.isPremium })}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  {user.nickname?.[0] || user.email[0]}
                </button>
                {menuOpen && (
                  <div className={cx('dropdown')}>
                    <button
                      onClick={() => {
                        navigate('/mypage')
                        setMenuOpen(false)
                      }}
                    >
                      마이페이지
                    </button>
                    <button onClick={handleLogout} disabled={isLoggingOut}>
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className={cx('loginButton')} onClick={handleLoginClick}>
                로그인
              </button>
            )}
          </nav>
        </div>
      </header>
    </>
  )
}

export default Header
