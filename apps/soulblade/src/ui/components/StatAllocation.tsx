import { useState, useCallback } from 'react'
import classnames from 'classnames/bind'
import { STAT_POINT_VALUES } from '@soulblade/shared'
import { eventBus } from '@/lib/event-bus'
import styles from './StatAllocation.module.scss'

const cx = classnames.bind(styles)

interface StatAllocationProps {
  readonly level: number
  readonly statPoints: number
  readonly onClose: () => void
}

type StatKey = 'hp' | 'atk' | 'def' | 'spd' | 'crit'

const STAT_CONFIG: ReadonlyArray<{
  key: StatKey
  label: string
  perPoint: string
}> = [
  { key: 'hp', label: 'HP', perPoint: `+${STAT_POINT_VALUES.hp}` },
  { key: 'atk', label: 'ATK', perPoint: `+${STAT_POINT_VALUES.atk}` },
  { key: 'def', label: 'DEF', perPoint: `+${STAT_POINT_VALUES.def}` },
  { key: 'spd', label: 'SPD', perPoint: `+${STAT_POINT_VALUES.spd}` },
  {
    key: 'crit',
    label: 'CRIT',
    perPoint: `+${(STAT_POINT_VALUES.crit * 100).toFixed(0)}%`,
  },
]

export const StatAllocation = ({
  level,
  statPoints,
  onClose,
}: StatAllocationProps) => {
  const [allocation, setAllocation] = useState<Record<StatKey, number>>({
    hp: 0,
    atk: 0,
    def: 0,
    spd: 0,
    crit: 0,
  })

  const usedPoints = Object.values(allocation).reduce((sum, v) => sum + v, 0)
  const remaining = statPoints - usedPoints

  const handleIncrement = useCallback(
    (key: StatKey) => {
      if (remaining <= 0) return
      setAllocation((prev) => ({ ...prev, [key]: prev[key] + 1 }))
    },
    [remaining],
  )

  const handleDecrement = useCallback((key: StatKey) => {
    setAllocation((prev) => {
      if (prev[key] <= 0) return prev
      return { ...prev, [key]: prev[key] - 1 }
    })
  }, [])

  const handleConfirm = useCallback(() => {
    eventBus.emit('stat:allocate', allocation)
    onClose()
  }, [allocation, onClose])

  return (
    <div className={cx('overlay')}>
      <div className={cx('container')}>
        <h2 className={cx('title')}>Level {level}!</h2>
        <p className={cx('subtitle')}>스탯 포인트를 배분하세요</p>
        <p className={cx('remaining')}>남은 포인트: {remaining}</p>

        <div className={cx('stats')}>
          {STAT_CONFIG.map(({ key, label, perPoint }) => (
            <div key={key} className={cx('statRow')}>
              <span className={cx('label')}>{label}</span>
              <span className={cx('perPoint')}>({perPoint}/pt)</span>
              <div className={cx('controls')}>
                <button
                  className={cx('btn', 'minus')}
                  onClick={() => handleDecrement(key)}
                  disabled={allocation[key] <= 0}
                >
                  -
                </button>
                <span className={cx('value')}>{allocation[key]}</span>
                <button
                  className={cx('btn', 'plus')}
                  onClick={() => handleIncrement(key)}
                  disabled={remaining <= 0}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          className={cx('confirmBtn')}
          onClick={handleConfirm}
          disabled={remaining > 0}
        >
          {remaining > 0 ? `${remaining} 포인트 남음` : '확인'}
        </button>
      </div>
    </div>
  )
}
