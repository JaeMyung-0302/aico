import type { GameEvents } from '@land-of-splendid-rivers-and-mountains/shared'

type EventCallback<T> = (data: T) => void

class TypedEventBus {
  private readonly listeners = new Map<string, Set<EventCallback<unknown>>>()

  on<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void {
    const key = event as string
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(callback as EventCallback<unknown>)
  }

  off<K extends keyof GameEvents>(event: K, callback: EventCallback<GameEvents[K]>): void {
    const key = event as string
    const callbacks = this.listeners.get(key)
    if (callbacks) {
      callbacks.delete(callback as EventCallback<unknown>)
    }
  }

  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    const key = event as string
    const callbacks = this.listeners.get(key)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data)
        } catch (error) {
          console.error(`[EventBus] Error in "${key}" listener:`, error)
        }
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear()
  }
}

export const eventBus = new TypedEventBus()
