import { useState, useEffect } from 'react'

export const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '6px 12px',
        background: '#ff6600',
        color: '#fff',
        fontSize: '12px',
        textAlign: 'center',
        zIndex: 1000,
      }}
    >
      오프라인 모드 — 데이터 저장이 불가합니다
    </div>
  )
}
