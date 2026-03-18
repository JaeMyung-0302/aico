import type Phaser from 'phaser'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import { eventBus } from '@/lib/event-bus'
import type { IGameSystem } from './system-manager'

type EnergyActivity = keyof typeof GAME_CONSTANTS.ENERGY_COST

const SLEEP_RECOVERY_RATE = 0.7
const FAINT_RECOVERY_RATE = 0.5
const FAINT_GOLD_PENALTY_RATE = 0.1

export class EnergySystem implements IGameSystem {
  readonly id = 'energy'

  private current: number = GAME_CONSTANTS.MAX_ENERGY_BASE
  private max: number = GAME_CONSTANTS.MAX_ENERGY_BASE

  init(_scene: Phaser.Scene): void {
    eventBus.on('time:dayEnd', this.onDayEnd)
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number): void {
    // Energy system doesn't need per-frame updates
  }

  destroy(): void {
    eventBus.off('time:dayEnd', this.onDayEnd)
  }

  consume(activity: EnergyActivity): boolean {
    const cost = GAME_CONSTANTS.ENERGY_COST[activity]
    if (this.current < cost) return false

    this.current -= cost

    if (this.current <= 0) {
      this.faint()
    } else {
      this.emitChanged()
    }

    return true
  }

  recover(amount: number): void {
    if (amount <= 0) return
    this.current = Math.min(this.current + amount, this.max)
    this.emitChanged()
  }

  getCurrent(): number {
    return this.current
  }

  getMax(): number {
    return this.max
  }

  setState(current: number, max: number): void {
    this.current = current
    this.max = max
    this.emitChanged()
  }

  private faint(): void {
    this.current = Math.floor(this.max * FAINT_RECOVERY_RATE)
    this.emitChanged()
    eventBus.emit('energy:depleted', undefined)
    eventBus.emit('energy:fainted', { goldPenaltyRate: FAINT_GOLD_PENALTY_RATE })
  }

  private readonly onDayEnd = (): void => {
    this.current = Math.floor(this.max * SLEEP_RECOVERY_RATE)
    this.emitChanged()
  }

  private emitChanged(): void {
    eventBus.emit('energy:changed', { current: this.current, max: this.max })
  }
}
