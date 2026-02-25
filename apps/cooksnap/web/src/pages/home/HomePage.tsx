import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import classnames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/lib/api'
import PremiumModal from '@/components/PremiumModal'
import type { AnalyzeResponse } from '@/types/recipe'
import styles from './HomePage.module.scss'

const cx = classnames.bind(styles)

// 지원 플랫폼 URL 패턴
const VIDEO_URL_PATTERNS: Record<string, RegExp> = {
  instagram: /^https?:\/\/(www\.)?instagram\.com\/(reels?|p)\//,
  tiktok: /^https?:\/\/(www\.)?(tiktok\.com|vm\.tiktok\.com)\//,
  youtube: /^https?:\/\/(www\.)?(youtube\.com\/(shorts|watch)|youtu\.be)\//,
}

const validateVideoUrl = (url: string): boolean => {
  return Object.values(VIDEO_URL_PATTERNS).some((pattern) => pattern.test(url))
}

const LOADING_STEPS = [
  'AI 셰프가 영상을 감상하고 있어요',
  '레시피의 비밀을 파헤치는 중이에요',
  '재료와 양념을 꼼꼼히 메모하고 있어요',
  '거의 다 됐어요! 맛있는 레시피가 곧 완성돼요',
]

const Landing = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, quotaStatus, fetchQuota } = useAuthStore()
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 로그인 후 복귀 시 저장된 URL 복원
  useEffect(() => {
    const pendingUrl = sessionStorage.getItem('pending_analyze_url')
    if (pendingUrl && user) {
      sessionStorage.removeItem('pending_analyze_url')
      setUrl(pendingUrl)
    }
  }, [user])

  useEffect(() => {
    if (isLoading) {
      setLoadingStep(0)
      intervalRef.current = setInterval(() => {
        setLoadingStep((prev) =>
          prev < LOADING_STEPS.length - 1 ? prev + 1 : prev
        )
      }, 8000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isLoading])

  const quotaExhausted = Boolean(user && quotaStatus && !quotaStatus.isPremium && !quotaStatus.allowed)

  const handleAnalyze = async () => {
    setError('')

    if (!url.trim()) {
      setError('영상 URL을 입력해주세요.')
      return
    }

    if (!validateVideoUrl(url.trim())) {
      setError('Instagram Reels, TikTok, YouTube Shorts URL만 지원합니다.')
      return
    }

    // 비로그인 시 URL 저장 후 로그인 페이지로 이동
    if (!user) {
      sessionStorage.setItem('pending_analyze_url', url.trim())
      navigate('/auth')
      return
    }

    // quota 소진 시 API 호출 없이 PremiumModal 직접 표시
    if (quotaExhausted) {
      setShowPremiumModal(true)
      return
    }

    setIsLoading(true)

    try {
      const { data } = await api.post<AnalyzeResponse>('/recipes/analyze', { url: url.trim() })
      await fetchQuota()
      queryClient.invalidateQueries({ queryKey: ['my-history'] })
      navigate(`/result/${data.id}`)
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (err as any)?.response?.status
      if (status === 403) {
        setShowPremiumModal(true)
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message = (err as any)?.response?.data?.message || '분석 중 오류가 발생했습니다. 다시 시도해주세요.'
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleAnalyze()
    }
  }

  if (isLoading) {
    return (
      <div className={cx('landing')}>
        <div className={cx('loadingOverlay')}>
          <div className={cx('spinner')} />
          <p className={cx('loadingMessage')}>{LOADING_STEPS[loadingStep]}</p>
          <div className={cx('loadingSteps')}>
            {LOADING_STEPS.map((_, i) => (
              <div
                key={i}
                className={cx('loadingStepDot', { active: i <= loadingStep })}
              />
            ))}
          </div>
          <p className={cx('loadingHint')}>약 30초~1분 정도 소요됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cx('landing')}>
      <Helmet>
        <title>CookSnap - 영상 붙여넣으면, 재료비부터 주문까지</title>
        <meta name="description" content="숏폼 레시피 영상 URL 하나로 레시피, 재료, 가격, 주문까지 원스톱. Instagram Reels, TikTok, YouTube Shorts 지원." />
        <link rel="canonical" href="https://aico-cooksnap.vercel.app/" />
      </Helmet>
      <h1 className={cx('headline')}>
        영상 붙여넣으면,
        <br />
        재료비부터 주문까지
      </h1>
      <p className={cx('subheadline')}>
        숏폼 레시피 영상 URL 하나로 레시피 + 재료 + 가격 + 주문까지 원스톱
      </p>

      <div className={cx('inputSection')}>
        <div className={cx('inputWrapper')}>
          <input
            className={cx('urlInput')}
            type="url"
            placeholder="레시피 영상 URL을 붙여넣으세요"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            className={cx('analyzeButton', { exhausted: quotaExhausted })}
            onClick={quotaExhausted ? () => setShowPremiumModal(true) : handleAnalyze}
            disabled={isLoading}
          >
            {quotaExhausted ? '오늘 무료 분석을 모두 사용했어요' : '분석하기'}
          </button>
        </div>
        {error && <p className={cx('errorMessage')}>{error}</p>}
      </div>

      {/* 쿼터 표시 */}
      {user && quotaStatus && !quotaStatus.isPremium && (
        <p className={cx('quotaBadge', { exhausted: quotaExhausted })}>
          {quotaExhausted ? '오늘 무료 분석을 모두 사용했어요' : `오늘 ${quotaStatus.remaining}회 남음`}
        </p>
      )}

      <div className={cx('platforms')}>
        <span className={cx('platformBadge')}>Instagram Reels</span>
        <span className={cx('platformBadge')}>TikTok</span>
        <span className={cx('platformBadge')}>YouTube Shorts</span>
      </div>

      <div className={cx('valueCard')}>
        <p className={cx('valueTitle')}>핵심 가치</p>
        <p className={cx('valueHighlight')}>
          "이 레시피, 재료비 총 4,200원 — 외식비 대비 62% 절약"
        </p>
      </div>

      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  )
}

export default Landing
