import type Phaser from 'phaser'
import type { AnimalState } from '@land-of-splendid-rivers-and-mountains/shared'
import type { AnimalDefinition } from '@land-of-splendid-rivers-and-mountains/shared'
import type { IGameSystem } from './system-manager'
import { eventBus } from '@/lib/event-bus'
import animalsData from '../data/animals.json'

const animalDefs = new Map<string, AnimalDefinition>(
  (animalsData as ReadonlyArray<AnimalDefinition>).map((a) => [a.id, a]),
)

export const getAnimalDef = (id: string): AnimalDefinition | undefined => animalDefs.get(id)
export const getAllAnimalDefs = (): ReadonlyArray<AnimalDefinition> =>
  animalsData as ReadonlyArray<AnimalDefinition>

interface OwnedAnimal {
  readonly id: string
  readonly type: string
  readonly name: string
  readonly happiness: number
  readonly fedToday: boolean
  readonly producedToday: boolean
}

let nextAnimalId = 1

export class AnimalSystem implements IGameSystem {
  readonly id = 'animal'
  private readonly animals: Map<string, OwnedAnimal> = new Map()

  init(_scene: Phaser.Scene): void {
    eventBus.on('time:dayEnd', this.onDayEnd)
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number): void {
    // Animals are event-driven, no per-frame update
  }

  destroy(): void {
    eventBus.off('time:dayEnd', this.onDayEnd)
  }

  private readonly onDayEnd = (): void => {
    for (const [id, animal] of this.animals) {
      const newHappiness = animal.fedToday
        ? Math.min(10, animal.happiness + 1)
        : Math.max(0, animal.happiness - 1)
      this.animals.set(id, {
        ...animal,
        happiness: newHappiness,
        fedToday: false,
        producedToday: false,
      })
    }
  }

  buyAnimal(type: string, name: string): string | null {
    const def = animalDefs.get(type)
    if (!def) return null
    const animalId = `animal-${nextAnimalId++}`
    this.animals.set(animalId, {
      id: animalId,
      type,
      name,
      happiness: 5,
      fedToday: false,
      producedToday: false,
    })
    return animalId
  }

  feedAnimal(animalId: string): boolean {
    const animal = this.animals.get(animalId)
    if (!animal) return false
    if (animal.fedToday) return false
    this.animals.set(animalId, { ...animal, fedToday: true })
    return true
  }

  collectProduce(animalId: string): string | null {
    const animal = this.animals.get(animalId)
    if (!animal) return null
    if (animal.producedToday) return null

    const def = animalDefs.get(animal.type)
    if (!def) return null

    const happinessBonus = animal.happiness / 10
    const chance = def.produceBaseChance * (0.5 + happinessBonus * 0.5)
    if (Math.random() > chance) {
      this.animals.set(animalId, { ...animal, producedToday: true })
      return null
    }

    this.animals.set(animalId, { ...animal, producedToday: true })
    return def.produceItemId
  }

  getAnimalCount(): number {
    return this.animals.size
  }

  getState(): ReadonlyArray<AnimalState> {
    const result: AnimalState[] = []
    for (const [, animal] of this.animals) {
      result.push({
        id: animal.id,
        type: animal.type,
        name: animal.name,
        happiness: animal.happiness,
        fedToday: animal.fedToday,
        producedToday: animal.producedToday,
      })
    }
    return result
  }

  loadState(states: ReadonlyArray<AnimalState>): void {
    this.animals.clear()
    let maxId = 0
    for (const state of states) {
      this.animals.set(state.id, {
        id: state.id,
        type: state.type,
        name: state.name,
        happiness: state.happiness,
        fedToday: state.fedToday,
        producedToday: state.producedToday ?? false,
      })
      const numPart = parseInt(state.id.replace('animal-', ''), 10)
      if (!isNaN(numPart) && numPart >= maxId) {
        maxId = numPart + 1
      }
    }
    nextAnimalId = Math.max(maxId, 1)
  }
}
