import classNames from 'classnames/bind'
import type { DeathLogEntry } from '@wasd/shared'
import styles from './DeathTimeline.module.scss'

const cx = classNames.bind(styles)

interface DeathTimelineProps {
  log: DeathLogEntry[]
  culpritId: string
}

const DIRECTION_ARROW: Record<string, string> = {
  up: '\u2191',
  down: '\u2193',
  left: '\u2190',
  right: '\u2192',
}

const DeathTimeline = ({ log, culpritId }: DeathTimelineProps) => (
  <div className={cx('timeline')}>
    {log.map((entry, i) => (
      <div
        key={i}
        className={cx('entry', { culprit: entry.playerId === culpritId })}
      >
        <span className={cx('arrow')}>
          {DIRECTION_ARROW[entry.direction] ?? '?'}
        </span>
        <span className={cx('key')}>{entry.key.toUpperCase()}</span>
        <span className={cx('name')}>{entry.nickname}</span>
      </div>
    ))}
  </div>
)

export default DeathTimeline
