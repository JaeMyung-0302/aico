import { useEffect, useState, useCallback, useRef } from 'react'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { useFoodItemStore } from '@/stores/useFoodItemStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { api } from '@/lib/api'
import { FridgeView } from '@/components/FridgeView'
import { CompartmentPanel } from '@/components/CompartmentPanel'
import { CompartmentEditModal } from '@/components/CompartmentEditModal'
import { PremiumModal } from '@/components/PremiumModal/PremiumModal'
import type { CompartmentResponse, SubscriptionStatusResponse } from '@/types'
import styles from './FridgePage.module.scss'

const cx = classNames.bind(styles)

export const FridgePage = () => {
  const { fridges, activeFridgeId, fetchFridges, loading, error } = useFridgeStore()
  const { isAdmin, fetchMe } = useAuthStore()
  const [activeCompartment, setActiveCompartment] = useState<CompartmentResponse | null>(null)
  const [highlightedCompartmentId, setHighlightedCompartmentId] = useState<string | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionStatusResponse | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  useEffect(() => {
    fetchFridges()
    fetchMe()
  }, [fetchFridges, fetchMe])

  const refreshSubscription = useCallback(async () => {
    try {
      const data = await api.get<SubscriptionStatusResponse>('/payments/status')
      setSubscription(data)
    } catch {
      // 결제 API 미설정 시 비프리미엄으로 간주
    }
  }, [])

  // 관리자일 때만 구독 상태 조회
  useEffect(() => {
    if (!isAdmin) return
    refreshSubscription()
  }, [isAdmin, refreshSubscription])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  const handleCompartmentClick = useCallback((compartment: CompartmentResponse) => {
    setActiveCompartment(compartment)
  }, [])

  const handleDeleteItem = useCallback(async (itemId: string, compartmentId: string) => {
    try {
      await useFoodItemStore.getState().deleteItem(itemId, compartmentId)
      await fetchFridges()
    } catch {
      // 에러는 store에서 처리됨
    }
  }, [fetchFridges])

  const handleEditCompartments = useCallback(() => {
    if (!activeFridgeId) return
    const isPremium = subscription?.isPremium ?? false
    if (isPremium) {
      setShowEditModal(true)
    } else {
      setShowPremiumModal(true)
    }
  }, [activeFridgeId, subscription])

  const handleEditModalClose = useCallback(() => {
    setShowEditModal(false)
    fetchFridges()
  }, [fetchFridges])

  const handlePanelClose = useCallback(() => {
    const closedId = activeCompartment?.id ?? null
    setActiveCompartment(null)
    fetchFridges()

    // 닫힌 칸에 하이라이트 적용
    if (closedId) {
      setHighlightedCompartmentId(closedId)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedCompartmentId(null)
        highlightTimerRef.current = null
      }, 2500)
    }
  }, [activeCompartment, fetchFridges])

  if (loading) {
    return (
      <div className={cx('page')}>
        <div className={cx('loading')}>냉장고를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cx('page')}>
        <div className={cx('error')}>
          <p className={cx('errorText')}>{error}</p>
          <button
            className={cx('retryBtn')}
            onClick={() => fetchFridges()}
            type="button"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const activeFridge = fridges.find((f) => f.id === activeFridgeId) ?? null

  return (
    <div className={cx('page')}>
      <FridgeView
        onCompartmentClick={handleCompartmentClick}
        onDeleteItem={handleDeleteItem}
        highlightedCompartmentId={highlightedCompartmentId}
        onEditCompartments={isAdmin ? handleEditCompartments : undefined}
      />

      {activeCompartment && (
        <CompartmentPanel
          compartment={activeCompartment}
          onClose={handlePanelClose}
          onItemChange={fetchFridges}
        />
      )}

      {showEditModal && activeFridge && (
        <CompartmentEditModal fridge={activeFridge} onClose={handleEditModalClose} />
      )}

      {showPremiumModal && (
        <PremiumModal
          onClose={() => setShowPremiumModal(false)}
          onSuccess={() => {
            setShowPremiumModal(false)
            refreshSubscription()
          }}
        />
      )}
    </div>
  )
}
