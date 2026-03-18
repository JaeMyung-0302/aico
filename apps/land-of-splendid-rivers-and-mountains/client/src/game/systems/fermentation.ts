import type Phaser from 'phaser'
import type { RecipeDefinition, FermentationState, Season } from '@land-of-splendid-rivers-and-mountains/shared'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import { eventBus } from '@/lib/event-bus'
import type { IGameSystem } from './system-manager'
import recipesData from '../data/recipes.json'

const MAX_FERMENTATION_SLOTS = 3
const DAYS_PER_SEASON = GAME_CONSTANTS.DAYS_PER_SEASON
const SEASONS = GAME_CONSTANTS.SEASONS

const recipeMap = new Map<string, RecipeDefinition>(
  (recipesData as ReadonlyArray<RecipeDefinition>).map((r) => [r.id, r]),
)

interface ActiveSlot {
  recipeId: string
  startDay: number
  startSeason: Season
  startYear: number
}

export class FermentationSystem implements IGameSystem {
  readonly id = 'fermentation'

  private readonly slots: (ActiveSlot | null)[] = Array.from({ length: MAX_FERMENTATION_SLOTS }, () => null)
  private currentDay = 1
  private currentSeason: Season = 'spring'
  private currentYear = 1

  init(_scene: Phaser.Scene): void {
    eventBus.on('time:dayEnd', this.onDayEnd)
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number): void {
    // No per-frame logic needed
  }

  destroy(): void {
    eventBus.off('time:dayEnd', this.onDayEnd)
  }

  setTime(day: number, season: Season, year: number): void {
    this.currentDay = day
    this.currentSeason = season
    this.currentYear = year
  }

  startFermentation(recipeId: string): number | null {
    const recipe = recipeMap.get(recipeId)
    if (!recipe || recipe.type !== 'fermentation') return null

    const slotIndex = this.slots.findIndex((s) => s === null)
    if (slotIndex === -1) return null

    this.slots[slotIndex] = {
      recipeId,
      startDay: this.currentDay,
      startSeason: this.currentSeason,
      startYear: this.currentYear,
    }

    return slotIndex
  }

  collectSlot(slotIndex: number): string | null {
    const slot = this.slots[slotIndex]
    if (!slot) return null

    const recipe = recipeMap.get(slot.recipeId)
    if (!recipe || !recipe.fermentationDays) return null

    const elapsed = this.getElapsedDays(slot)
    if (elapsed < recipe.fermentationDays) return null

    this.slots[slotIndex] = null
    return recipe.resultItemId
  }

  getSlotInfo(slotIndex: number): { recipeId: string; elapsed: number; required: number } | null {
    const slot = this.slots[slotIndex]
    if (!slot) return null

    const recipe = recipeMap.get(slot.recipeId)
    if (!recipe || !recipe.fermentationDays) return null

    return {
      recipeId: slot.recipeId,
      elapsed: this.getElapsedDays(slot),
      required: recipe.fermentationDays,
    }
  }

  getSlotCount(): number {
    return MAX_FERMENTATION_SLOTS
  }

  isSlotEmpty(slotIndex: number): boolean {
    return this.slots[slotIndex] === null
  }

  getState(): ReadonlyArray<FermentationState> {
    const result: FermentationState[] = []
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]
      if (slot) {
        result.push({
          slotIndex: i,
          recipeId: slot.recipeId,
          startDay: slot.startDay,
          startSeason: slot.startSeason,
          startYear: slot.startYear,
        })
      }
    }
    return result
  }

  loadState(states: ReadonlyArray<FermentationState>): void {
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i] = null
    }
    for (const state of states) {
      if (state.slotIndex >= 0 && state.slotIndex < MAX_FERMENTATION_SLOTS) {
        this.slots[state.slotIndex] = {
          recipeId: state.recipeId,
          startDay: state.startDay,
          startSeason: state.startSeason,
          startYear: state.startYear,
        }
      }
    }
  }

  private getElapsedDays(slot: ActiveSlot): number {
    const startAbsolute = this.toAbsoluteDay(slot.startDay, slot.startSeason, slot.startYear)
    const currentAbsolute = this.toAbsoluteDay(this.currentDay, this.currentSeason, this.currentYear)
    return currentAbsolute - startAbsolute
  }

  private toAbsoluteDay(day: number, season: Season, year: number): number {
    const seasonIndex = SEASONS.indexOf(season)
    return (year - 1) * SEASONS.length * DAYS_PER_SEASON + seasonIndex * DAYS_PER_SEASON + day
  }

  private readonly onDayEnd = ({ day, season, year }: { day: number; season: Season; year: number }): void => {
    this.currentDay = day
    this.currentSeason = season
    this.currentYear = year
  }
}

export function getCookingRecipes(): ReadonlyArray<RecipeDefinition> {
  return (recipesData as ReadonlyArray<RecipeDefinition>).filter((r) => r.type === 'cooking')
}

export function getFermentationRecipes(): ReadonlyArray<RecipeDefinition> {
  return (recipesData as ReadonlyArray<RecipeDefinition>).filter((r) => r.type === 'fermentation')
}

export function getRecipe(recipeId: string): RecipeDefinition | undefined {
  return recipeMap.get(recipeId)
}
