import { useEffect, useRef } from 'react'

const REFERRAL_KEY = 'eg_referral_id'
const REFERRED_BY_KEY = 'eg_referred_by'
const REFERRAL_REWARD_GEL = 10

interface UseReferralOptions {
  userId: string | null
  onReward: (gel: number) => void
}

// 레퍼럴 딥링크 처리: ?ref=xxx 파라미터로 유입 시 보상 지급
export const useReferral = ({ userId, onReward }: UseReferralOptions) => {
  const processed = useRef(false)
  const onRewardRef = useRef(onReward)
  onRewardRef.current = onReward

  // 내 referral ID를 localStorage에 저장
  useEffect(() => {
    if (!userId) return
    localStorage.setItem(REFERRAL_KEY, userId)
  }, [userId])

  // ?ref= 파라미터 처리 (1회만)
  useEffect(() => {
    if (processed.current || !userId) return
    processed.current = true

    const params = new URLSearchParams(window.location.search)
    const refId = params.get('ref')

    if (!refId || refId === userId) return // 자기 자신 레퍼럴 방지

    // UUID 형식 검증
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(refId)) return

    const alreadyReferred = localStorage.getItem(REFERRED_BY_KEY)
    if (alreadyReferred) return // 이미 레퍼럴 처리됨

    localStorage.setItem(REFERRED_BY_KEY, refId)
    onRewardRef.current(REFERRAL_REWARD_GEL)

    // URL에서 ref 파라미터 제거 (히스토리 변경 없이)
    params.delete('ref')
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }, [userId])
}
