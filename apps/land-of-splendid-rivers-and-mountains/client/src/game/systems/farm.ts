import type Phaser from 'phaser'
import type { CropDefinition, Season, Weather, FarmPlotState } from '@land-of-splendid-rivers-and-mountains/shared'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import { eventBus } from '@/lib/event-bus'
import { Crop } from '../entities/Crop'
import type { InventorySystem } from './inventory'
import type { EnergySystem } from './energy'
import type { IGameSystem } from './system-manager'
import cropsData from '../data/crops.json'

const cropMap = new Map<string, CropDefinition>(
  (cropsData as ReadonlyArray<CropDefinition>).map((crop) => [crop.id, crop]),
)

const tileKey = (x: number, y: number): string => `${x},${y}`

export const FARM_ZONES: ReadonlyArray<{ x1: number; y1: number; x2: number; y2: number }> = [
  { x1: 3, y1: 9, x2: 11, y2: 11 },
  { x1: 18, y1: 9, x2: 26, y2: 11 },
  { x1: 3, y1: 19, x2: 11, y2: 24 },
  { x1: 18, y1: 19, x2: 26, y2: 24 },
]

export const isFarmTile = (tx: number, ty: number): boolean =>
  FARM_ZONES.some((z) => tx >= z.x1 && tx <= z.x2 && ty >= z.y1 && ty <= z.y2)

export class FarmSystem implements IGameSystem {
  readonly id = 'farm'

  private scene: Phaser.Scene | null = null
  private readonly crops = new Map<string, Crop>()
  private inventory: InventorySystem | null = null
  private energySystem: EnergySystem | null = null
  private currentSeason: Season = 'spring'
  private currentWeather: Weather = 'clear'

  setInventory(inv: InventorySystem): void {
    this.inventory = inv
  }

  setEnergySystem(energy: EnergySystem): void {
    this.energySystem = energy
  }

  setSeason(season: Season): void {
    this.currentSeason = season
  }

  setWeather(weather: Weather): void {
    this.currentWeather = weather
  }

  init(scene: Phaser.Scene): void {
    this.scene = scene

    eventBus.on('time:dayEnd', this.onDayEnd)
    eventBus.on('time:seasonChange', this.onSeasonChange)
    eventBus.on('weather:changed', this.onWeatherChanged)
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number): void {
    // Farm system doesn't need per-frame updates
  }

  destroy(): void {
    eventBus.off('time:dayEnd', this.onDayEnd)
    eventBus.off('time:seasonChange', this.onSeasonChange)
    eventBus.off('weather:changed', this.onWeatherChanged)

    for (const [, crop] of this.crops) {
      crop.destroy()
    }
    this.crops.clear()
    this.scene = null
  }

  plant(tileX: number, tileY: number, seedItemId: string): boolean {
    if (!this.scene || !this.inventory) return false
    if (!isFarmTile(tileX, tileY)) return false

    const key = tileKey(tileX, tileY)
    if (this.crops.has(key)) return false

    const cropId = seedItemId.replace('seed-', '')
    const definition = cropMap.get(cropId)
    if (!definition) return false

    if (!definition.seasons.includes(this.currentSeason)) return false
    if (!this.inventory.hasItem(seedItemId)) return false
    if (this.energySystem && !this.energySystem.consume('TILL')) return false

    this.inventory.removeItem(seedItemId)

    const crop = new Crop(this.scene, tileX, tileY, definition)
    this.crops.set(key, crop)

    eventBus.emit('farm:planted', { x: tileX, y: tileY, cropId })

    return true
  }

  waterTile(tileX: number, tileY: number): boolean {
    const key = tileKey(tileX, tileY)
    const crop = this.crops.get(key)
    if (!crop || crop.isDestroyed()) return false
    if (this.energySystem && !this.energySystem.consume('WATER')) return false

    crop.water()
    eventBus.emit('farm:watered', { x: tileX, y: tileY })

    return true
  }

  fertilizeTile(tileX: number, tileY: number): boolean {
    if (!this.inventory) return false

    const key = tileKey(tileX, tileY)
    const crop = this.crops.get(key)
    if (!crop || crop.isDestroyed()) return false

    if (!this.inventory.hasItem('fertilizer')) return false
    this.inventory.removeItem('fertilizer')

    crop.fertilize()
    return true
  }

  harvest(tileX: number, tileY: number): boolean {
    if (!this.inventory) return false

    const key = tileKey(tileX, tileY)
    const crop = this.crops.get(key)
    if (!crop || crop.isDestroyed()) return false
    if (!crop.isFullyGrown()) return false
    if (this.energySystem && !this.energySystem.consume('HARVEST')) return false

    const definition = crop.getDefinition()
    const harvestItemId = `crop-${definition.id}`
    const quantity = 1

    if (this.inventory.isFull()) return false

    this.inventory.addItem(harvestItemId, quantity)
    crop.destroy()
    this.crops.delete(key)

    eventBus.emit('farm:harvested', {
      x: tileX,
      y: tileY,
      cropId: definition.id,
      quantity,
    })

    return true
  }

  getCropAt(tileX: number, tileY: number): Crop | undefined {
    return this.crops.get(tileKey(tileX, tileY))
  }

  getCropCount(): number {
    return this.crops.size
  }

  getState(): ReadonlyArray<FarmPlotState> {
    const plots: FarmPlotState[] = []
    for (const [key, crop] of this.crops) {
      const [xStr, yStr] = key.split(',')
      plots.push({
        x: Number(xStr),
        y: Number(yStr),
        cropId: crop.getDefinition().id,
        growthDay: crop.getGrowthDay(),
        watered: crop.isWatered(),
        fertilized: crop.isFertilized(),
      })
    }
    return plots
  }

  loadState(plots: ReadonlyArray<FarmPlotState>): void {
    if (!this.scene) return

    for (const [, crop] of this.crops) {
      crop.destroy()
    }
    this.crops.clear()

    for (const plot of plots) {
      if (!plot.cropId) continue
      const definition = cropMap.get(plot.cropId)
      if (!definition) continue

      const crop = new Crop(this.scene, plot.x, plot.y, definition)
      crop.setGrowthDay(plot.growthDay)
      if (plot.watered) {
        crop.water()
      }
      if (plot.fertilized) {
        crop.fertilize()
      }
      this.crops.set(tileKey(plot.x, plot.y), crop)
    }
  }

  static getCropDefinition(cropId: string): CropDefinition | undefined {
    return cropMap.get(cropId)
  }

  private readonly onDayEnd = (): void => {
    const skipGrowth = this.currentWeather === 'storm' || this.currentWeather === 'snow'
    const autoWater = this.currentWeather === 'rain' || this.currentWeather === 'storm'

    const toRemove: string[] = []
    for (const [key, crop] of this.crops) {
      if (crop.isDestroyed()) {
        toRemove.push(key)
        continue
      }
      if (autoWater) {
        crop.water()
      }
      if (!skipGrowth) {
        crop.advanceDay()
      }
    }
    for (const key of toRemove) {
      this.crops.delete(key)
    }
  }

  private readonly onSeasonChange = ({ season }: { season: Season }): void => {
    this.currentSeason = season
  }

  private readonly onWeatherChanged = ({ weather }: { weather: Weather }): void => {
    this.currentWeather = weather
  }
}
