import type Phaser from 'phaser'

export interface IGameSystem {
  readonly id: string
  init(scene: Phaser.Scene): void
  update(scene: Phaser.Scene, time: number, delta: number): void
  destroy(): void
}

export class SystemManager {
  private readonly systems: Map<string, IGameSystem> = new Map()
  private readonly order: ReadonlyArray<string>

  constructor(order: ReadonlyArray<string> = []) {
    this.order = order
  }

  register(system: IGameSystem): void {
    this.systems.set(system.id, system)
  }

  initAll(scene: Phaser.Scene): void {
    for (const id of this.getExecutionOrder()) {
      const system = this.systems.get(id)
      if (system) {
        system.init(scene)
      }
    }
  }

  updateAll(scene: Phaser.Scene, time: number, delta: number): void {
    for (const id of this.getExecutionOrder()) {
      const system = this.systems.get(id)
      if (system) {
        system.update(scene, time, delta)
      }
    }
  }

  destroyAll(): void {
    for (const [, system] of this.systems) {
      system.destroy()
    }
    this.systems.clear()
  }

  getSystem<T extends IGameSystem>(id: string): T | undefined {
    return this.systems.get(id) as T | undefined
  }

  private getExecutionOrder(): ReadonlyArray<string> {
    if (this.order.length > 0) {
      return this.order
    }
    return [...this.systems.keys()]
  }
}
