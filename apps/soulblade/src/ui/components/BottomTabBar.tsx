import { useRef, useEffect } from 'react'
import classnames from 'classnames/bind'
import type { PassiveSkillId, StatAllocationData } from '@soulblade/shared'
import { StatPanel } from './StatPanel'
import { SkillPanel } from './SkillPanel'
import { InventoryPanel } from './InventoryPanel'
import styles from './BottomTabBar.module.scss'

const cx = classnames.bind(styles)

type PanelType = 'inventory' | 'skill' | 'stat'

interface FullStats {
  readonly hp: number
  readonly maxHp: number
  readonly atk: number
  readonly def: number
  readonly spd: number
  readonly crit: number
  readonly critDmg: number
  readonly level: number
  readonly gold: number
  readonly passiveSkills: ReadonlyArray<{ readonly id: PassiveSkillId; readonly level: number }>
}

interface BottomTabBarProps {
  readonly openPanel: PanelType | null
  readonly onTabPress: (panel: PanelType) => void
  readonly onClose: () => void
  readonly fullStats: FullStats | null
  readonly pendingStatPoints: number
  readonly onStatAllocate: (allocation: StatAllocationData) => void
}

const TABS: ReadonlyArray<{ readonly id: PanelType; readonly label: string }> = [
  { id: 'stat', label: '스탯' },
  { id: 'skill', label: '스킬' },
  { id: 'inventory', label: '가방' },
]

const TAB_COLORS: Record<PanelType, string> = {
  stat: '#4fc3f7',
  skill: '#9966ff',
  inventory: '#ffd700',
}

export const BottomTabBar = ({ openPanel, onTabPress, onClose, fullStats, pendingStatPoints, onStatAllocate }: BottomTabBarProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 패널 닫기
  useEffect(() => {
    if (!openPanel) return

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick)
    return () => document.removeEventListener('pointerdown', handleOutsideClick)
  }, [openPanel, onClose])

  return (
    <div ref={containerRef} className={cx('container')}>
      {openPanel && fullStats && (
        <div className={cx('panelContent')}>
          <div className={cx('panelHeader')}>
            <span
              className={cx('panelTitle')}
              style={{ color: TAB_COLORS[openPanel] }}
            >
              {TABS.find((t) => t.id === openPanel)?.label}
            </span>
          </div>
          <div className={cx('panelBody')}>
            {openPanel === 'stat' && (
              <StatPanel
                stats={fullStats}
                pendingStatPoints={pendingStatPoints}
                onAllocate={onStatAllocate}
              />
            )}
            {openPanel === 'skill' && <SkillPanel skills={fullStats.passiveSkills} />}
            {openPanel === 'inventory' && <InventoryPanel />}
          </div>
        </div>
      )}
      <div className={cx('tabBar')}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            className={cx('tab', { active: openPanel === id })}
            style={openPanel === id ? { color: TAB_COLORS[id] } : undefined}
            onClick={() => onTabPress(id)}
          >
            <span className={cx('tabLabel')}>{label}</span>
            {id === 'stat' && pendingStatPoints > 0 && (
              <span className={cx('badge')}>{pendingStatPoints}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
