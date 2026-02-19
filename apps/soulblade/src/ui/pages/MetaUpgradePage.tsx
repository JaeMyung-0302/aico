import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import classnames from 'classnames/bind'
import type { PermanentStats } from '@soulblade/shared'
import { MAX_PERMANENT_STAT_LEVEL, calcPermanentStatCost } from '@soulblade/shared'
import { useMetaStore } from '@/stores/useMetaStore'
import { useAuthStore } from '@/stores/useAuthStore'
import styles from './MetaUpgradePage.module.scss'

const cx = classnames.bind(styles)

interface StatRow {
  readonly key: keyof PermanentStats
  readonly label: string
  readonly desc: string
}

const STAT_ROWS: readonly StatRow[] = [
  { key: 'hp', label: 'HP', desc: '최대 체력 +10/레벨' },
  { key: 'atk', label: 'ATK', desc: '공격력 +2/레벨' },
  { key: 'def', label: 'DEF', desc: '방어력 +2/레벨' },
  { key: 'spd', label: 'SPD', desc: '이동 속도 +1/레벨' },
  { key: 'crit', label: 'CRIT', desc: '크리티컬 +0.5%/레벨' },
]

export const MetaUpgradePage = () => {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.id)
  const metaGold = useMetaStore((s) => s.metaGold)
  const permanentStats = useMetaStore((s) => s.permanentStats)
  const fetchMeta = useMetaStore((s) => s.fetchMeta)
  const purchaseUpgrade = useMetaStore((s) => s.purchaseUpgrade)

  useEffect(() => {
    if (userId) fetchMeta(userId)
  }, [userId, fetchMeta])

  const handleUpgrade = async (statType: keyof PermanentStats) => {
    await purchaseUpgrade(statType)
  }

  return (
    <div className={cx('page')}>
      <header className={cx('header')}>
        <button className={cx('backBtn')} onClick={() => navigate('/')}>
          ←
        </button>
        <h1 className={cx('title')}>영구 강화</h1>
        <span className={cx('gold')}>💰 {metaGold}</span>
      </header>

      <div className={cx('statList')}>
        {STAT_ROWS.map(({ key, label, desc }) => {
          const level = permanentStats[key]
          const isMax = level >= MAX_PERMANENT_STAT_LEVEL
          const cost = isMax ? 0 : calcPermanentStatCost(level)
          const canAfford = metaGold >= cost

          return (
            <div key={key} className={cx('statRow')}>
              <div className={cx('statInfo')}>
                <span className={cx('statLabel')}>{label}</span>
                <span className={cx('statLevel')}>Lv.{level}/{MAX_PERMANENT_STAT_LEVEL}</span>
                <span className={cx('statDesc')}>{desc}</span>
              </div>
              <button
                className={cx('upgradeBtn', { disabled: isMax || !canAfford })}
                onClick={() => handleUpgrade(key)}
                disabled={isMax || !canAfford}
              >
                {isMax ? 'MAX' : `${cost}G`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
