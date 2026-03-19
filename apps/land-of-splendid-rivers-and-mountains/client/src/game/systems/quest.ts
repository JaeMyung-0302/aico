import type { GameEvents, QuestDefinition } from '@land-of-splendid-rivers-and-mountains/shared'

type EventCallback<T> = (data: T) => void

interface EventBus {
  on<K extends keyof GameEvents>(event: K, cb: EventCallback<GameEvents[K]>): void
  off<K extends keyof GameEvents>(event: K, cb: EventCallback<GameEvents[K]>): void
  emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void
}

export interface QuestState {
  readonly activeQuests: string[]
  readonly completedQuests: string[]
  readonly progress: Record<string, number[]>
  readonly prologueCompleted: boolean
}

export class QuestSystem {
  private activeQuests: string[] = []
  private completedQuests: string[] = []
  private progress: Record<string, number[]> = {}
  private prologueCompleted = false

  private readonly handlers: Array<{ event: keyof GameEvents; cb: EventCallback<never> }> = []

  constructor(
    private readonly eventBus: EventBus,
    private readonly questDefinitions: QuestDefinition[]
  ) {
    this.subscribe('npc:talked', (data) => this.handleRequirement('talk', data.npcId))
    this.subscribe('farm:planted', (data) => this.handleRequirement('plant', data.cropId))
    this.subscribe('farm:watered', () => this.handleRequirement('water', 'any'))
    this.subscribe('farm:harvested', (data) => this.handleRequirement('harvest', data.cropId))
    this.subscribe('shop:sell', (data) => this.handleRequirement('sell', data.itemId))
    this.subscribe('player:moved', (data) => this.handleRequirement('explore', data.scene))
  }

  startPrologue(): void {
    const first = this.questDefinitions.find(
      (q) => q.type === 'prologue' && q.prerequisite === null
    )
    if (first) {
      this.acceptQuest(first.id)
      this.eventBus.emit('prologue:started', undefined)
    }
  }

  isPrologueCompleted(): boolean {
    return this.prologueCompleted
  }

  getActiveQuests(): string[] {
    return [...this.activeQuests]
  }

  getCompletedQuests(): string[] {
    return [...this.completedQuests]
  }

  getState(): QuestState {
    return {
      activeQuests: [...this.activeQuests],
      completedQuests: [...this.completedQuests],
      progress: JSON.parse(JSON.stringify(this.progress)) as Record<string, number[]>,
      prologueCompleted: this.prologueCompleted,
    }
  }

  loadState(state: QuestState): void {
    this.activeQuests = [...state.activeQuests]
    this.completedQuests = [...state.completedQuests]
    this.progress = JSON.parse(JSON.stringify(state.progress)) as Record<string, number[]>
    this.prologueCompleted = state.prologueCompleted
  }

  destroy(): void {
    for (const { event, cb } of this.handlers) {
      this.eventBus.off(event, cb as EventCallback<GameEvents[typeof event]>)
    }
    this.handlers.length = 0
  }

  private subscribe<K extends keyof GameEvents>(event: K, cb: EventCallback<GameEvents[K]>): void {
    this.eventBus.on(event, cb)
    this.handlers.push({ event, cb: cb as EventCallback<never> })
  }

  private acceptQuest(questId: string): void {
    if (this.activeQuests.includes(questId) || this.completedQuests.includes(questId)) return

    const def = this.questDefinitions.find((q) => q.id === questId)
    if (!def) return

    this.activeQuests.push(questId)
    this.progress[questId] = def.requirements.map(() => 0)
    this.eventBus.emit('quest:accepted', { questId })
  }

  private handleRequirement(type: string, target: string): void {
    for (const questId of [...this.activeQuests]) {
      const def = this.questDefinitions.find((q) => q.id === questId)
      if (!def) continue

      if (!this.progress[questId]) this.progress[questId] = def.requirements.map(() => 0)
      for (let i = 0; i < def.requirements.length; i++) {
        const req = def.requirements[i]
        if (!req || req.type !== type) continue
        if (req.target !== 'any' && req.target !== target) continue

        const arr = this.progress[questId]!
        if ((arr[i] ?? 0) < req.quantity) {
          arr[i] = (arr[i] ?? 0) + 1
        }
      }

      this.checkCompletion(questId, def)
    }
  }

  private checkCompletion(questId: string, def: QuestDefinition): void {
    const isComplete = def.requirements.every(
      (req, i) => (this.progress[questId]?.[i] ?? 0) >= req.quantity
    )
    if (!isComplete) return

    this.activeQuests = this.activeQuests.filter((id) => id !== questId)
    this.completedQuests.push(questId)

    this.eventBus.emit('quest:completed', { questId })
    this.eventBus.emit('quest:reward', {
      questId,
      goldReward: def.goldReward,
      items: [...def.rewards],
    })

    if (questId === 'prologue-first-harvest') {
      this.prologueCompleted = true
      this.eventBus.emit('prologue:completed', undefined)
    }

    // Auto-accept next quests whose prerequisite is this quest
    for (const next of this.questDefinitions) {
      if (next.prerequisite === questId) {
        this.acceptQuest(next.id)
      }
    }
  }
}
