import { useCallback } from 'react'
import { useGameStore } from '@/stores/useGameStore'
import { eventBus } from '@/lib/event-bus'
import { t } from '@/i18n'
import { getAllAnimalDefs, getAnimalDef } from '@/game/systems/animal'

const animalDefs = getAllAnimalDefs()

interface Props {
  readonly open: boolean
}

const AnimalPanel = ({ open }: Props) => {
  const { inventory, gold, animals, buildings } = useGameStore()

  const getItemCount = useCallback(
    (itemId: string): number =>
      inventory.reduce((sum, slot) => {
        if (!slot) return sum
        return slot.itemId === itemId ? sum + slot.quantity : sum
      }, 0),
    [inventory],
  )

  const barnLevel = buildings.find((b) => b.buildingId === 'barn')?.level ?? 0
  const maxAnimals = barnLevel * 3

  const handleBuy = (animalType: string) => {
    const def = getAnimalDef(animalType)
    if (!def) return
    const name = t(def.nameKey)
    eventBus.emit('animal:buy', { animalType, name })
  }

  const handleFeed = (animalId: string) => {
    eventBus.emit('animal:feed', { animalId })
  }

  const handleCollect = (animalId: string) => {
    eventBus.emit('animal:collect', { animalId })
  }

  if (!open) return null

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        {t('ui.animal.title')} ({animals.length}/{maxAnimals})
      </div>

      {barnLevel === 0 && (
        <div style={styles.noBarn}>{t('ui.animal.noBarn')}</div>
      )}

      {barnLevel > 0 && (
        <>
          <div style={styles.section}>{t('ui.animal.owned')}</div>
          <div style={styles.list}>
            {animals.length === 0 && (
              <div style={styles.empty}>{t('ui.animal.empty')}</div>
            )}
            {animals.map((animal) => {
              const def = getAnimalDef(animal.type)
              if (!def) return null
              const hasFeed = getItemCount(def.feedItemId) > 0
              return (
                <div key={animal.id} style={styles.row}>
                  <div style={styles.nameRow}>
                    <span style={styles.name}>{animal.name}</span>
                    <span style={styles.happiness}>
                      {'♥'.repeat(Math.min(animal.happiness, 10))}
                    </span>
                  </div>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.actionBtn, opacity: !animal.fedToday && hasFeed ? 1 : 0.5 }}
                      disabled={animal.fedToday || !hasFeed}
                      onClick={() => handleFeed(animal.id)}
                    >
                      {animal.fedToday ? t('ui.animal.fed') : t('ui.animal.feed')}
                    </button>
                    <button
                      style={{ ...styles.actionBtn, opacity: !animal.producedToday ? 1 : 0.5 }}
                      disabled={animal.producedToday}
                      onClick={() => handleCollect(animal.id)}
                    >
                      {animal.producedToday ? t('ui.animal.collected') : t('ui.animal.collect')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {animals.length < maxAnimals && (
            <>
              <div style={styles.section}>{t('ui.animal.buy')}</div>
              <div style={styles.list}>
                {animalDefs.map((def) => (
                  <div key={def.id} style={styles.buyRow}>
                    <span style={styles.name}>{t(def.nameKey)}</span>
                    <span style={{ ...styles.price, color: gold >= def.buyPrice ? '#fbbf24' : '#ef4444' }}>
                      {def.buyPrice}G
                    </span>
                    <button
                      style={{ ...styles.actionBtn, opacity: gold >= def.buyPrice ? 1 : 0.5 }}
                      disabled={gold < def.buyPrice}
                      onClick={() => handleBuy(def.id)}
                    >
                      {t('ui.animal.buyBtn')}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
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
  section: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#aaa',
    marginTop: 8,
    marginBottom: 4,
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  row: {
    padding: 6,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
  },
  nameRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  happiness: {
    fontSize: 8,
    color: '#f87171',
  },
  actions: {
    display: 'flex',
    gap: 4,
  },
  actionBtn: {
    flex: 1,
    padding: '3px 0',
    border: 'none',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 9,
    cursor: 'pointer',
  },
  buyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
  },
  price: {
    fontSize: 10,
    marginLeft: 'auto',
  },
  empty: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center' as const,
    padding: 12,
  },
  noBarn: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center' as const,
    padding: 20,
  },
}

export default AnimalPanel
