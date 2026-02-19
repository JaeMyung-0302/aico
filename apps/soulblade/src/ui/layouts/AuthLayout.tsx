import { useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './AuthLayout.module.scss'

const cx = classnames.bind(styles)

export const AuthLayout = () => {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const initialize = useAuthStore((s) => s.initialize)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [loading, user, navigate])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', onClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
    }
  }, [dropdownOpen])

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#1a1a2e', color: '#e8d44d' }}>
        로딩 중...
      </div>
    )
  }

  if (!user) return null

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  return (
    <div className={cx('layout')}>
      <div className={cx('profileArea')} ref={profileRef}>
        <button className={cx('profileButton')} onClick={() => setDropdownOpen((prev) => !prev)}>
          {avatarUrl ? (
            <img
              className={cx('avatar')}
              src={avatarUrl}
              alt="profile"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className={cx('avatar', 'avatarFallback')}>
              {(user.email?.[0] ?? '?').toUpperCase()}
            </div>
          )}
        </button>
        {dropdownOpen && (
          <div className={cx('dropdown')}>
            <p className={cx('dropdownEmail')}>{user.email}</p>
            <button className={cx('dropdownSignOut')} onClick={handleSignOut} disabled={signingOut}>
              {signingOut ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
        )}
      </div>
      <Outlet />
    </div>
  )
}
