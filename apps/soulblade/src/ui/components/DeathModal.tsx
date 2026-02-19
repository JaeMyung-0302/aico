import classnames from 'classnames/bind'
import { DEATH_EXP_PENALTY } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import styles from './DeathModal.module.scss'

const cx = classnames.bind(styles)

interface DeathModalProps {
  readonly onReturnToTown: () => void
}

export const DeathModal = ({ onReturnToTown }: DeathModalProps) => {
  const handleReturn = () => {
    // 부활 + 경험치 페널티 적용 후 마을 귀환
    eventBus.emit('game:revive', { hpPercent: 1.0, applyDeathPenalty: true })
    eventBus.emit('portal:confirm', { targetMapId: 'town' })
    onReturnToTown()
  }

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <h2 className={cx('title')}>사망</h2>
        <p className={cx('penalty')}>
          경험치 {Math.floor(DEATH_EXP_PENALTY * 100)}% 손실
        </p>
        <button className={cx('returnBtn')} onClick={handleReturn}>
          마을로 귀환
        </button>
      </div>
    </div>
  )
}
