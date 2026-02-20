import { useEffect, useState } from 'react'
import classNames from 'classnames/bind'
import type { DeathEvent } from '@wasd/shared'
import styles from './DeathLog.module.scss'

const cx = classNames.bind(styles)

interface DeathLogProps {
  deathEvent: DeathEvent
  onDismiss: () => void
}

const DISMISS_DELAY = 2000

const DeathLog = ({ deathEvent, onDismiss }: DeathLogProps) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(true)

    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss()
    }, DISMISS_DELAY)

    return () => clearTimeout(timer)
  }, [deathEvent, onDismiss])

  if (!visible) return null

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <h3 className={cx('title')}>Death #{deathEvent.deaths}</h3>
        <p className={cx('culprit')}>
          {deathEvent.culpritNickname
            ? `범인: ${deathEvent.culpritNickname}`
            : '범인 불명'}
        </p>
      </div>
    </div>
  )
}

export default DeathLog
