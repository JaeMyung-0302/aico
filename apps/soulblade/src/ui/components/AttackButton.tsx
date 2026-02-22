import { useState, useCallback, useEffect, useRef } from 'react'
import classnames from 'classnames/bind'
import { eventBus } from '@/lib/event-bus'
import styles from './AttackButton.module.scss'

const cx = classnames.bind(styles)

const ATTACK_COOLDOWN_SEC = 1

export const AttackButton = () => {
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const intervalRef = useRef<number | null>(null)

  const isOnCooldown = cooldownRemaining > 0

  const handleAttack = useCallback(() => {
    if (isOnCooldown) return
    eventBus.emit('input:attack')
    setCooldownRemaining(ATTACK_COOLDOWN_SEC)
  }, [isOnCooldown])

  useEffect(() => {
    if (!isOnCooldown) return

    const id = window.setInterval(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 0.05))
    }, 50)
    intervalRef.current = id

    return () => clearInterval(id)
  }, [isOnCooldown])

  const cooldownPercent = (cooldownRemaining / ATTACK_COOLDOWN_SEC) * 100

  return (
    <button
      className={cx('attackButton', { cooldown: isOnCooldown })}
      onTouchStart={handleAttack}
      onClick={handleAttack}
    >
      <div
        className={cx('cooldownOverlay')}
        style={{ height: `${cooldownPercent}%` }}
      />
      <span className={cx('label')}>공격</span>
    </button>
  )
}
