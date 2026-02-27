import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import classnames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import { Loading } from '@repo/ui'
import EmailAuthForm from './EmailAuthForm'
import styles from './AuthPage.module.scss'

const cx = classnames.bind(styles)

const isInAppBrowser = (): boolean => {
  const ua = navigator.userAgent
  return /FBAN|FBAV|Instagram|KAKAOTALK|Line\/|NAVER|wv|WebView/i.test(ua)
}

const isIOS = (): boolean => /iPhone|iPad|iPod/i.test(navigator.userAgent)

const Auth = () => {
  const { user, signInWithGoogle, signInWithKakao } = useAuthStore()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [copied, setCopied] = useState(false)
  const inApp = isInAppBrowser()

  if (user) return <Navigate to="/" replace />

  const handleGoogleLogin = async () => {
    if (inApp) return
    setIsSigningIn(true)
    await signInWithGoogle()
  }

  const handleKakaoLogin = async () => {
    setIsSigningIn(true)
    await signInWithKakao()
  }

  const handleOpenInBrowser = () => {
    const currentUrl = window.location.href

    if (isIOS()) {
      // iOS: 클립보드 복사 후 안내
      navigator.clipboard?.writeText(currentUrl).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      })
    } else {
      // Android: intent scheme으로 시스템 브라우저 열기
      window.location.href = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`
    }
  }

  return (
    <div className={cx('auth')}>
      <Helmet>
        <title>로그인 - CookSnap</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Loading overlay loading={isSigningIn} message="로그인 중..." />
      <div className={cx('card')}>
        <h1 className={cx('title')}>로그인</h1>
        <p className={cx('subtitle')}>로그인하고 레시피 분석을 시작하세요</p>

        <div className={cx('buttons')}>
          <button
            className={cx('socialButton', 'kakaoButton')}
            onClick={handleKakaoLogin}
            disabled={isSigningIn}
          >
            카카오로 시작하기
          </button>

          {!inApp && (
            <button
              className={cx('socialButton', 'googleButton')}
              onClick={handleGoogleLogin}
              disabled={isSigningIn}
            >
              Google로 시작하기
            </button>
          )}
        </div>

        <div className={cx('divider')}>또는</div>
        <EmailAuthForm />

        {inApp && (
          <div className={cx('inAppWarning')}>
            <p>Google 로그인은 외부 브라우저에서만 가능합니다.</p>
            <button
              className={cx('openBrowserButton')}
              onClick={handleOpenInBrowser}
            >
              {isIOS() ? 'URL 복사하기' : '외부 브라우저로 열기'}
            </button>
            {copied && (
              <p className={cx('copiedMessage')}>
                URL이 복사되었습니다! Safari에서 붙여넣기 해주세요
              </p>
            )}
            <p className={cx('inAppHint')}>
              {isIOS()
                ? '복사한 URL을 Safari 주소창에 붙여넣어 주세요'
                : '또는 주소창의 URL을 복사하여 Chrome에서 열어주세요'}
            </p>
          </div>
        )}

        <div className={cx('freeNotice')}>
          간편하게 로그인하고 무제한 레시피 분석을 이용하세요
        </div>
      </div>
    </div>
  )
}

export default Auth
