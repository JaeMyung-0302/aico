import type Phaser from 'phaser'
import type { BuildingState } from '@land-of-splendid-rivers-and-mountains/shared'
import type { BuildingDefinition } from '@land-of-splendid-rivers-and-mountains/shared'
import type { IGameSystem } from './system-manager'
import { eventBus } from '@/lib/event-bus'
import buildingsData from '../data/buildings.json'

const buildingDefs = new Map<string, BuildingDefinition>(
  (buildingsData as ReadonlyArray<BuildingDefinition>).map((b) => [b.id, b]),
)

export const getBuildingDef = (id: string): BuildingDefinition | undefined => buildingDefs.get(id)
export const getAllBuildingDefs = (): ReadonlyArray<BuildingDefinition> =>
  buildingsData as ReadonlyArray<BuildingDefinition>

interface ActiveBuilding {
  buildingId: string
  level: number
  x: number
  y: number
  buildStartDay: number | null
  buildTargetDay: number | null
}

export class BuildingSystem implements IGameSystem {
  readonly id = 'building'
  private readonly buildings: Map<string, ActiveBuilding> = new Map()
  private currentDay = 1

  init(_scene: Phaser.Scene): void {
    eventBus.on('time:dayEnd', this.onDayEnd)
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number): void {
    // Buildings are static, no per-frame update needed
  }

  destroy(): void {
    eventBus.off('time:dayEnd', this.onDayEnd)
  }

  private readonly onDayEnd = ({ day }: { day: number }): void => {
    this.currentDay = day
    for (const [id, building] of this.buildings) {
      if (building.buildStartDay !== null && building.buildTargetDay !== null) {
        if (day >= building.buildTargetDay) {
          this.buildings.set(id, { ...building, buildStartDay: null, buildTargetDay: null })
          eventBus.emit('building:completed', { buildingId: id })
        }
      }
    }
  }

  setDay(day: number): void {
    this.currentDay = day
  }

  build(buildingId: string, x: number, y: number): boolean {
    if (this.buildings.has(buildingId)) return false
    const def = buildingDefs.get(buildingId)
    if (!def) return false
    const levelDef = def.levels[0]
    if (!levelDef) return false

    const buildDays = levelDef.buildDays
    const building: ActiveBuilding = {
      buildingId,
      level: 1,
      x,
      y,
      buildStartDay: buildDays > 0 ? this.currentDay : null,
      buildTargetDay: buildDays > 0 ? this.currentDay + buildDays : null,
    }
    this.buildings.set(buildingId, building)
    return true
  }

  upgrade(buildingId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building) return false
    if (this.isUnderConstruction(buildingId)) return false

    const def = buildingDefs.get(buildingId)
    if (!def) return false

    const nextLevel = def.levels.find((l) => l.level === building.level + 1)
    if (!nextLevel) return false

    this.buildings.set(buildingId, {
      ...building,
      level: nextLevel.level,
      buildStartDay: nextLevel.buildDays > 0 ? this.currentDay : null,
      buildTargetDay: nextLevel.buildDays > 0 ? this.currentDay + nextLevel.buildDays : null,
    })
    return true
  }

  hasBuilding(buildingId: string): boolean {
    return this.buildings.has(buildingId)
  }

  getBuildingLevel(buildingId: string): number {
    return this.buildings.get(buildingId)?.level ?? 0
  }

  isUnderConstruction(buildingId: string): boolean {
    const building = this.buildings.get(buildingId)
    if (!building) return false
    return building.buildStartDay !== null && building.buildTargetDay !== null
  }

  getNextLevelCost(buildingId: string): { goldCost: number; materials: ReadonlyArray<{ itemId: string; quantity: number }>; buildDays: number } | null {
    const def = buildingDefs.get(buildingId)
    if (!def) return null
    const currentLevel = this.getBuildingLevel(buildingId)
    const nextLevel = def.levels.find((l) => l.level === currentLevel + 1)
    if (!nextLevel) return null
    return { goldCost: nextLevel.goldCost, materials: nextLevel.materials, buildDays: nextLevel.buildDays }
  }

  getState(): ReadonlyArray<BuildingState> {
    const result: BuildingState[] = []
    for (const [, building] of this.buildings) {
      result.push({
        buildingId: building.buildingId,
        level: building.level,
        x: building.x,
        y: building.y,
        buildStartDay: building.buildStartDay,
        buildTargetDay: building.buildTargetDay,
      })
    }
    return result
  }

  loadState(states: ReadonlyArray<BuildingState>): void {
    this.buildings.clear()
    for (const state of states) {
      this.buildings.set(state.buildingId, {
        buildingId: state.buildingId,
        level: state.level,
        x: state.x,
        y: state.y,
        buildStartDay: state.buildStartDay ?? null,
        buildTargetDay: state.buildTargetDay ?? null,
      })
    }
  }
}
