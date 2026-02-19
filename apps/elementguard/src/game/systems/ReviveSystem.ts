import { eventBus } from '@/lib/event-bus'

// 부활권: W20+ 실패 시 1회 부활 (광고 시청 또는 Gel 20 소비)
const REVIVE_MIN_WAVE = 20
const REVIVE_GEL_COST = 20
const REVIVE_HP_RESTORE = 50

interface ReviveState {
  used: boolean
  eligible: boolean
}

export class ReviveSystem {
  private state: ReviveState = { used: false, eligible: false }

  canRevive(currentWave: number): boolean {
    return currentWave >= REVIVE_MIN_WAVE && !this.state.used
  }

  requestRevive(currentWave: number) {
    if (!this.canRevive(currentWave)) return

    this.state = { ...this.state, eligible: true }
    eventBus.emit('show-revive-modal', {
      wave: currentWave,
      gelCost: REVIVE_GEL_COST,
    })
  }

  executeRevive(method: 'gel' | 'ad', currentGel: number): { hpRestore: number } | null {
    if (!this.state.eligible || this.state.used) return null
    if (method === 'gel' && currentGel < REVIVE_GEL_COST) return null

    this.state = { used: true, eligible: false }

    if (method === 'gel') {
      eventBus.emit('spend-gel', REVIVE_GEL_COST)
    }
    // method === 'ad' → 광고 시청은 별도 SDK 연동 필요 (MVP에서는 gel만 지원)

    return { hpRestore: REVIVE_HP_RESTORE }
  }

  declineRevive() {
    this.state = { ...this.state, eligible: false }
  }

  reset() {
    this.state = { used: false, eligible: false }
  }

  getGelCost(): number {
    return REVIVE_GEL_COST
  }
}
