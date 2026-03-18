import { t } from '@/i18n'
import itemsData from '@/game/data/items.json'
import type { ItemDefinition } from '@land-of-splendid-rivers-and-mountains/shared'

const itemMap = new Map<string, ItemDefinition>(
  (itemsData as ReadonlyArray<ItemDefinition>).map((item) => [item.id, item]),
)

export const getItemName = (itemId: string): string => {
  const def = itemMap.get(itemId)
  if (def) return t(def.nameKey)
  return itemId
}
