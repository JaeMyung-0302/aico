import type Phaser from 'phaser'
import type { IGameSystem } from './system-manager'
import { eventBus } from '@/lib/event-bus'

type QualityLevel = 'high' | 'medium' | 'low'

const FPS_SAMPLE_INTERVAL = 2000
const DROP_TO_MEDIUM = 45
const DROP_TO_LOW = 25
const RECOVER_TO_MEDIUM = 35
const RECOVER_TO_HIGH = 55
const STABLE_SAMPLES_REQUIRED = 2

export class LodSystem implements IGameSystem {
  readonly id = 'lod'

  private level: QualityLevel = 'high'
  private sampleTimer = 0
  private frameCount = 0
  private lastTime = 0
  private pendingLevel: QualityLevel | null = null
  private stableCount = 0

  init(_scene: Phaser.Scene): void {
    this.level = 'high'
    this.sampleTimer = 0
    this.frameCount = 0
    this.lastTime = 0
    this.pendingLevel = null
    this.stableCount = 0
  }

  update(_scene: Phaser.Scene, time: number, _delta: number): void {
    this.frameCount++

    if (this.lastTime === 0) {
      this.lastTime = time
      return
    }

    this.sampleTimer += time - this.lastTime
    this.lastTime = time

    if (this.sampleTimer < FPS_SAMPLE_INTERVAL) return

    const avgFps = (this.frameCount / this.sampleTimer) * 1000
    this.frameCount = 0
    this.sampleTimer = 0

    const candidate = this.computeCandidate(avgFps)

    if (candidate !== this.level) {
      if (candidate === this.pendingLevel) {
        this.stableCount++
        if (this.stableCount >= STABLE_SAMPLES_REQUIRED) {
          this.level = candidate
          this.pendingLevel = null
          this.stableCount = 0
          eventBus.emit('quality:changed', { level: this.level })
        }
      } else {
        this.pendingLevel = candidate
        this.stableCount = 1
      }
    } else {
      this.pendingLevel = null
      this.stableCount = 0
    }
  }

  destroy(): void {
    this.level = 'high'
  }

  getLevel(): QualityLevel {
    return this.level
  }

  private computeCandidate(fps: number): QualityLevel {
    if (this.level === 'high') {
      if (fps < DROP_TO_LOW) return 'low'
      if (fps < DROP_TO_MEDIUM) return 'medium'
      return 'high'
    }
    if (this.level === 'medium') {
      if (fps < DROP_TO_LOW) return 'low'
      if (fps >= RECOVER_TO_HIGH) return 'high'
      return 'medium'
    }
    // low
    if (fps >= RECOVER_TO_MEDIUM) return 'medium'
    return 'low'
  }
}
