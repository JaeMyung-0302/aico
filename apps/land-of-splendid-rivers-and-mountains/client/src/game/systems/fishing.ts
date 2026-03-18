import type Phaser from 'phaser'
import type { FishDefinition, Season } from '@land-of-splendid-rivers-and-mountains/shared'
import { eventBus } from '@/lib/event-bus'
import { useGameStore } from '@/stores/useGameStore'
import type { IGameSystem } from './system-manager'
import fishData from '../data/fishing.json'

type FishingPhase = 'idle' | 'casting' | 'waiting' | 'reeling'

const CAST_DURATION_MS = 600
const BITE_MIN_MS = 2000
const BITE_MAX_MS = 5000
const REEL_DURATION_MS = 3000

const allFish = fishData as ReadonlyArray<FishDefinition>

const getSeasonalFish = (season: Season): ReadonlyArray<FishDefinition> =>
  allFish.filter((f) => f.seasons.includes(season))

const pickRandomFish = (candidates: ReadonlyArray<FishDefinition>): FishDefinition | null => {
  if (candidates.length === 0) return null

  const weights = candidates.map((f) => {
    switch (f.rarity) {
      case 'common': return 40
      case 'uncommon': return 25
      case 'rare': return 10
      case 'legendary': return 2
    }
  })

  const totalWeight = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * totalWeight
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]!
    if (roll <= 0) return candidates[i]!
  }
  return candidates[candidates.length - 1]!
}

export class FishingSystem implements IGameSystem {
  readonly id = 'fishing'

  private phase: FishingPhase = 'idle'
  private timer = 0
  private targetTime = 0
  private currentFish: FishDefinition | null = null
  private reelingProgress = 0
  private reelingTarget = 0

  init(_scene: Phaser.Scene): void {
    eventBus.on('fishing:reeling', this.onReelingResult)
  }

  update(_scene: Phaser.Scene, _time: number, delta: number): void {
    if (this.phase === 'idle') return

    this.timer += delta

    if (this.phase === 'casting' && this.timer >= this.targetTime) {
      this.enterWaiting()
    }

    if (this.phase === 'waiting' && this.timer >= this.targetTime) {
      this.enterReeling()
    }
  }

  destroy(): void {
    eventBus.off('fishing:reeling', this.onReelingResult)
    this.reset()
  }

  startFishing(): boolean {
    if (this.phase !== 'idle') return false

    const season = useGameStore.getState().season
    const candidates = getSeasonalFish(season)
    if (candidates.length === 0) return false

    this.currentFish = pickRandomFish(candidates)
    if (!this.currentFish) return false

    this.phase = 'casting'
    this.timer = 0
    this.targetTime = CAST_DURATION_MS

    useGameStore.getState().setFishingState('casting')
    eventBus.emit('fishing:started', undefined)
    return true
  }

  cancelFishing(): void {
    if (this.phase === 'idle') return
    this.reset()
    eventBus.emit('fishing:cancelled', undefined)
  }

  isActive(): boolean {
    return this.phase !== 'idle'
  }

  getPhase(): FishingPhase {
    return this.phase
  }

  applyReel(progress: number): void {
    if (this.phase !== 'reeling') return
    this.reelingProgress = progress
  }

  completeReel(success: boolean): void {
    if (this.phase !== 'reeling' || !this.currentFish) return

    if (success) {
      const fishItemId = `fish-${this.currentFish.id}`
      eventBus.emit('fishing:caught', { fishId: fishItemId })
    } else {
      eventBus.emit('fishing:escaped', undefined)
    }

    this.reset()
  }

  private enterWaiting(): void {
    this.phase = 'waiting'
    this.timer = 0
    this.targetTime = BITE_MIN_MS + Math.random() * (BITE_MAX_MS - BITE_MIN_MS)
    useGameStore.getState().setFishingState('waiting')
  }

  private enterReeling(): void {
    if (!this.currentFish) {
      this.reset()
      return
    }

    this.phase = 'reeling'
    this.timer = 0
    this.targetTime = REEL_DURATION_MS
    this.reelingProgress = 0
    this.reelingTarget = this.currentFish.difficulty

    useGameStore.getState().setFishingState('reeling', this.currentFish.difficulty)
    eventBus.emit('fishing:bite', undefined)
  }

  private reset(): void {
    this.phase = 'idle'
    this.timer = 0
    this.targetTime = 0
    this.currentFish = null
    this.reelingProgress = 0
    this.reelingTarget = 0
    useGameStore.getState().setFishingState('idle')
  }

  private readonly onReelingResult = ({ difficulty }: { difficulty: number }): void => {
    if (this.phase !== 'reeling') return
    const success = difficulty >= 0
    this.completeReel(success)
  }
}
