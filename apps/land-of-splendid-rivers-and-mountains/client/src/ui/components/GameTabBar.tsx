import { memo } from 'react'
import { t } from '@/i18n'

export type TabId = 'inventory' | 'shop' | 'crafting' | 'building' | 'animal' | 'npc' | null

interface Props {
  readonly activeTab: TabId
  readonly onTabChange: (tab: TabId) => void
}

const TABS: ReadonlyArray<{ id: TabId & string; labelKey: string; icon: string }> = [
  { id: 'inventory', labelKey: 'ui.inventory.title', icon: '\uD83C\uDF92' },
  { id: 'shop', labelKey: 'ui.shop.title', icon: '\uD83C\uDFEA' },
  { id: 'crafting', labelKey: 'ui.crafting.title', icon: '\uD83C\uDF73' },
  { id: 'building', labelKey: 'ui.building.title', icon: '\uD83C\uDFE0' },
  { id: 'animal', labelKey: 'ui.animal.title', icon: '\uD83D\uDC14' },
  { id: 'npc', labelKey: 'ui.npc.title', icon: '\uD83D\uDDE3' },
]

const GameTabBar = memo(({ activeTab, onTabChange }: Props) => {
  return (
    <div style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(isActive ? styles.tabActive : {}),
            }}
            onClick={() => onTabChange(isActive ? null : tab.id)}
          >
            <span style={styles.icon}>{tab.icon}</span>
            <span style={{ ...styles.label, ...(isActive ? styles.labelActive : {}) }}>
              {t(tab.labelKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
})

const styles: Record<string, React.CSSProperties> = {
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: 2,
    padding: '4px 8px',
    background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 30%)',
    zIndex: 200,
    pointerEvents: 'auto',
  },
  tab: {
    flex: 1,
    maxWidth: 64,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 1,
    padding: '6px 4px 8px',
    border: 'none',
    borderRadius: '8px 8px 0 0',
    background: 'rgba(255,255,255,0.08)',
    cursor: 'pointer',
    transition: 'background 0.15s ease',
  },
  tabActive: {
    background: 'rgba(74,222,128,0.25)',
    boxShadow: '0 -2px 8px rgba(74,222,128,0.3)',
  },
  icon: {
    fontSize: 18,
    lineHeight: '1',
  },
  label: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: '"Noto Sans KR", sans-serif',
    whiteSpace: 'nowrap' as const,
  },
  labelActive: {
    color: '#4ade80',
    fontWeight: 'bold',
  },
}

export default GameTabBar
