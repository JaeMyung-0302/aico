import Phaser from 'phaser'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import type { CropDefinition } from '@land-of-splendid-rivers-and-mountains/shared'

const GROWTH_STAGES = 3

export class Crop {
  readonly sprite: Phaser.GameObjects.Sprite
  private readonly definition: CropDefinition
  private growthDay = 0
  private watered = false
  private fertilized = false
  private destroyed = false

  constructor(scene: Phaser.Scene, tileX: number, tileY: number, definition: CropDefinition) {
    this.definition = definition

    const size = GAME_CONSTANTS.TILE_SIZE
    const x = tileX * size + size / 2
    const y = tileY * size + size / 2

    const textureKey = `crop-${definition.id}`
    const key = scene.textures.exists(textureKey) ? textureKey : 'crop-sprout'
    this.sprite = scene.add.sprite(x, y, key, 0)
    this.sprite.setDepth(5)
    this.updateVisual()
  }

  water(): void {
    if (this.destroyed) return
    this.watered = true
  }

  fertilize(): void {
    if (this.destroyed) return
    this.fertilized = true
  }

  advanceDay(): void {
    if (this.destroyed) return
    if (!this.watered) return

    const growthRate = this.fertilized ? 2 : 1
    this.growthDay += growthRate
    this.watered = false
    this.fertilized = false
    this.updateVisual()
  }

  isFullyGrown(): boolean {
    return this.growthDay >= this.definition.growthDays
  }

  isWatered(): boolean {
    return this.watered
  }

  isFertilized(): boolean {
    return this.fertilized
  }

  setGrowthDay(day: number): void {
    this.growthDay = day
    this.updateVisual()
  }

  getDefinition(): CropDefinition {
    return this.definition
  }

  getGrowthDay(): number {
    return this.growthDay
  }

  getGrowthStage(): number {
    if (this.growthDay === 0) return 0
    const progress = this.growthDay / this.definition.growthDays
    return Math.min(Math.floor(progress * GROWTH_STAGES), GROWTH_STAGES - 1)
  }

  isDestroyed(): boolean {
    return this.destroyed
  }

  destroy(): void {
    this.destroyed = true
    this.sprite.destroy()
  }

  private updateVisual(): void {
    const stage = this.getGrowthStage()
    this.sprite.setFrame(stage)

    if (this.watered) {
      this.sprite.setAlpha(0.8)
    } else {
      this.sprite.setAlpha(1)
    }
  }
}
