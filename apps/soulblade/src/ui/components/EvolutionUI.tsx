import classnames from 'classnames/bind'
import type { SkillEvolution } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import styles from './EvolutionUI.module.scss'

const cx = classnames.bind(styles)

interface EvolutionUIProps {
  readonly evolution: SkillEvolution
  readonly onClose: () => void
}

export const EvolutionUI = ({ evolution, onClose }: EvolutionUIProps) => {
  const handleAccept = () => {
    eventBus.emit('evolution:accept', { evolutionId: evolution.id })
    onClose()
  }

  const handleReject = () => {
    eventBus.emit('evolution:reject')
    onClose()
  }

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <h2 className={cx('title')}>스킬 진화!</h2>

        <div className={cx('evolutionCard')}>
          <span className={cx('evolutionName')}>{evolution.name}</span>
          <p className={cx('evolutionDesc')}>{evolution.description}</p>

          <div className={cx('effects')}>
            {Object.entries(evolution.evolvedSkillEffect).map(([key, val]) => (
              <span key={key} className={cx('effect')}>
                {key}: {val}
              </span>
            ))}
          </div>
        </div>

        <div className={cx('buttons')}>
          <button className={cx('acceptBtn')} onClick={handleAccept}>
            진화 수락
          </button>
          <button className={cx('rejectBtn')} onClick={handleReject}>
            거절
          </button>
        </div>
      </div>
    </div>
  )
}
