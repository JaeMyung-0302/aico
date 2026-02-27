import { useState } from 'react'
import classNames from 'classnames/bind'
import { useAuthStore } from '@/stores/useAuthStore'
import { isPortoneConfigured, requestBillingKey } from '@/lib/portone'
import { api } from '@/lib/api'
import styles from './PremiumModal.module.scss'

const cx = classNames.bind(styles)

interface PremiumModalProps {
  onClose: () => void
  onSuccess: () => void
}

export const PremiumModal = ({ onClose, onSuccess }: PremiumModalProps) => {
  const { user } = useAuthStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const portoneReady = isPortoneConfigured()

  const handleSubscribe = async () => {
    if (!user) return

    setIsProcessing(true)
    setError(null)

    try {
      const billingKey = await requestBillingKey(user.id, user.email)
      await api.post('/payments/subscribe', { billingKey })
      onSuccess()
      onClose()
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_CANCELLED') return
      const message =
        err instanceof Error ? err.message : '결제에 실패했습니다.'
      setError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={cx('overlay')} onClick={onClose}>
      <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
        <button className={cx('closeButton')} onClick={onClose} type="button">
          &times;
        </button>

        <h2 className={cx('title')}>Premium 업그레이드</h2>

        <div className={cx('benefits')}>
          <div className={cx('benefit')}>
            <div className={cx('benefitIcon')}>&#8734;</div>
            <span className={cx('benefitText')}>무제한 AI 레시피 추천</span>
          </div>
          <div className={cx('benefit')}>
            <div className={cx('benefitIcon')}>&#9734;</div>
            <span className={cx('benefitText')}>그룹 전체 멤버 혜택 적용</span>
          </div>
          <div className={cx('benefit')}>
            <div className={cx('benefitIcon')}>&#9829;</div>
            <span className={cx('benefitText')}>주 1회 제한 없이 자유롭게</span>
          </div>
        </div>

        <div className={cx('pricing')}>
          <span className={cx('price')}>월 2,900원</span>
          <span className={cx('priceNote')}>커피 한 잔 가격으로 무제한</span>
        </div>

        {error && <p className={cx('error')}>{error}</p>}

        <button
          className={cx('subscribeButton')}
          disabled={!portoneReady || isProcessing}
          onClick={handleSubscribe}
          type="button"
        >
          {isProcessing
            ? '결제 진행 중...'
            : portoneReady
              ? '구독하기'
              : '구독하기 (준비중)'}
        </button>

        <p className={cx('disclaimer')}>
          {portoneReady
            ? '구독은 월 단위이며, 설정에서 언제든 해지할 수 있습니다.'
            : '결제 기능은 곧 추가됩니다.'}
        </p>
      </div>
    </div>
  )
}
