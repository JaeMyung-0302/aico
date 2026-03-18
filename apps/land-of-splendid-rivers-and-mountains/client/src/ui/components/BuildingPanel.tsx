import { useCallback } from 'react'
import { useGameStore } from '@/stores/useGameStore'
import { eventBus } from '@/lib/event-bus'
import { t } from '@/i18n'
import { getAllBuildingDefs } from '@/game/systems/building'
import type { BuildingDefinition } from '@land-of-splendid-rivers-and-mountains/shared'

const buildingDefs = getAllBuildingDefs()

interface Props {
  readonly open: boolean
}

const BuildingPanel = ({ open }: Props) => {
  const { inventory, gold, buildings } = useGameStore()

  const getItemCount = useCallback(
    (itemId: string): number =>
      inventory.reduce((sum, slot) => {
        if (!slot) return sum
        return slot.itemId === itemId ? sum + slot.quantity : sum
      }, 0),
    [inventory],
  )

  const getBuiltLevel = (buildingId: string): number => {
    const built = buildings.find((b) => b.buildingId === buildingId)
    return built?.level ?? 0
  }

  const isUnderConstruction = (buildingId: string): boolean => {
    const built = buildings.find((b) => b.buildingId === buildingId)
    if (!built) return false
    return built.buildStartDay !== null && built.buildTargetDay !== null
  }

  const getNextLevel = (def: BuildingDefinition): typeof def.levels[number] | null => {
    const currentLevel = getBuiltLevel(def.id)
    return def.levels.find((l) => l.level === currentLevel + 1) ?? null
  }

  const canAfford = (def: BuildingDefinition): boolean => {
    const next = getNextLevel(def)
    if (!next) return false
    if (gold < next.goldCost) return false
    return next.materials.every((mat) => getItemCount(mat.itemId) >= mat.quantity)
  }

  const handleBuild = (buildingId: string) => {
    const builtLevel = getBuiltLevel(buildingId)
    if (builtLevel === 0) {
      eventBus.emit('building:build', { buildingId })
    } else {
      eventBus.emit('building:upgrade', { buildingId })
    }
  }

  if (!open) return null

  return (
    <div style={styles.panel}>
      <div style={styles.header}>{t('ui.building.title')}</div>
      <div style={styles.list}>
        {buildingDefs.map((def) => {
          const builtLevel = getBuiltLevel(def.id)
          const nextLevel = getNextLevel(def)
          const affordable = canAfford(def)
          const maxed = nextLevel === null
          const building = isUnderConstruction(def.id)

          return (
            <div key={def.id} style={styles.row}>
              <div style={styles.nameRow}>
                <span style={styles.name}>{t(def.nameKey)}</span>
                <span style={styles.level}>
                  Lv.{builtLevel}{maxed ? ` (${t('ui.building.max')})` : ''}
                </span>
              </div>
              <div style={styles.desc}>{t(def.descKey)}</div>
              {nextLevel && (
                <>
                  <div style={styles.costSection}>
                    {nextLevel.goldCost > 0 && (
                      <span style={{ ...styles.cost, color: gold >= nextLevel.goldCost ? '#fbbf24' : '#ef4444' }}>
                        {nextLevel.goldCost}G
                      </span>
                    )}
                    {nextLevel.materials.map((mat) => (
                      <span
                        key={mat.itemId}
                        style={{ ...styles.cost, color: getItemCount(mat.itemId) >= mat.quantity ? '#aaa' : '#ef4444' }}
                      >
                        {t(`item.material.${mat.itemId}`)} x{mat.quantity}
                      </span>
                    ))}
                    {nextLevel.buildDays > 0 && (
                      <span style={styles.days}>{nextLevel.buildDays}{t('ui.building.days')}</span>
                    )}
                  </div>
                  <button
                    style={{ ...styles.buildBtn, opacity: affordable && !building ? 1 : 0.5 }}
                    disabled={!affordable || building}
                    onClick={() => handleBuild(def.id)}
                  >
                    {building
                      ? `${t('ui.building.build')}...`
                      : builtLevel === 0 ? t('ui.building.build') : t('ui.building.upgrade')}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'absolute',
    top: 50,
    right: 8,
    bottom: 52,
    width: 220,
    background: 'rgba(20,20,30,0.92)',
    borderRadius: 10,
    padding: 10,
    zIndex: 120,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    fontFamily: '"Noto Sans KR", sans-serif',
  },
  header: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  row: {
    padding: 8,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
  },
  nameRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  level: {
    fontSize: 10,
    color: '#aaa',
  },
  desc: {
    fontSize: 9,
    color: '#888',
    marginBottom: 4,
  },
  costSection: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 4,
    marginBottom: 4,
  },
  cost: {
    fontSize: 9,
  },
  days: {
    fontSize: 9,
    color: '#60a5fa',
  },
  buildBtn: {
    width: '100%',
    padding: '4px 0',
    border: 'none',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 10,
    cursor: 'pointer',
  },
}

export default BuildingPanel
