import { useEffect, useState, useCallback, useRef } from 'react'
import classNames from 'classnames/bind'
import { useFridgeStore } from '@/stores/useFridgeStore'
import { FridgeView } from '@/components/FridgeView'
import { CompartmentPanel } from '@/components/CompartmentPanel'
import type { CompartmentResponse } from '@/types'
import styles from './FridgePage.module.scss'

const cx = classNames.bind(styles)

export const FridgePage = () => {
  const { fetchFridges, loading, error } = useFridgeStore()
  const [activeCompartment, setActiveCompartment] = useState<CompartmentResponse | null>(null)
  const [highlightedCompartmentId, setHighlightedCompartmentId] = useState<string | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetchFridges()
  }, [fetchFridges])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  const handleCompartmentClick = useCallback((compartment: CompartmentResponse) => {
    setActiveCompartment(compartment)
  }, [])

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

  return (
    <div className={cx('page')}>
      <FridgeView onCompartmentClick={handleCompartmentClick} highlightedCompartmentId={highlightedCompartmentId} />

      {activeCompartment && (
        <CompartmentPanel
          compartment={activeCompartment}
          onClose={handlePanelClose}
        />
      )}
    </div>
  )
}
