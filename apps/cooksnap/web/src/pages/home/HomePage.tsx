import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import classnames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import api from '@/lib/api'
import PremiumModal from '@/components/PremiumModal'
import type { AnalyzeResponse } from '@/types/recipe'
import { AxiosError } from 'axios'
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
          prev < LOADING_STEPS.length - 1 ? prev + 1 : prev,
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

  const quotaExhausted = Boolean(
    user && quotaStatus && !quotaStatus.isPremium && !quotaStatus.allowed,
  )

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
      const { data } = await api.post<AnalyzeResponse>('/recipes/analyze', {
        url: url.trim(),
      })
      await fetchQuota()
      queryClient.invalidateQueries({ queryKey: ['my-history'] })
      navigate(`/result/${data.id}`)
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 403) {
        setShowPremiumModal(true)
      } else {
        const message =
          err instanceof AxiosError
            ? err.response?.data?.message || '분석 중 오류가 발생했습니다. 다시 시도해주세요.'
            : '분석 중 오류가 발생했습니다. 다시 시도해주세요.'
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
        <meta
          name="description"
          content="숏폼 레시피 영상 URL 하나로 레시피, 재료, 가격, 주문까지 원스톱. Instagram Reels, TikTok, YouTube Shorts 지원."
        />
        <link rel="canonical" href="https://cooksnap.aico-app.com/" />
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
            onClick={
              quotaExhausted ? () => setShowPremiumModal(true) : handleAnalyze
            }
            disabled={isLoading}
          >
            {quotaExhausted ? '오늘 무료 분석을 모두 사용했어요' : '분석하기'}
          </button>
        </div>
        {error && <p className={cx('errorMessage')}>{error}</p>}
      </div>

      {/* 쿼터 표시 - TODO: PMF 검증 완료 후 복구 (FREE_DAILY_LIMIT=999로 사실상 무제한) */}
      {user && quotaStatus && !quotaStatus.isPremium && quotaStatus.remaining < 100 && (
        <p className={cx('quotaBadge', { exhausted: quotaExhausted })}>
          {quotaExhausted
            ? '오늘 무료 분석을 모두 사용했어요'
            : `오늘 ${quotaStatus.remaining}회 남음`}
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
          {'"이 레시피, 재료비 총 4,200원 — 외식비 대비 62% 절약"'}
        </p>
      </div>

      {/* SEO 콘텐츠 섹션 */}
      <section className={cx('seoContent')}>
        <h2>숏폼 레시피 분석 서비스 CookSnap</h2>
        <p>
          CookSnap은 숏폼 레시피 영상 URL 하나만으로 레시피 정보를 자동 추출하는
          AI 기반 서비스입니다. Instagram Reels, TikTok, YouTube Shorts에 올라온
          요리 영상의 URL을 붙여넣기만 하면, AI가 영상을 분석하여 재료 목록, 조리
          순서, 예상 재료비, 구매 링크까지 한 번에 제공합니다.
        </p>

        <h3>어떻게 작동하나요?</h3>
        <p>
          CookSnap의 AI 엔진은 영상 속 요리 과정을 분석하여 레시피 정보를
          구조화합니다. 영상에서 사용되는 재료를 식별하고, 조리 단계를 순서대로
          정리하며, 각 재료의 실시간 시장 가격을 자동으로 조회합니다.
        </p>
        <ol>
          <li>
            <strong>영상 URL 붙여넣기</strong> — Instagram Reels, TikTok, YouTube
            Shorts 링크를 입력합니다.
          </li>
          <li>
            <strong>AI 분석</strong> — Gemini AI가 영상을 시청하고 레시피, 재료,
            조리 순서를 자동으로 추출합니다.
          </li>
          <li>
            <strong>결과 확인</strong> — 재료 목록과 KAMIS(한국농수산식품유통공사)
            기준 실시간 소매가, 쿠팡 구매 링크를 확인합니다.
          </li>
        </ol>

        <h3>지원 플랫폼</h3>
        <ul>
          <li>
            <strong>Instagram Reels</strong> — 인스타그램 릴스에 올라온 숏폼 요리
            영상을 지원합니다.
          </li>
          <li>
            <strong>TikTok</strong> — 틱톡의 다양한 레시피 영상을 분석할 수
            있습니다.
          </li>
          <li>
            <strong>YouTube Shorts</strong> — 유튜브 쇼츠의 짧은 요리 영상도
            분석 가능합니다.
          </li>
        </ul>

        <h3>재료비는 어떻게 계산되나요?</h3>
        <p>
          CookSnap은 한국농수산식품유통공사(KAMIS)가 제공하는 농수산물 소매가격
          정보를 실시간으로 조회하여 재료비를 계산합니다. KAMIS는 정부 공인 농산물
          가격 정보 시스템으로, 전국 주요 도소매 시장의 가격을 매일 수집하여
          제공합니다. 이를 통해 레시피에 사용되는 재료의 현재 시장 가격을 정확하게
          파악할 수 있습니다.
        </p>

        <h3>자주 묻는 질문</h3>
        <dl>
          <dt>CookSnap은 무료인가요?</dt>
          <dd>
            네, CookSnap은 무료로 사용할 수 있습니다. 매일 제공되는 무료 분석
            횟수 내에서 자유롭게 이용하실 수 있으며, 더 많은 분석이 필요한 경우
            프리미엄 플랜을 이용하실 수 있습니다.
          </dd>
          <dt>어떤 종류의 영상을 분석할 수 있나요?</dt>
          <dd>
            요리 및 레시피 관련 숏폼 영상을 분석합니다. Instagram Reels, TikTok,
            YouTube Shorts에 업로드된 요리 영상의 URL을 입력하면 됩니다. 요리와
            관련 없는 영상은 정확한 분석이 어려울 수 있습니다.
          </dd>
          <dt>재료비 정보는 얼마나 정확한가요?</dt>
          <dd>
            KAMIS(한국농수산식품유통공사) 공식 소매가 기준으로 계산되며, 실제
            구매가와는 차이가 있을 수 있습니다. 가공식품이나 양념류 등 KAMIS에
            등록되지 않은 품목은 시세가 제공되지 않을 수 있습니다.
          </dd>
        </dl>
      </section>

      {showPremiumModal && (
        <PremiumModal onClose={() => setShowPremiumModal(false)} />
      )}
    </div>
  )
}

export default Landing
