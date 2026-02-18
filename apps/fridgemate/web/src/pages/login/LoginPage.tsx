import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import classNames from 'classnames/bind'
import { useGroupStore } from '@/stores/useGroupStore'
import styles from './LoginPage.module.scss'

const cx = classNames.bind(styles)

export const LoginPage = () => {
  const navigate = useNavigate()
  const { verify, loading, error } = useGroupStore()
  const [code, setCode] = useState('')

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const trimmed = code.trim()
      if (!trimmed || loading) return

      const success = await verify(trimmed)
      if (success) {
        navigate('/select', { replace: true })
      }
    },
    [code, loading, verify, navigate],
  )

  return (
    <div className={cx('page')}>
      <span className={cx('logo')}>🧊</span>
      <h1 className={cx('title')}>FridgeMate</h1>
      <p className={cx('subtitle')}>우리 집 냉장고 관리</p>

      <form className={cx('form')} onSubmit={handleSubmit}>
        <input
          className={cx('input')}
          type="text"
          placeholder="그룹 코드를 입력하세요"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={20}
          autoFocus
        />
        <button
          className={cx('submitBtn')}
          type="submit"
          disabled={!code.trim() || loading}
        >
          {loading ? '확인 중...' : '입장하기'}
        </button>
      </form>

      {error && <p className={cx('error')}>{error}</p>}
      <p className={cx('hint')}>가족/룸메이트와 같은 코드로 냉장고를 공유하세요</p>
    </div>
  )
}
