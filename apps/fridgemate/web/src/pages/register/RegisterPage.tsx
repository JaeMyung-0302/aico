import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './RegisterPage.module.scss'

const cx = classNames.bind(styles)

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { register, loading, error, isAuthenticated, needsGroup } =
    useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!name.trim() || !email.trim() || password.length < 8 || loading)
        return

      const success = await register(email.trim(), password, name.trim())
      if (success) {
        navigate('/group-setup', { replace: true })
      }
    },
    [name, email, password, loading, register, navigate],
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
      <p className={cx('subtitle')}>회원가입</p>

      <form className={cx('form')} onSubmit={handleSubmit}>
        <input
          className={cx('input')}
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <input
          className={cx('input')}
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={cx('input')}
          type="password"
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className={cx('submitBtn')}
          type="submit"
          disabled={
            !name.trim() || !email.trim() || password.length < 8 || loading
          }
        >
          {loading ? '가입 중...' : '가입하기'}
        </button>
      </form>

      {error && <p className={cx('error')}>{error}</p>}
      <p className={cx('hint')}>
        이미 계정이 있으신가요?{' '}
        <Link className={cx('link')} to="/login">
          로그인
        </Link>
      </p>
    </div>
  )
}
