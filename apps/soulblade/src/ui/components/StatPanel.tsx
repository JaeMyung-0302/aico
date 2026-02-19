import { useState, useCallback, useEffect } from 'react'
import classnames from 'classnames/bind'
import type { StatAllocationData } from '@soulblade/shared'
import { STAT_POINT_VALUES } from '@soulblade/shared'
import styles from './StatPanel.module.scss'

const cx = classnames.bind(styles)

interface StatPanelProps {
  readonly stats: {
    readonly hp: number
    readonly maxHp: number
    readonly atk: number
    readonly def: number
    readonly spd: number
    readonly crit: number
    readonly critDmg: number
    readonly level: number
    readonly gold: number
  }
  readonly pendingStatPoints?: number
  readonly onAllocate?: (allocation: StatAllocationData) => void
}

const formatStat = (key: string, value: number): string => {
  if (key === 'crit') return `${(value * 100).toFixed(1)}%`
  if (key === 'critDmg') return `${(value * 100).toFixed(0)}%`
  return `${Math.floor(value)}`
}

const STAT_ROWS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'level', label: 'Lv' },
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'ATK' },
  { key: 'def', label: 'DEF' },
  { key: 'spd', label: 'SPD' },
  { key: 'crit', label: 'CRIT' },
  { key: 'critDmg', label: 'CRIT DMG' },
  { key: 'gold', label: 'Gold' },
]

type StatKey = 'hp' | 'atk' | 'def' | 'spd' | 'crit'

const ALLOCATABLE_STATS: ReadonlyArray<{ key: StatKey; label: string; perPoint: string }> = [
  { key: 'hp', label: 'HP', perPoint: `+${STAT_POINT_VALUES.hp}` },
  { key: 'atk', label: 'ATK', perPoint: `+${STAT_POINT_VALUES.atk}` },
  { key: 'def', label: 'DEF', perPoint: `+${STAT_POINT_VALUES.def}` },
  { key: 'spd', label: 'SPD', perPoint: `+${STAT_POINT_VALUES.spd}` },
  { key: 'crit', label: 'CRIT', perPoint: `+${(STAT_POINT_VALUES.crit * 100).toFixed(0)}%` },
]

export const StatPanel = ({ stats, pendingStatPoints = 0, onAllocate }: StatPanelProps) => {
  const [allocation, setAllocation] = useState<Record<StatKey, number>>({
    hp: 0, atk: 0, def: 0, spd: 0, crit: 0,
  })

  // pendingStatPoints 변경 시 allocation 리셋
  useEffect(() => {
    setAllocation({ hp: 0, atk: 0, def: 0, spd: 0, crit: 0 })
  }, [pendingStatPoints])

  const usedPoints = Object.values(allocation).reduce((sum, v) => sum + v, 0)
  const remaining = Math.max(0, pendingStatPoints - usedPoints)

  const handleIncrement = useCallback((key: StatKey) => {
    if (remaining <= 0) return
    setAllocation((prev) => ({ ...prev, [key]: prev[key] + 1 }))
  }, [remaining])

  const handleDecrement = useCallback((key: StatKey) => {
    setAllocation((prev) => {
      if (prev[key] <= 0) return prev
      return { ...prev, [key]: prev[key] - 1 }
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (usedPoints <= 0 || !onAllocate) return
    onAllocate(allocation)
    setAllocation({ hp: 0, atk: 0, def: 0, spd: 0, crit: 0 })
  }, [allocation, usedPoints, onAllocate])

  return (
    <div className={cx('content')}>
      {pendingStatPoints > 0 && (
        <div className={cx('allocSection')}>
          <div className={cx('allocHeader')}>
            <span className={cx('allocTitle')}>포인트 배분</span>
            <span className={cx('allocRemaining')}>남은 포인트: {remaining}</span>
          </div>
          {ALLOCATABLE_STATS.map(({ key, label, perPoint }) => (
            <div key={key} className={cx('allocRow')}>
              <span className={cx('allocLabel')}>{label}</span>
              <span className={cx('allocPerPoint')}>({perPoint})</span>
              <div className={cx('allocControls')}>
                <button
                  className={cx('allocBtn')}
                  onClick={() => handleDecrement(key)}
                  disabled={allocation[key] <= 0}
                >-</button>
                <span className={cx('allocValue')}>{allocation[key]}</span>
                <button
                  className={cx('allocBtn')}
                  onClick={() => handleIncrement(key)}
                  disabled={remaining <= 0}
                >+</button>
              </div>
            </div>
          ))}
          <button
            className={cx('allocConfirm')}
            onClick={handleConfirm}
            disabled={usedPoints <= 0}
          >
            적용 ({usedPoints}pt)
          </button>
        </div>
      )}
      {STAT_ROWS.map(({ key, label }) => {
        const value = key === 'hp'
          ? `${Math.floor(stats.hp)} / ${Math.floor(stats.maxHp)}`
          : formatStat(key, stats[key as keyof typeof stats] as number)
        return (
          <div key={key} className={cx('row')}>
            <span className={cx('label')}>{label}</span>
            <span className={cx('value')}>{value}</span>
          </div>
        )
      })}
    </div>
  )
}
