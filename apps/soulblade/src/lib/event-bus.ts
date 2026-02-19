import type { GameEvents } from '@soulblade/shared'

type EventCallback<T> = (data: T) => void

// Phaser <-> React 이벤트 버스 (싱글턴)
class EventBus {
  private readonly listeners = new Map<string, Set<EventCallback<unknown>>>()

  on = <K extends keyof GameEvents>(
    event: K,
    callback: EventCallback<GameEvents[K]>,
  ): void => {
    const set = this.listeners.get(event as string) ?? new Set()
    set.add(callback as EventCallback<unknown>)
    this.listeners.set(event as string, set)
  }

  off = <K extends keyof GameEvents>(
    event: K,
    callback: EventCallback<GameEvents[K]>,
  ): void => {
    const set = this.listeners.get(event as string)
    if (set) {
      set.delete(callback as EventCallback<unknown>)
    }
  }

  emit = <K extends keyof GameEvents>(
    event: K,
    ...args: GameEvents[K] extends undefined ? [] : [GameEvents[K]]
  ): void => {
    const set = this.listeners.get(event as string)
    if (set) {
      const data = args[0] as GameEvents[K]
      for (const callback of set) {
        callback(data)
      }
    }
  }

  removeAll = (): void => {
    this.listeners.clear()
  }
}

export const eventBus = new EventBus()
