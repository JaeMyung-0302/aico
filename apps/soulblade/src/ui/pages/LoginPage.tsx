import { useCallback } from 'react'
import classnames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './LoginPage.module.scss'

const cx = classnames.bind(styles)

export const LoginPage = () => {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signInWithKakao = useAuthStore((s) => s.signInWithKakao)

  const handleGoogle = useCallback(() => {
    signInWithGoogle()
  }, [signInWithGoogle])

  const handleKakao = useCallback(() => {
    signInWithKakao()
  }, [signInWithKakao])

  return (
    <div className={cx('loginPage')}>
      <h1 className={cx('title')}>SoulBlade</h1>
      <p className={cx('subtitle')}>로그인하여 모험을 시작하세요</p>

      <div className={cx('buttons')}>
        <button className={cx('loginBtn', 'google')} onClick={handleGoogle}>
          Google로 로그인
        </button>
        <button className={cx('loginBtn', 'kakao')} onClick={handleKakao}>
          카카오로 로그인
        </button>
      </div>
    </div>
  )
}
