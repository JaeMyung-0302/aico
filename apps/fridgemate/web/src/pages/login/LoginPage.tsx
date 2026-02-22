import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './LoginPage.module.scss'

const cx = classNames.bind(styles)

export const LoginPage = () => {
  const navigate = useNavigate()
  const { login, loading, error, isAuthenticated, needsGroup } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!email.trim() || !password || loading) return

      const success = await login(email.trim(), password)
      if (success) {
        const { needsGroup: ng } = useAuthStore.getState()
        navigate(ng ? '/group-setup' : '/select', { replace: true })
      }
    },
    [email, password, loading, login, navigate],
  )

  if (isAuthenticated && !needsGroup) {
    return <Navigate to="/select" replace />
  }
  if (isAuthenticated && needsGroup) {
    return <Navigate to="/group-setup" replace />
  }

  return (
    <div className={cx('page')}>
      <span className={cx('logo')}>🧊</span>
      <h1 className={cx('title')}>FridgeMate</h1>
      <p className={cx('subtitle')}>우리 집 냉장고 관리</p>

      <form className={cx('form')} onSubmit={handleSubmit}>
        <input
          className={cx('input')}
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <input
          className={cx('input')}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className={cx('submitBtn')}
          type="submit"
          disabled={!email.trim() || !password || loading}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {error && <p className={cx('error')}>{error}</p>}
      <p className={cx('hint')}>
        계정이 없으신가요? <Link className={cx('link')} to="/register">회원가입</Link>
      </p>
    </div>
  )
}
