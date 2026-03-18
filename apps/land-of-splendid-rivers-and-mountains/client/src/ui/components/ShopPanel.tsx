import { useState } from 'react'
import { useGameStore } from '@/stores/useGameStore'
import { eventBus } from '@/lib/event-bus'
import { getItemName } from '@/ui/item-names'
import { t } from '@/i18n'
import cropsData from '@/game/data/crops.json'
import itemsData from '@/game/data/items.json'
import type { CropDefinition, ItemDefinition } from '@land-of-splendid-rivers-and-mountains/shared'

const crops = cropsData as ReadonlyArray<CropDefinition>
const itemMap = new Map<string, ItemDefinition>(
  (itemsData as ReadonlyArray<ItemDefinition>).map((item) => [item.id, item]),
)

interface Props {
  readonly open: boolean
}

const ShopPanel = ({ open }: Props) => {
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const { gold, season, inventory } = useGameStore()

  if (!open) return null

  const availableSeeds = crops.filter((c) => c.seasons.includes(season))

  const sellableItems = inventory.filter((slot) => {
    if (!slot) return false
    const def = itemMap.get(slot.itemId)
    return def !== undefined && def.sellPrice > 0 && def.type !== 'tool'
  })

  const handleBuy = (cropDef: CropDefinition) => {
    if (gold < cropDef.seedPrice) return
    eventBus.emit('shop:buy', { itemId: `seed-${cropDef.id}` })
  }

  const handleSell = (itemId: string) => {
    eventBus.emit('shop:sell', { itemId, quantity: 1 })
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.goldBadge}>{gold.toLocaleString()}G</span>
      </div>
      <div style={styles.tabs}>
        <button
          style={tab === 'buy' ? styles.tabActive : styles.tab}
          onClick={() => setTab('buy')}
        >
          {t('ui.shop.buy')}
        </button>
        <button
          style={tab === 'sell' ? styles.tabActive : styles.tab}
          onClick={() => setTab('sell')}
        >
          {t('ui.shop.sell')}
        </button>
      </div>
      <div style={styles.list}>
        {tab === 'buy' &&
          availableSeeds.map((crop) => (
            <div key={crop.id} style={styles.row}>
              <span style={styles.itemName}>{getItemName(`seed-${crop.id}`)}</span>
              <span style={styles.price}>{crop.seedPrice}G</span>
              <button
                style={{
                  ...styles.actionBtn,
                  opacity: gold >= crop.seedPrice ? 1 : 0.4,
                }}
                onClick={() => handleBuy(crop)}
                disabled={gold < crop.seedPrice}
              >
                {t('ui.shop.buy')}
              </button>
            </div>
          ))}
        {tab === 'sell' &&
          (sellableItems.length === 0 ? (
            <div style={styles.empty}>{t('ui.shop.empty')}</div>
          ) : (
            sellableItems.map((slot, idx) => {
              if (!slot) return null
              const def = itemMap.get(slot.itemId)
              if (!def) return null
              return (
                <div key={`${slot.itemId}-${idx}`} style={styles.row}>
                  <span style={styles.itemName}>
                    {getItemName(slot.itemId)} x{slot.quantity}
                  </span>
                  <span style={styles.price}>{def.sellPrice}G</span>
                  <button style={styles.actionBtn} onClick={() => handleSell(slot.itemId)}>
                    {t('ui.shop.sell')}
                  </button>
                </div>
              )
            })
          ))}
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
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: 6,
  },
  goldBadge: {
    color: '#fbbf24',
    fontSize: 15,
    fontWeight: 'bold',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    padding: '4px 0',
    border: 'none',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.1)',
    color: '#aaa',
    fontSize: 12,
    cursor: 'pointer',
  },
  tabActive: {
    flex: 1,
    padding: '4px 0',
    border: 'none',
    borderRadius: 4,
    background: '#4ade80',
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 6px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 11,
    color: '#ddd',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  price: {
    fontSize: 11,
    color: '#fbbf24',
    fontWeight: 'bold',
    minWidth: 36,
    textAlign: 'right' as const,
  },
  actionBtn: {
    padding: '2px 8px',
    border: 'none',
    borderRadius: 3,
    background: '#4ade80',
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  empty: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center' as const,
    padding: 16,
  },
}

export default ShopPanel
