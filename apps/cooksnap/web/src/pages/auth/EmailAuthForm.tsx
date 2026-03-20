import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './EmailAuthForm.module.scss'

const cx = classnames.bind(styles)

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

const EmailAuthForm = () => {
  const { signUpWithEmail, signInWithEmail } = useAuthStore()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const validate = (): string | null => {
    if (!email.trim()) return '이메일을 입력해주세요.'
    if (!EMAIL_REGEX.test(email.trim())) return '올바른 이메일 형식이 아닙니다.'
    if (!password) return '비밀번호를 입력해주세요.'
    if (password.length < MIN_PASSWORD_LENGTH)
      return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`
    if (mode === 'signup' && password !== confirmPassword)
      return '비밀번호가 일치하지 않습니다.'
    return null
  }

  const handleSubmit = async () => {
    setError('')
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'signup') {
        const result = await signUpWithEmail(email.trim(), password)
        if (result.error) {
          setError(result.error)
        } else {
          navigate('/', { replace: true })
        }
      } else {
        const result = await signInWithEmail(email.trim(), password)
        if (result.error) {
          setError(result.error)
        } else {
          navigate('/', { replace: true })
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMode = () => {
    setEmail('')
    setPassword('')
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError('')
    setConfirmPassword('')
  }

  return (
    <form
      className={cx('emailForm')}
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      <input
        className={cx('input')}
        type="email"
        placeholder="이메일"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isSubmitting}
      />
      <input
        className={cx('input')}
        type="password"
        placeholder="비밀번호"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isSubmitting}
      />
      {mode === 'signup' && (
        <input
          className={cx('input')}
          type="password"
          placeholder="비밀번호 확인"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isSubmitting}
        />
      )}
      {error && <p className={cx('error')}>{error}</p>}
      <button
        className={cx('submitButton')}
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? '처리 중...'
          : mode === 'signup'
            ? '회원가입'
            : '로그인'}
      </button>
      {mode === 'signup' && (
        <p className={cx('warning')}>
          비밀번호를 안전하게 보관해주세요. 현재 비밀번호 재설정은 지원되지
          않습니다.
        </p>
      )}
      <p className={cx('toggle')}>
        {mode === 'signin' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
        <button
          className={cx('toggleButton')}
          onClick={toggleMode}
          disabled={isSubmitting}
        >
          {mode === 'signin' ? '회원가입' : '로그인'}
        </button>
      </p>
    </form>
  )
}

export default EmailAuthForm
