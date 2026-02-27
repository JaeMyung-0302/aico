import { useState } from 'react'
import classnames from 'classnames/bind'
import { REVIVE_HP_PERCENT } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import { showRewardedAd, canRevive, markReviveUsed } from '@/lib/ads'
import styles from './RevivePrompt.module.scss'

const cx = classnames.bind(styles)

interface RevivePromptProps {
  readonly onClose: () => void
  readonly onGiveUp: () => void
}

export const RevivePrompt = ({ onClose, onGiveUp }: RevivePromptProps) => {
  const [loading, setLoading] = useState(false)
  const available = canRevive()

  const handleRevive = async () => {
    if (!available || loading) return
    setLoading(true)

    try {
      const success = await showRewardedAd()
      if (success) {
        markReviveUsed()
        eventBus.emit('game:revive', { hpPercent: REVIVE_HP_PERCENT })
        onClose()
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className={cx('overlay')}>
      <div className={cx('modal')}>
        <h2 className={cx('title')}>쓰러졌습니다</h2>
        <p className={cx('subtitle')}>광고를 시청하고 부활하시겠습니까?</p>

        <div className={cx('buttons')}>
          {available && (
            <button
              className={cx('reviveBtn')}
              onClick={handleRevive}
              disabled={loading}
            >
              {loading
                ? '로딩 중...'
                : `부활 (HP ${Math.floor(REVIVE_HP_PERCENT * 100)}%)`}
            </button>
          )}

          <button className={cx('giveUpBtn')} onClick={onGiveUp}>
            포기하기
          </button>
        </div>

        {!available && (
          <p className={cx('noRevive')}>부활 기회를 이미 사용했습니다</p>
        )}
      </div>
    </div>
  )
}
