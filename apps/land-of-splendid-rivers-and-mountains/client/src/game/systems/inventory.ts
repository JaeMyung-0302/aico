import type { InventorySlot, EquippedTools } from '@land-of-splendid-rivers-and-mountains/shared'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import { eventBus } from '@/lib/event-bus'
import type { ItemDefinition } from '@land-of-splendid-rivers-and-mountains/shared'
import itemsData from '../data/items.json'

const itemMap = new Map<string, ItemDefinition>(
  (itemsData as ReadonlyArray<ItemDefinition>).map((item) => [item.id, item]),
)

export class InventorySystem {
  private slots: Array<InventorySlot | null>
  private equipped: EquippedTools = { current: null }

  private readonly onEquipRequest = ({ toolId }: { toolId: string | null }) => {
    if (toolId) {
      this.equip(toolId)
    } else {
      this.unequip()
      eventBus.emit('inventory:equipped', { toolId: null })
    }
  }

  constructor() {
    this.slots = new Array<InventorySlot | null>(GAME_CONSTANTS.INVENTORY_SIZE).fill(null)
    eventBus.on('inventory:equipRequest', this.onEquipRequest)
  }

  destroy(): void {
    eventBus.off('inventory:equipRequest', this.onEquipRequest)
  }

  addItem(itemId: string, quantity = 1): boolean {
    const definition = itemMap.get(itemId)
    if (!definition) return false

    let remaining = quantity

    if (definition.stackable) {
      for (let i = 0; i < this.slots.length && remaining > 0; i++) {
        const slot = this.slots[i]
        if (slot?.itemId === itemId) {
          const space = definition.maxStack - slot.quantity
          const toAdd = Math.min(remaining, space)
          if (toAdd > 0) {
            this.slots[i] = { itemId, quantity: slot.quantity + toAdd }
            remaining -= toAdd
          }
        }
      }
    }

    for (let i = 0; i < this.slots.length && remaining > 0; i++) {
      if (this.slots[i] === null) {
        const maxStack = definition.stackable ? definition.maxStack : 1
        const toAdd = Math.min(remaining, maxStack)
        this.slots[i] = { itemId, quantity: toAdd }
        remaining -= toAdd
      }
    }

    if (remaining < quantity) {
      eventBus.emit('inventory:changed', { itemId, quantity: quantity - remaining })
    }

    return remaining === 0
  }

  removeItem(itemId: string, quantity = 1): boolean {
    let remaining = quantity

    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i]
      if (slot?.itemId === itemId) {
        const toRemove = Math.min(remaining, slot.quantity)
        const newQuantity = slot.quantity - toRemove
        this.slots[i] = newQuantity > 0 ? { itemId, quantity: newQuantity } : null
        remaining -= toRemove
      }
    }

    if (remaining < quantity) {
      eventBus.emit('inventory:changed', { itemId, quantity: -(quantity - remaining) })

      if (this.equipped.current === itemId && this.getItemCount(itemId) === 0) {
        this.unequip()
      }
    }

    return remaining === 0
  }

  getItemCount(itemId: string): number {
    let count = 0
    for (const slot of this.slots) {
      if (slot?.itemId === itemId) {
        count += slot.quantity
      }
    }
    return count
  }

  hasItem(itemId: string, quantity = 1): boolean {
    return this.getItemCount(itemId) >= quantity
  }

  getSlots(): ReadonlyArray<InventorySlot | null> {
    return [...this.slots]
  }

  equip(toolId: string): void {
    this.equipped = { current: toolId }
    eventBus.emit('inventory:equipped', { toolId })
  }

  unequip(): void {
    this.equipped = { current: null }
  }

  getEquipped(): EquippedTools {
    return this.equipped
  }

  getItemDefinition(itemId: string): ItemDefinition | undefined {
    return itemMap.get(itemId)
  }

  isFull(): boolean {
    return this.slots.every((slot) => slot !== null)
  }

  getState(): { slots: ReadonlyArray<InventorySlot | null>; equipped: EquippedTools } {
    return { slots: [...this.slots], equipped: { ...this.equipped } }
  }

  loadState(slots: ReadonlyArray<InventorySlot | null>, equipped: EquippedTools): void {
    this.slots = [...slots]
    this.equipped = { ...equipped }
  }
}
