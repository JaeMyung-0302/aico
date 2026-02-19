import { useState, useEffect, useRef } from 'react'
import classnames from 'classnames/bind'
import type { MerchantItem } from '@/game/systems/events'
import { eventBus } from '@/lib/event-bus'
import { EVENT_MERCHANT_DURATION } from '@soulblade/shared'
import styles from './EventMerchant.module.scss'

const cx = classnames.bind(styles)

interface EventMerchantProps {
  readonly items: readonly MerchantItem[]
  readonly onClose: () => void
}

export const EventMerchant = ({ items, onClose }: EventMerchantProps) => {
  const [timeLeft, setTimeLeft] = useState(EVENT_MERCHANT_DURATION)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onCloseRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleSelect = (index: number) => {
    eventBus.emit('event:merchant:select', { itemIndex: index })
    onClose()
  }

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <h2 className={cx('title')}>떠돌이 상인</h2>
        <p className={cx('timer')}>남은 시간: {timeLeft}초</p>

        <div className={cx('items')}>
          {items.map((item, idx) => (
            <button
              key={item.id}
              className={cx('itemCard')}
              onClick={() => handleSelect(idx)}
            >
              <span className={cx('itemName')}>{item.name}</span>
              <span className={cx('itemDesc')}>{item.description}</span>
            </button>
          ))}
        </div>

        <button className={cx('skipBtn')} onClick={onClose}>
          건너뛰기
        </button>
      </div>
    </div>
  )
}
