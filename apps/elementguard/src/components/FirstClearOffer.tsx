import classNames from 'classnames/bind'
import styles from './FirstClearOffer.module.scss'

const cx = classNames.bind(styles)

const FIRST_CLEAR_GEL_REWARD = 100
const FIRST_CLEAR_OFFER_KEY = 'eg_first_clear_offered'

interface FirstClearOfferProps {
  onClaim: (gelReward: number) => void
  onDismiss: () => void
}

export const FirstClearOffer = ({ onClaim, onDismiss }: FirstClearOfferProps) => {
  const handleClaim = () => {
    if (hasFirstClearBeenOffered()) return
    localStorage.setItem(FIRST_CLEAR_OFFER_KEY, 'true')
    onClaim(FIRST_CLEAR_GEL_REWARD)
  }

  const handleDismiss = () => {
    localStorage.setItem(FIRST_CLEAR_OFFER_KEY, 'true')
    onDismiss()
  }

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <div className={cx('badge')}>첫 클리어 보상</div>
        <h2 className={cx('title')}>축하합니다!</h2>
        <p className={cx('subtitle')}>Wave 10을 클리어했습니다</p>

        <div className={cx('reward')}>
          <span className={cx('rewardIcon')}>💎</span>
          <span className={cx('rewardAmount')}>{FIRST_CLEAR_GEL_REWARD} Gel</span>
        </div>
        <p className={cx('rewardDesc')}>성장 트리 업그레이드에 사용하세요</p>

        <button className={cx('claimButton')} onClick={handleClaim}>
          보상 받기
        </button>
        <button className={cx('dismissButton')} onClick={handleDismiss}>
          다음에
        </button>
      </div>
    </div>
  )
}

export const hasFirstClearBeenOffered = (): boolean =>
  localStorage.getItem(FIRST_CLEAR_OFFER_KEY) === 'true'
