import { useNavigate } from 'react-router-dom'
import { useGrowthStore, UPGRADE_COSTS, BRANCH_BONUSES, MAX_TIER } from '@/stores/useGrowthStore'
import { useUserStore } from '@/stores/useUserStore'
import type { GrowthBranch } from '@/types'
import classNames from 'classnames/bind'
import styles from './GrowthPage.module.scss'

const cx = classNames.bind(styles)

const BRANCH_LABELS: Record<GrowthBranch, { name: string; icon: string; desc: string }> = {
  attack: { name: '공격', icon: '⚔️', desc: '전체 유닛 공격력 증가' },
  defense: { name: '방어', icon: '🛡️', desc: '기지 최대 HP 증가' },
  economy: { name: '경제', icon: '💰', desc: '골드 획득 보너스' },
  luck: { name: '행운', icon: '🍀', desc: '소환 및 융합 확률 증가' },
}

const BRANCHES: GrowthBranch[] = ['attack', 'defense', 'economy', 'luck']

const GrowthPage = () => {
  const navigate = useNavigate()
  const { levels, upgrade, getBonuses } = useGrowthStore()
  const { gel, addGel } = useUserStore()
  const bonuses = getBonuses()

  const handleUpgrade = (branch: GrowthBranch) => {
    const cost = UPGRADE_COSTS[levels[branch]] ?? 0
    if (gel < cost) return
    addGel(-cost)
    upgrade(branch)
  }

  return (
    <div className={cx('container')}>
      <header className={cx('header')}>
        <button className={cx('backButton')} onClick={() => navigate('/')}>
          ← 로비
        </button>
        <h1 className={cx('title')}>성장 트리</h1>
        <span className={cx('gelDisplay')}>{gel} Gel</span>
      </header>

      <div className={cx('branches')}>
        {BRANCHES.map((branch) => {
          const info = BRANCH_LABELS[branch]
          const level = levels[branch]
          const isMaxed = level >= MAX_TIER
          const cost = UPGRADE_COSTS[level] ?? 0
          const currentBonus = BRANCH_BONUSES[branch][level] ?? 0
          const nextBonus = BRANCH_BONUSES[branch][level + 1]

          return (
            <div key={branch} className={cx('branchCard')}>
              <div className={cx('branchHeader')}>
                <span className={cx('icon')}>{info.icon}</span>
                <span className={cx('branchName')}>{info.name}</span>
                <span className={cx('branchLevel')}>Tier {level}/{MAX_TIER}</span>
              </div>
              <p className={cx('branchDesc')}>{info.desc}</p>
              <div className={cx('tierBar')}>
                {Array.from({ length: MAX_TIER }).map((_, i) => (
                  <div
                    key={i}
                    className={cx('tierDot', { active: i < level })}
                  />
                ))}
              </div>
              <div className={cx('bonusInfo')}>
                현재: +{typeof currentBonus === 'number' && currentBonus < 1 ? `${(currentBonus * 100).toFixed(0)}%` : currentBonus}
                {nextBonus !== undefined && (
                  <span className={cx('nextBonus')}>
                    → +{typeof nextBonus === 'number' && nextBonus < 1 ? `${(nextBonus * 100).toFixed(0)}%` : nextBonus}
                  </span>
                )}
              </div>
              <button
                className={cx('upgradeButton', { disabled: isMaxed || gel < cost })}
                onClick={() => handleUpgrade(branch)}
                disabled={isMaxed || gel < cost}
              >
                {isMaxed ? 'MAX' : `업그레이드 (${cost} Gel)`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default GrowthPage
