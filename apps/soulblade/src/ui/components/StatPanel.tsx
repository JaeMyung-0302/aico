import classnames from 'classnames/bind'
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
  readonly onClose: () => void
}

const formatStat = (key: string, value: number): string => {
  if (key === 'crit') return `${(value * 100).toFixed(1)}%`
  if (key === 'critDmg') return `${(value * 100).toFixed(0)}%`
  return `${Math.floor(value)}`
}

const STAT_ROWS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'level', label: 'Level' },
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'ATK' },
  { key: 'def', label: 'DEF' },
  { key: 'spd', label: 'SPD' },
  { key: 'crit', label: 'CRIT' },
  { key: 'critDmg', label: 'CRIT DMG' },
  { key: 'gold', label: 'Gold' },
]

export const StatPanel = ({ stats, onClose }: StatPanelProps) => {
  return (
    <div className={cx('panel')}>
      <div className={cx('header')}>
        <h3 className={cx('title')}>스탯</h3>
        <button className={cx('closeBtn')} onClick={onClose}>X</button>
      </div>
      <div className={cx('content')}>
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
    </div>
  )
}
