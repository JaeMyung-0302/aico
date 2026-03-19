import type { CropDefinition, ItemDefinition } from '@land-of-splendid-rivers-and-mountains/shared'
import type { InventorySystem } from '../systems/inventory'
import type { EnergySystem } from '../systems/energy'
import type { NPCSystem } from '../systems/npc'
import type { FermentationSystem } from '../systems/fermentation'
import type { BuildingSystem } from '../systems/building'
import type { AnimalSystem } from '../systems/animal'
import type { CombatSystem } from '../systems/combat'
import type { EventSystem } from '../systems/event'
import { getRecipe } from '../systems/fermentation'
import { getBuildingDef } from '../systems/building'
import { getAnimalDef } from '../systems/animal'
import { eventBus } from '@/lib/event-bus'
import { useGameStore } from '@/stores/useGameStore'
import cropsData from '../data/crops.json'
import itemsData from '../data/items.json'

const cropMap = new Map<string, CropDefinition>(
  (cropsData as ReadonlyArray<CropDefinition>).map((c) => [c.id, c]),
)
const itemMap = new Map<string, ItemDefinition>(
  (itemsData as ReadonlyArray<ItemDefinition>).map((item) => [item.id, item]),
)

interface EventHandlerDeps {
  inventory: InventorySystem
  energySystem: EnergySystem
  npcSystem: NPCSystem
  fermentSystem: FermentationSystem
  buildingSystem: BuildingSystem
  animalSystem: AnimalSystem
  combatSystem: CombatSystem
  eventSystem: EventSystem
  syncInventory: () => void
  renderBuildings: (bs: BuildingSystem) => void
  buildingLayout: Readonly<Record<string, { tileX: number; tileY: number; pixelSize: number }>>
}

export const registerFarmEventHandlers = (deps: EventHandlerDeps): (() => void) => {
  const {
    inventory, npcSystem, fermentSystem, buildingSystem,
    animalSystem, combatSystem,
    syncInventory, renderBuildings, buildingLayout,
  } = deps

  const syncFermentation = () => {
    const slots: { slotIndex: number; recipeId: string; elapsed: number; required: number }[] = []
    for (let i = 0; i < fermentSystem.getSlotCount(); i++) {
      const info = fermentSystem.getSlotInfo(i)
      if (info) slots.push({ slotIndex: i, ...info })
    }
    useGameStore.getState().setFermentationSlots(slots)
  }

  const syncBuildings = () => {
    useGameStore.getState().setBuildings(buildingSystem.getState())
    renderBuildings(buildingSystem)
  }

  const syncAnimals = () => {
    useGameStore.getState().setAnimals(animalSystem.getState())
  }

  const syncCombatHp = () => {
    useGameStore.getState().setPlayerHp(combatSystem.getHp(), combatSystem.getMaxHp())
  }

  const onShopBuy = ({ itemId }: { itemId: string }) => {
    if (!itemId.startsWith('seed-')) return
    const cropId = itemId.slice(5)
    const cropDef = cropMap.get(cropId)
    if (!cropDef) return

    const store = useGameStore.getState()
    if (store.gold < cropDef.seedPrice) return
    if (inventory.isFull()) return

    inventory.addItem(itemId)
    const newGold = store.gold - cropDef.seedPrice
    eventBus.emit('gold:changed', { amount: -cropDef.seedPrice, total: newGold })
    syncInventory()
  }

  const onShopSell = ({ itemId, quantity }: { itemId: string; quantity: number }) => {
    const def = itemMap.get(itemId)
    if (!def || def.sellPrice <= 0) return
    if (!inventory.hasItem(itemId, quantity)) return

    inventory.removeItem(itemId, quantity)
    const earnings = def.sellPrice * quantity
    const store = useGameStore.getState()
    const newGold = store.gold + earnings
    eventBus.emit('gold:changed', { amount: earnings, total: newGold })
    syncInventory()
  }

  const onGiftRequested = ({ npcId, itemId }: { npcId: string; itemId: string }) => {
    if (!inventory.hasItem(itemId, 1)) return
    inventory.removeItem(itemId, 1)
    npcSystem.giveGift(npcId, itemId)
    syncInventory()
  }

  const onCook = ({ recipeId }: { recipeId: string }) => {
    const recipe = getRecipe(recipeId)
    if (!recipe || recipe.type !== 'cooking') return
    if (inventory.isFull()) return
    for (const ing of recipe.ingredients) {
      if (!inventory.hasItem(ing.itemId, ing.quantity)) return
    }
    for (const ing of recipe.ingredients) {
      inventory.removeItem(ing.itemId, ing.quantity)
    }
    inventory.addItem(recipe.resultItemId)
    syncInventory()
  }

  const onFerment = ({ recipeId }: { recipeId: string }) => {
    const recipe = getRecipe(recipeId)
    if (!recipe || recipe.type !== 'fermentation') return
    for (const ing of recipe.ingredients) {
      if (!inventory.hasItem(ing.itemId, ing.quantity)) return
    }
    const slotIndex = fermentSystem.startFermentation(recipeId)
    if (slotIndex === null) return
    for (const ing of recipe.ingredients) {
      inventory.removeItem(ing.itemId, ing.quantity)
    }
    syncInventory()
    syncFermentation()
  }

  const onCollect = ({ slotIndex }: { slotIndex: number }) => {
    if (inventory.isFull()) return
    const resultItemId = fermentSystem.collectSlot(slotIndex)
    if (!resultItemId) return
    inventory.addItem(resultItemId)
    syncInventory()
    syncFermentation()
  }

  const onBuildingBuild = ({ buildingId }: { buildingId: string }) => {
    const cost = buildingSystem.getNextLevelCost(buildingId)
    if (!cost) return
    const store = useGameStore.getState()
    if (store.gold < cost.goldCost) return
    for (const mat of cost.materials) {
      if (!inventory.hasItem(mat.itemId, mat.quantity)) return
    }
    const layout = buildingLayout[buildingId]
    const bx = layout?.tileX ?? 0
    const by = layout?.tileY ?? 0
    if (!buildingSystem.build(buildingId, bx, by)) return
    for (const mat of cost.materials) {
      inventory.removeItem(mat.itemId, mat.quantity)
    }
    const newGold = store.gold - cost.goldCost
    eventBus.emit('gold:changed', { amount: -cost.goldCost, total: newGold })
    syncInventory()
    syncBuildings()
  }

  const onBuildingUpgrade = ({ buildingId }: { buildingId: string }) => {
    const cost = buildingSystem.getNextLevelCost(buildingId)
    if (!cost) return
    const store = useGameStore.getState()
    if (store.gold < cost.goldCost) return
    for (const mat of cost.materials) {
      if (!inventory.hasItem(mat.itemId, mat.quantity)) return
    }
    if (!buildingSystem.upgrade(buildingId)) return
    for (const mat of cost.materials) {
      inventory.removeItem(mat.itemId, mat.quantity)
    }
    const newGold = store.gold - cost.goldCost
    eventBus.emit('gold:changed', { amount: -cost.goldCost, total: newGold })
    syncInventory()
    syncBuildings()
  }

  const onFainted = ({ goldPenaltyRate }: { goldPenaltyRate: number }) => {
    const store = useGameStore.getState()
    const penalty = Math.floor(store.gold * goldPenaltyRate)
    if (penalty > 0) {
      const newGold = store.gold - penalty
      eventBus.emit('gold:changed', { amount: -penalty, total: newGold })
    }
  }

  const onAnimalBuy = ({ animalType, name }: { animalType: string; name: string }) => {
    const def = getAnimalDef(animalType)
    if (!def) return
    const store = useGameStore.getState()
    if (store.gold < def.buyPrice) return
    const barnLevel = store.buildings.find((b) => b.buildingId === 'barn')?.level ?? 0
    const maxAnimals = barnLevel * 3
    if (animalSystem.getAnimalCount() >= maxAnimals) return
    const animalId = animalSystem.buyAnimal(animalType, name)
    if (!animalId) return
    const newGold = store.gold - def.buyPrice
    eventBus.emit('gold:changed', { amount: -def.buyPrice, total: newGold })
    syncAnimals()
  }

  const onAnimalFeed = ({ animalId }: { animalId: string }) => {
    const animals = animalSystem.getState()
    const animal = animals.find((a) => a.id === animalId)
    if (!animal) return
    const def = getAnimalDef(animal.type)
    if (!def) return
    if (!inventory.hasItem(def.feedItemId, 1)) return
    if (!animalSystem.feedAnimal(animalId)) return
    inventory.removeItem(def.feedItemId, 1)
    syncInventory()
    syncAnimals()
  }

  const onAnimalCollect = ({ animalId }: { animalId: string }) => {
    if (inventory.isFull()) return
    const produceItemId = animalSystem.collectProduce(animalId)
    if (produceItemId) {
      inventory.addItem(produceItemId)
      syncInventory()
    }
    syncAnimals()
  }

  const onCombatDefeated = ({ drops }: { monsterId: string; drops: ReadonlyArray<{ itemId: string; quantity: number }> }) => {
    for (const drop of drops) {
      if (!inventory.isFull()) {
        inventory.addItem(drop.itemId, drop.quantity)
      }
    }
    syncInventory()
  }

  const onCombatPlayerHit = () => syncCombatHp()
  const onCombatPlayerDied = () => {
    combatSystem.clearMonsters()
    syncCombatHp()
  }

  const onFishCaught = ({ fishId }: { fishId: string }) => {
    if (!inventory.isFull()) {
      inventory.addItem(fishId)
      syncInventory()
    }
  }

  const onEventReward = ({ goldReward, items }: {
    eventId: string; goldReward: number
    items: ReadonlyArray<{ itemId: string; quantity: number }>
  }) => {
    const store = useGameStore.getState()
    if (goldReward > 0) {
      const newGold = store.gold + goldReward
      eventBus.emit('gold:changed', { amount: goldReward, total: newGold })
    }
    for (const item of items) {
      if (!inventory.isFull()) {
        inventory.addItem(item.itemId, item.quantity)
      }
    }
    syncInventory()
  }

  const onQuestReward = ({ goldReward, items }: {
    questId: string; goldReward: number
    items: ReadonlyArray<{ itemId: string; quantity: number }>
  }) => {
    const store = useGameStore.getState()
    if (goldReward > 0) {
      const newGold = store.gold + goldReward
      eventBus.emit('gold:changed', { amount: goldReward, total: newGold })
    }
    for (const item of items) {
      if (!inventory.isFull()) {
        inventory.addItem(item.itemId, item.quantity)
      }
    }
    syncInventory()
  }

  // Register all events
  eventBus.on('quest:reward', onQuestReward)
  eventBus.on('event:reward', onEventReward)
  eventBus.on('fishing:caught', onFishCaught)
  eventBus.on('combat:defeated', onCombatDefeated)
  eventBus.on('combat:playerHit', onCombatPlayerHit)
  eventBus.on('combat:playerDied', onCombatPlayerDied)
  eventBus.on('inventory:changed', syncInventory)
  eventBus.on('inventory:equipped', syncInventory)
  eventBus.on('shop:buy', onShopBuy)
  eventBus.on('shop:sell', onShopSell)
  eventBus.on('npc:giftRequested', onGiftRequested)
  eventBus.on('energy:fainted', onFainted)
  eventBus.on('crafting:cook', onCook)
  eventBus.on('crafting:ferment', onFerment)
  eventBus.on('crafting:collect', onCollect)
  eventBus.on('building:build', onBuildingBuild)
  eventBus.on('building:upgrade', onBuildingUpgrade)
  eventBus.on('building:completed', syncBuildings)
  eventBus.on('animal:buy', onAnimalBuy)
  eventBus.on('animal:feed', onAnimalFeed)
  eventBus.on('animal:collect', onAnimalCollect)

  // Return cleanup function
  return () => {
    eventBus.off('inventory:changed', syncInventory)
    eventBus.off('inventory:equipped', syncInventory)
    eventBus.off('shop:buy', onShopBuy)
    eventBus.off('shop:sell', onShopSell)
    eventBus.off('npc:giftRequested', onGiftRequested)
    eventBus.off('energy:fainted', onFainted)
    eventBus.off('crafting:cook', onCook)
    eventBus.off('crafting:ferment', onFerment)
    eventBus.off('crafting:collect', onCollect)
    eventBus.off('building:build', onBuildingBuild)
    eventBus.off('building:upgrade', onBuildingUpgrade)
    eventBus.off('building:completed', syncBuildings)
    eventBus.off('animal:buy', onAnimalBuy)
    eventBus.off('animal:feed', onAnimalFeed)
    eventBus.off('animal:collect', onAnimalCollect)
    eventBus.off('fishing:caught', onFishCaught)
    eventBus.off('combat:defeated', onCombatDefeated)
    eventBus.off('combat:playerHit', onCombatPlayerHit)
    eventBus.off('combat:playerDied', onCombatPlayerDied)
    eventBus.off('quest:reward', onQuestReward)
    eventBus.off('event:reward', onEventReward)
  }
}

export const syncFermentationState = (fermentSystem: FermentationSystem) => {
  const slots: { slotIndex: number; recipeId: string; elapsed: number; required: number }[] = []
  for (let i = 0; i < fermentSystem.getSlotCount(); i++) {
    const info = fermentSystem.getSlotInfo(i)
    if (info) slots.push({ slotIndex: i, ...info })
  }
  useGameStore.getState().setFermentationSlots(slots)
}

export const syncBuildingsState = (buildingSystem: BuildingSystem, renderBuildings: (bs: BuildingSystem) => void) => {
  useGameStore.getState().setBuildings(buildingSystem.getState())
  renderBuildings(buildingSystem)
}

export const syncAnimalsState = (animalSystem: AnimalSystem) => {
  useGameStore.getState().setAnimals(animalSystem.getState())
}

export const syncCombatHpState = (combatSystem: CombatSystem) => {
  useGameStore.getState().setPlayerHp(combatSystem.getHp(), combatSystem.getMaxHp())
}
