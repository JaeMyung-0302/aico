import classNames from 'classnames/bind'
import styles from './ReviveModal.module.scss'

const cx = classNames.bind(styles)

interface ReviveModalProps {
  wave: number
  gelCost: number
  currentGel: number
  onRevive: (method: 'gel') => void
  onDecline: () => void
}

export const ReviveModal = ({ wave, gelCost, currentGel, onRevive, onDecline }: ReviveModalProps) => {
  const canAfford = currentGel >= gelCost

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <h2 className={cx('title')}>부활</h2>
        <p className={cx('subtitle')}>Wave {wave}에서 쓰러졌습니다</p>
        <p className={cx('description')}>부활권을 사용하면 HP 50으로 이어서 플레이할 수 있습니다.</p>

        <div className={cx('options')}>
          <button
            className={cx('reviveButton', { disabled: !canAfford })}
            onClick={() => onRevive('gel')}
            disabled={!canAfford}
          >
            <span className={cx('cost')}>{gelCost} Gel</span>
            <span className={cx('label')}>Gel로 부활</span>
            {!canAfford && <span className={cx('insufficient')}>Gel 부족</span>}
          </button>
        </div>

        <button className={cx('declineButton')} onClick={onDecline}>
          포기하고 결과 보기
        </button>
      </div>
    </div>
  )
}
