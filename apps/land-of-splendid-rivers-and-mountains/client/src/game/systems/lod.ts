import type Phaser from 'phaser'
import type { IGameSystem } from './system-manager'
import { eventBus } from '@/lib/event-bus'

type QualityLevel = 'high' | 'medium' | 'low'

const FPS_SAMPLE_INTERVAL = 2000
const HIGH_THRESHOLD = 50
const LOW_THRESHOLD = 28
const RECOVERY_THRESHOLD = 55

export class LodSystem implements IGameSystem {
  readonly id = 'lod'

  private level: QualityLevel = 'high'
  private sampleTimer = 0
  private frameCount = 0
  private lastTime = 0

  init(_scene: Phaser.Scene): void {
    this.level = 'high'
    this.sampleTimer = 0
    this.frameCount = 0
    this.lastTime = 0
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

    const prev = this.level
    this.level = this.computeLevel(avgFps)

    if (this.level !== prev) {
      eventBus.emit('quality:changed', { level: this.level })
    }
  }

  destroy(): void {
    this.level = 'high'
  }

  getLevel(): QualityLevel {
    return this.level
  }

  private computeLevel(fps: number): QualityLevel {
    if (this.level === 'high' && fps < LOW_THRESHOLD) return 'low'
    if (this.level === 'high' && fps < HIGH_THRESHOLD) return 'medium'
    if (this.level === 'medium' && fps < LOW_THRESHOLD) return 'low'
    if (this.level === 'medium' && fps >= RECOVERY_THRESHOLD) return 'high'
    if (this.level === 'low' && fps >= RECOVERY_THRESHOLD) return 'medium'
    return this.level
  }
}
