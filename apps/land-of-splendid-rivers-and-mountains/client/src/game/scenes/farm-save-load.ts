import type { InventorySystem } from '../systems/inventory'
import type { EnergySystem } from '../systems/energy'
import type { NPCSystem } from '../systems/npc'
import type { FermentationSystem } from '../systems/fermentation'
import type { BuildingSystem } from '../systems/building'
import type { AnimalSystem } from '../systems/animal'
import type { CombatSystem } from '../systems/combat'
import type { EventSystem } from '../systems/event'
import type { TimeWeatherSystem } from '../systems/time-weather'
import type { FarmSystem } from '../systems/farm'
import { eventBus } from '@/lib/event-bus'
import { useGameStore } from '@/stores/useGameStore'
import { saveManager, SAVE_VERSION } from '@/lib/save-manager'
import {
  syncFermentationState,
  syncBuildingsState,
  syncAnimalsState,
  syncCombatHpState,
} from './farm-event-handlers'

interface SaveLoadDeps {
  inventory: InventorySystem
  energySystem: EnergySystem
  timeWeather: TimeWeatherSystem
  farmSystem: FarmSystem
  npcSystem: NPCSystem
  fermentSystem: FermentationSystem
  buildingSystem: BuildingSystem
  animalSystem: AnimalSystem
  combatSystem: CombatSystem
  eventSystem: EventSystem
  syncInventory: () => void
  renderBuildings: (bs: BuildingSystem) => void
}

export const setupSaveLoad = (deps: SaveLoadDeps): void => {
  const {
    inventory, energySystem, timeWeather, farmSystem,
    npcSystem, fermentSystem, buildingSystem, animalSystem,
    combatSystem, eventSystem, syncInventory, renderBuildings,
  } = deps

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
        activeQuests: store.activeQuests as string[],
        completedQuests: store.completedQuests as string[],
        questProgress: store.questProgress as Record<string, number[]>,
        prologueCompleted: store.prologueCompleted,
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
      store.setQuests(data.activeQuests ?? [], data.completedQuests ?? [], data.questProgress ?? {})
      store.setPrologueCompleted(data.prologueCompleted ?? false)
      store.setGold(data.gold)
      store.setTime(data.day, data.season, data.year, data.timeOfDay)
      store.setWeather(data.weather)
      for (const [npcId, value] of Object.entries(relations)) {
        store.setNpcRelation(npcId, value)
      }
      syncInventory()
      syncFermentationState(fermentSystem)
      syncBuildingsState(buildingSystem, renderBuildings)
      syncAnimalsState(animalSystem)
      syncCombatHpState(combatSystem)
    },
  )

  if (saveManager.hasSave()) {
    saveManager.load()
  } else {
    syncInventory()
    syncCombatHpState(combatSystem)
  }
}
