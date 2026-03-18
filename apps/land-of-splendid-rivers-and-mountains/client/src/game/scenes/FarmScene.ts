import Phaser from 'phaser'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import type { CropDefinition, ItemDefinition } from '@land-of-splendid-rivers-and-mountains/shared'
import { Player } from '../entities/Player'
import { InputManager } from '../input/input-manager'
import { KeyboardInput } from '../input/keyboard-input'
import { TouchInput } from '../input/touch-input'
import { SystemManager } from '../systems/system-manager'
import { TimeWeatherSystem } from '../systems/time-weather'
import { FarmSystem, isFarmTile, FARM_ZONES } from '../systems/farm'
import { InventorySystem } from '../systems/inventory'
import { EnergySystem } from '../systems/energy'
import { NPCSystem } from '../systems/npc'
import { FermentationSystem, getRecipe } from '../systems/fermentation'
import { BuildingSystem, getBuildingDef } from '../systems/building'
import { AnimalSystem, getAnimalDef } from '../systems/animal'
import { CombatSystem } from '../systems/combat'
import { FishingSystem } from '../systems/fishing'
import { EventSystem } from '../systems/event'
import { AudioSystem } from '../systems/audio'
import { LodSystem } from '../systems/lod'
import { createPositionEmitter } from '../utils/position-emitter'
import { eventBus } from '@/lib/event-bus'
import { useGameStore } from '@/stores/useGameStore'
import { saveManager, SAVE_VERSION } from '@/lib/save-manager'
import cropsData from '../data/crops.json'
import itemsData from '../data/items.json'

const cropMap = new Map<string, CropDefinition>(
  (cropsData as ReadonlyArray<CropDefinition>).map((c) => [c.id, c]),
)
const itemMap = new Map<string, ItemDefinition>(
  (itemsData as ReadonlyArray<ItemDefinition>).map((item) => [item.id, item]),
)

const PLAYER_SPAWN_X = 22
const PLAYER_SPAWN_Y = 9

const BUILDING_LAYOUT: Readonly<Record<string, { tileX: number; tileY: number; pixelSize: number }>> = {
  house: { tileX: 2, tileY: 1, pixelSize: 128 },
  storage: { tileX: 7, tileY: 2, pixelSize: 96 },
  brewery: { tileX: 11, tileY: 2, pixelSize: 96 },
  smithy: { tileX: 15, tileY: 2, pixelSize: 96 },
  barn: { tileX: 2, tileY: 6, pixelSize: 128 },
  greenhouse: { tileX: 7, tileY: 6, pixelSize: 128 },
}

export class FarmScene extends Phaser.Scene {
  private player!: Player
  private inputManager!: InputManager
  private keyboardInput!: KeyboardInput
  private touchInput!: TouchInput
  private systemManager!: SystemManager
  private combatSystem!: CombatSystem
  private energySystem!: EnergySystem
  private farmSystem!: FarmSystem
  private fishingSystem!: FishingSystem
  private inventorySystem!: InventorySystem
  private npcSystem!: NPCSystem
  private prevAction = false
  private readonly emitPosition = createPositionEmitter('FarmScene')
  private syncInventoryFn: (() => void) | null = null
  private groundLayer!: Phaser.Tilemaps.TilemapLayer | null
  private collisionLayer!: Phaser.Tilemaps.TilemapLayer | null
  private readonly buildingSprites: Map<string, Phaser.GameObjects.Image> = new Map()
  private tileCursor!: Phaser.GameObjects.Graphics
  private plantOverlay!: Phaser.GameObjects.Graphics
  private overlayScrollX = -1
  private overlayScrollY = -1
  private overlayEquipped: string | null = null
  private overlayDirty = true
  private cursorTileX = -1
  private cursorTileY = -1
  private cursorColor = -1
  private cursorAlpha = -1

  constructor() {
    super({ key: 'FarmScene' })
  }

  preload(): void {
    this.createTilesetTexture()
    this.load.tilemapTiledJSON('farm-map', '/assets/tilemaps/farm.json')
  }

  create(): void {
    this.isTransitioning = false
    const map = this.loadTilemap()

    this.inputManager = new InputManager()
    this.keyboardInput = new KeyboardInput()
    this.touchInput = new TouchInput()
    this.keyboardInput.init(this)
    this.touchInput.init(this)

    const data = this.scene.settings.data as { spawnX?: number; spawnY?: number } | undefined
    const tileX = data?.spawnX ?? PLAYER_SPAWN_X
    const tileY = data?.spawnY ?? PLAYER_SPAWN_Y
    const spawnX = tileX * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2
    const spawnY = tileY * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2
    this.player = new Player(this, spawnX, spawnY)
    this.player.sprite.setDepth(10)

    const inventory = new InventorySystem()
    const timeWeather = new TimeWeatherSystem()
    const farmSystem = new FarmSystem()
    const energySystem = new EnergySystem()
    const npcSystem = new NPCSystem()
    const fermentSystem = new FermentationSystem()
    const buildingSystem = new BuildingSystem()
    const animalSystem = new AnimalSystem()
    const combatSystem = new CombatSystem()
    const fishingSystem = new FishingSystem()
    const eventSystem = new EventSystem()
    farmSystem.setInventory(inventory)
    farmSystem.setEnergySystem(energySystem)

    this.systemManager = new SystemManager(['lod', 'time-weather', 'energy', 'farm', 'npc', 'fermentation', 'building', 'animal', 'combat', 'fishing', 'event', 'audio'])
    this.systemManager.register(new LodSystem())
    this.systemManager.register(timeWeather)
    this.systemManager.register(energySystem)
    this.systemManager.register(farmSystem)
    this.systemManager.register(npcSystem)
    this.systemManager.register(fermentSystem)
    this.systemManager.register(buildingSystem)
    this.systemManager.register(animalSystem)
    this.systemManager.register(combatSystem)
    this.systemManager.register(fishingSystem)
    this.systemManager.register(eventSystem)
    this.systemManager.register(new AudioSystem())
    this.systemManager.initAll(this)

    combatSystem.setPlayerSprite(this.player.sprite)
    npcSystem.setPlayerSprite(this.player.sprite)
    this.combatSystem = combatSystem
    this.energySystem = energySystem
    this.farmSystem = farmSystem
    this.fishingSystem = fishingSystem
    this.inventorySystem = inventory
    this.npcSystem = npcSystem

    const syncInventory = () => {
      const state = inventory.getState()
      useGameStore.getState().setInventory(state.slots)
      useGameStore.getState().setEquippedTools(state.equipped)
    }
    this.syncInventoryFn = syncInventory

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

    const syncFermentation = () => {
      const slots: { slotIndex: number; recipeId: string; elapsed: number; required: number }[] = []
      for (let i = 0; i < fermentSystem.getSlotCount(); i++) {
        const info = fermentSystem.getSlotInfo(i)
        if (info) slots.push({ slotIndex: i, ...info })
      }
      useGameStore.getState().setFermentationSlots(slots)
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

    const syncBuildings = () => {
      useGameStore.getState().setBuildings(buildingSystem.getState())
      this.renderBuildings(buildingSystem)
    }

    const onBuildingBuild = ({ buildingId }: { buildingId: string }) => {
      const cost = buildingSystem.getNextLevelCost(buildingId)
      if (!cost) return
      const store = useGameStore.getState()
      if (store.gold < cost.goldCost) return
      for (const mat of cost.materials) {
        if (!inventory.hasItem(mat.itemId, mat.quantity)) return
      }
      const layout = BUILDING_LAYOUT[buildingId]
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

    const syncAnimals = () => {
      useGameStore.getState().setAnimals(animalSystem.getState())
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

    const syncCombatHp = () => {
      useGameStore.getState().setPlayerHp(combatSystem.getHp(), combatSystem.getMaxHp())
    }

    const onCombatDefeated = ({ drops }: { monsterId: string; drops: ReadonlyArray<{ itemId: string; quantity: number }> }) => {
      for (const drop of drops) {
        if (!inventory.isFull()) {
          inventory.addItem(drop.itemId, drop.quantity)
        }
      }
      syncInventory()
    }

    const onCombatPlayerHit = () => {
      syncCombatHp()
    }

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

    syncInventory()

    saveManager.setup(
      () => {
        const store = useGameStore.getState()
        const invState = inventory.getState()
        return {
          version: SAVE_VERSION,
          lastSavedAt: new Date().toISOString(),
          gold: store.gold,
          energy: energySystem.getCurrent(),
          maxEnergy: energySystem.getMax(),
          day: timeWeather.getDay(),
          season: timeWeather.getSeason(),
          year: timeWeather.getYear(),
          timeOfDay: timeWeather.getTimeOfDay(),
          weather: timeWeather.getWeather(),
          farmPlots: farmSystem.getState(),
          inventory: invState.slots,
          equippedTools: invState.equipped,
          npcRelations: npcSystem.getRelationsState(),
          fermentations: fermentSystem.getState(),
          buildings: buildingSystem.getState(),
          animals: animalSystem.getState(),
          playerHp: combatSystem.getHp(),
          playerMaxHp: combatSystem.getMaxHp(),
          playerAttack: combatSystem.getAttack(),
          playerDefense: combatSystem.getDefense(),
          completedEvents: eventSystem.getCompletedEvents(),
          activeEventId: eventSystem.getActiveEvent()?.id ?? null,
        }
      },
      (data) => {
        timeWeather.setState(data.day, data.season, data.year, data.timeOfDay, data.weather)
        farmSystem.setSeason(data.season)
        farmSystem.setWeather(data.weather)
        farmSystem.loadState(data.farmPlots)
        inventory.loadState(data.inventory, data.equippedTools)
        energySystem.setState(data.energy, data.maxEnergy)
        const relations = data.npcRelations ?? {}
        npcSystem.loadRelationsState(relations)
        fermentSystem.loadState(data.fermentations ?? [])
        fermentSystem.setTime(data.day, data.season, data.year)
        buildingSystem.loadState(data.buildings ?? [])
        buildingSystem.setDay(data.day)
        animalSystem.loadState(data.animals ?? [])
        combatSystem.setStats(
          data.playerHp ?? 50,
          data.playerMaxHp ?? 50,
          data.playerAttack ?? 5,
          data.playerDefense ?? 2,
        )
        eventSystem.setState(data.completedEvents ?? [], data.activeEventId ?? null)
        const store = useGameStore.getState()
        store.setGold(data.gold)
        store.setTime(data.day, data.season, data.year, data.timeOfDay)
        store.setWeather(data.weather)
        for (const [npcId, value] of Object.entries(relations)) {
          store.setNpcRelation(npcId, value)
        }
        syncInventory()
        syncFermentation()
        syncBuildings()
        syncAnimals()
        syncCombatHp()
      },
    )

    if (saveManager.hasSave()) {
      saveManager.load()
    } else {
      syncInventory()
      syncCombatHp()
    }

    this.tileCursor = this.add.graphics()
    this.tileCursor.setDepth(9)
    this.plantOverlay = this.add.graphics()
    this.plantOverlay.setDepth(8)

    this.setupCollision(map)
    this.setupCamera(map)

    this.events.once('shutdown', () => {
      saveManager.save()
      saveManager.destroy()
      inventory.destroy()
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
      eventBus.off('event:reward', onEventReward)
      this.systemManager.destroyAll()
      this.keyboardInput.destroy()
      this.touchInput.destroy()
      this.player.destroy()
    })
  }

  update(_time: number, delta: number): void {
    this.systemManager.updateAll(this, _time, delta)

    const pointer = this.input.activePointer
    const isTouchActive = pointer.isDown && pointer.wasTouch
    const rawState = isTouchActive
      ? this.touchInput.getState()
      : this.keyboardInput.getState()

    this.inputManager.updateFromProvider(rawState)
    const inputState = this.inputManager.getState()

    if (useGameStore.getState().dialogOpen) {
      this.player.sprite.setVelocity(0, 0)
      return
    }

    this.player.update(inputState)
    this.emitPosition(this.player.sprite, _time)
    this.updateTileCursor()

    if (this.fishingSystem.isActive()) {
      return
    }

    const actionPressed = inputState.action && !this.prevAction
    this.prevAction = inputState.action

    if (actionPressed) {
      this.handleFarmInteract()
    }

    this.checkPortal()
  }

  private isTransitioning = false

  private checkPortal(): void {
    if (this.isTransitioning) return

    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE)
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE)

    // 상 → Market
    if (tileY <= 0 && tileX >= 14 && tileX <= 15) {
      this.isTransitioning = true
      saveManager.save()
      this.scene.start('MarketScene', { spawnX: 14, spawnY: 28 })
    }

    // 우 → Village
    if (tileX >= 29 && tileY >= 14 && tileY <= 15) {
      this.isTransitioning = true
      saveManager.save()
      this.scene.start('VillageScene', { spawnX: 1, spawnY: 14 })
    }
  }

  private updateTileCursor(): void {
    const equipped = useGameStore.getState().equippedTools.current

    if (!equipped) {
      if (this.cursorColor !== -1) {
        this.tileCursor.clear()
        this.cursorColor = -1
        this.cursorTileX = -1
        this.cursorTileY = -1
      }
      if (this.overlayEquipped !== null) {
        this.plantOverlay.clear()
        this.overlayEquipped = null
      }
      return
    }

    const { tileX, tileY } = this.getFacingTile()

    const crop = this.farmSystem.getCropAt(tileX, tileY)
    const isFarm = isFarmTile(tileX, tileY)

    let color = -1
    let alpha = 0

    if (crop) {
      if (crop.isFullyGrown()) {
        color = 0xfbbf24
        alpha = 0.6
      } else if (equipped === 'tool-wateringCan' && !crop.isWatered()) {
        color = 0x60a5fa
        alpha = 0.6
      } else if (equipped === 'fertilizer' && !crop.isFertilized()) {
        color = 0xa78bfa
        alpha = 0.6
      } else {
        color = 0x9ca3af
        alpha = 0.3
      }
    } else if (equipped?.startsWith('seed-') && isFarm) {
      color = 0x4ade80
      alpha = 0.6
    }

    if (tileX !== this.cursorTileX || tileY !== this.cursorTileY || color !== this.cursorColor || alpha !== this.cursorAlpha) {
      this.tileCursor.clear()
      this.cursorTileX = tileX
      this.cursorTileY = tileY
      this.cursorColor = color
      this.cursorAlpha = alpha

      if (color !== -1) {
        const size = GAME_CONSTANTS.TILE_SIZE
        const px = tileX * size
        const py = tileY * size
        this.tileCursor.lineStyle(2, color, alpha)
        this.tileCursor.strokeRect(px + 1, py + 1, size - 2, size - 2)
        this.tileCursor.fillStyle(color, alpha * 0.25)
        this.tileCursor.fillRect(px + 1, py + 1, size - 2, size - 2)
      }
    }

    const isSeed = equipped?.startsWith('seed-') ?? false
    if (isSeed) {
      this.invalidateOverlayIfNeeded(equipped)
      if (this.overlayDirty) {
        this.plantOverlay.clear()
        this.drawPlantableOverlay()
        this.overlayDirty = false
      }
    } else if (this.overlayEquipped !== null) {
      this.plantOverlay.clear()
      this.overlayEquipped = null
      this.overlayDirty = true
    }
  }

  private invalidateOverlayIfNeeded(equipped: string | null): void {
    const cam = this.cameras.main
    const scrollTileX = Math.floor(cam.scrollX / GAME_CONSTANTS.TILE_SIZE)
    const scrollTileY = Math.floor(cam.scrollY / GAME_CONSTANTS.TILE_SIZE)

    if (
      equipped !== this.overlayEquipped ||
      scrollTileX !== this.overlayScrollX ||
      scrollTileY !== this.overlayScrollY
    ) {
      this.overlayScrollX = scrollTileX
      this.overlayScrollY = scrollTileY
      this.overlayEquipped = equipped
      this.overlayDirty = true
    }
  }

  private drawPlantableOverlay(): void {
    const cam = this.cameras.main
    const size = GAME_CONSTANTS.TILE_SIZE
    const startX = Math.max(0, Math.floor(cam.scrollX / size) - 1)
    const startY = Math.max(0, Math.floor(cam.scrollY / size) - 1)
    const endX = Math.ceil((cam.scrollX + cam.width) / size) + 1
    const endY = Math.ceil((cam.scrollY + cam.height) / size) + 1

    const inner = size - 2

    // Batch fills first, then strokes — reduces style switches from 2*N to 2
    this.plantOverlay.fillStyle(0xffffff, 0.15)
    for (const zone of FARM_ZONES) {
      const zx1 = Math.max(zone.x1, startX)
      const zy1 = Math.max(zone.y1, startY)
      const zx2 = Math.min(zone.x2, endX)
      const zy2 = Math.min(zone.y2, endY)

      for (let ty = zy1; ty <= zy2; ty++) {
        for (let tx = zx1; tx <= zx2; tx++) {
          if (this.farmSystem.getCropAt(tx, ty) !== undefined) continue
          this.plantOverlay.fillRect(tx * size + 1, ty * size + 1, inner, inner)
        }
      }
    }

    this.plantOverlay.lineStyle(1.5, 0x4ade80, 0.5)
    for (const zone of FARM_ZONES) {
      const zx1 = Math.max(zone.x1, startX)
      const zy1 = Math.max(zone.y1, startY)
      const zx2 = Math.min(zone.x2, endX)
      const zy2 = Math.min(zone.y2, endY)

      for (let ty = zy1; ty <= zy2; ty++) {
        for (let tx = zx1; tx <= zx2; tx++) {
          if (this.farmSystem.getCropAt(tx, ty) !== undefined) continue
          this.plantOverlay.strokeRect(tx * size + 1, ty * size + 1, inner, inner)
        }
      }
    }
  }

  private getFacingTile(): { tileX: number; tileY: number } {
    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE)
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE)
    const dir = this.player.getDirection()
    const offsets = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }
    const off = offsets[dir]
    return { tileX: tileX + off.x, tileY: tileY + off.y }
  }

  private handleFarmInteract(): void {
    const nearbyNpcs = this.npcSystem.getNpcsInRange(
      this.player.sprite.x,
      this.player.sprite.y,
      GAME_CONSTANTS.TILE_SIZE * 2,
    )
    if (nearbyNpcs.length > 0) {
      this.npcSystem.talk(nearbyNpcs[0]!.getDefinition().id)
      return
    }

    const { tileX, tileY } = this.getFacingTile()
    const equipped = useGameStore.getState().equippedTools.current

    const crop = this.farmSystem.getCropAt(tileX, tileY)

    if (crop && crop.isFullyGrown()) {
      if (this.farmSystem.harvest(tileX, tileY)) {
        this.overlayDirty = true
        this.syncInventoryFn?.()
        return
      }
    }

    if (equipped === 'tool-wateringCan' && crop && !crop.isWatered()) {
      if (this.farmSystem.waterTile(tileX, tileY)) {
        this.syncInventoryFn?.()
        return
      }
    }

    if (equipped?.startsWith('seed-')) {
      if (this.farmSystem.plant(tileX, tileY, equipped)) {
        this.overlayDirty = true
        this.syncInventoryFn?.()
        return
      }
    }

    if (equipped === 'fertilizer') {
      if (this.farmSystem.fertilizeTile(tileX, tileY)) {
        this.syncInventoryFn?.()
        return
      }
    }

    if (equipped === 'tool-fishingRod' && this.isNearWater()) {
      if (!this.inventorySystem.isFull() && this.energySystem.consume('FISH')) {
        this.fishingSystem.startFishing()
      }
    }
  }

  private isNearWater(): boolean {
    if (!this.groundLayer) return false
    const tileX = Math.floor(this.player.sprite.x / GAME_CONSTANTS.TILE_SIZE)
    const tileY = Math.floor(this.player.sprite.y / GAME_CONSTANTS.TILE_SIZE)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tile = this.groundLayer.getTileAt(tileX + dx, tileY + dy)
        if (tile && tile.index === 3) return true
      }
    }
    return false
  }

  private renderBuildings(buildingSystem: BuildingSystem): void {
    const buildings = buildingSystem.getState()
    const activeIds = new Set(buildings.map((b) => b.buildingId))

    for (const [id, sprite] of this.buildingSprites) {
      if (!activeIds.has(id)) {
        sprite.destroy()
        this.buildingSprites.delete(id)
      }
    }

    for (const building of buildings) {
      const layout = BUILDING_LAYOUT[building.buildingId]
      if (!layout) continue

      const textureKey = `building-${building.buildingId}`
      if (!this.textures.exists(textureKey)) continue

      const tileSize = GAME_CONSTANTS.TILE_SIZE
      const tilesSpan = layout.pixelSize / tileSize
      const cx = (layout.tileX + tilesSpan / 2) * tileSize
      const cy = (layout.tileY + tilesSpan / 2) * tileSize

      let sprite = this.buildingSprites.get(building.buildingId)
      if (!sprite) {
        sprite = this.add.image(cx, cy, textureKey)
        sprite.setDepth(5)
        this.buildingSprites.set(building.buildingId, sprite)
      }

      const isConstructing = building.buildStartDay !== null
      sprite.setAlpha(isConstructing ? 0.5 : 1)
    }
  }

  private createTilesetTexture(): void {
    // Use real tileset image if loaded, otherwise fall back to programmatic colors
    if (this.textures.exists('tileset-farm')) return

    const size = GAME_CONSTANTS.TILE_SIZE
    const colors = [0x228b22, 0x8b6914, 0x4169e1, 0x9e9e9e]

    const canvas = this.textures.createCanvas('tileset-farm', size * 4, size * 4)
    if (!canvas) return

    const ctx = canvas.context
    for (let i = 0; i < 16; i++) {
      const x = (i % 4) * size
      const y = Math.floor(i / 4) * size
      const hex = colors[i % colors.length]!
      ctx.fillStyle = `#${hex.toString(16).padStart(6, '0')}`
      ctx.fillRect(x, y, size, size)
    }
    canvas.refresh()
  }

  private loadTilemap(): Phaser.Tilemaps.Tilemap {
    const map = this.make.tilemap({ key: 'farm-map' })
    const tileset = map.addTilesetImage('farm-tiles', 'tileset-farm')
    if (!tileset) throw new Error('Failed to load farm tileset')

    this.groundLayer = map.createLayer('ground', tileset)
    this.groundLayer?.setDepth(0)
    const groundLayer = this.groundLayer

    const pathLayer = map.createLayer('path', tileset)
    pathLayer?.setDepth(1)

    const objectsLayer = map.createLayer('objects', tileset)
    objectsLayer?.setDepth(2)

    const colLayer = map.createLayer('collision', tileset)
    colLayer?.setVisible(false)
    this.collisionLayer = colLayer ?? null

    return map
  }

  private setupCollision(_map: Phaser.Tilemaps.Tilemap): void {
    if (!this.collisionLayer) return

    this.collisionLayer.setCollisionByExclusion([-1, 0])
    this.physics.add.collider(this.player.sprite, this.collisionLayer)
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap): void {
    const mapWidth = map.widthInPixels
    const mapHeight = map.heightInPixels

    this.cameras.main.setRoundPixels(true)
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1)
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight)
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight)
  }

}
