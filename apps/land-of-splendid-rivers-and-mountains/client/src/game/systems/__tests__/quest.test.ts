import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { GameEvents } from '@land-of-splendid-rivers-and-mountains/shared'
import { QuestSystem } from '../quest'

// eventBus mock - 실제 이벤트 구독/발행을 캡처
type EventCallback<T> = (data: T) => void
type AnyCallback = EventCallback<unknown>

const createMockEventBus = () => {
  const listeners = new Map<string, Set<AnyCallback>>()

  const bus = {
    on: vi.fn(<K extends keyof GameEvents>(event: K, cb: EventCallback<GameEvents[K]>) => {
      const key = event as string
      if (!listeners.has(key)) listeners.set(key, new Set())
      listeners.get(key)!.add(cb as AnyCallback)
    }),
    off: vi.fn(<K extends keyof GameEvents>(event: K, cb: EventCallback<GameEvents[K]>) => {
      listeners.get(event as string)?.delete(cb as AnyCallback)
    }),
    emit: vi.fn(<K extends keyof GameEvents>(event: K, data: GameEvents[K]) => {
      const callbacks = listeners.get(event as string)
      if (callbacks) {
        for (const cb of callbacks) {
          cb(data)
        }
      }
    }),
    removeAllListeners: vi.fn(() => listeners.clear()),
  }

  return bus
}

// story.json prologue quests 데이터 직접 import
import type { QuestDefinition } from '@land-of-splendid-rivers-and-mountains/shared'
import storyQuestsRaw from '../../data/story.json'
const storyQuests = storyQuestsRaw as unknown as QuestDefinition[]

const prologueQuests = storyQuests.filter((q) => q.type === 'prologue')

describe('QuestSystem', () => {
  let questSystem: QuestSystem
  let mockBus: ReturnType<typeof createMockEventBus>

  beforeEach(() => {
    mockBus = createMockEventBus()
    questSystem = new QuestSystem(mockBus, storyQuests)
  })

  afterEach(() => {
    questSystem.destroy()
  })

  describe('startPrologue', () => {
    it('should add prologue-arrival to activeQuests', () => {
      questSystem.startPrologue()

      expect(questSystem.getActiveQuests()).toContain('prologue-arrival')
    })

    it('should emit prologue:started event', () => {
      questSystem.startPrologue()

      expect(mockBus.emit).toHaveBeenCalledWith('prologue:started', undefined)
    })
  })

  describe('event handling - npc:talked', () => {
    it('should progress prologue-arrival talk requirement on npc:talked with village-headman', () => {
      questSystem.startPrologue()

      // npc:talked 이벤트 시뮬레이션
      mockBus.emit('npc:talked', { npcId: 'village-headman' })

      const state = questSystem.getState()
      // prologue-arrival requirements: [talk:village-headman:1, explore:village:1]
      // progress[prologue-arrival][0] (talk) should be 1
      expect(state.progress['prologue-arrival']?.[0]).toBe(1)
    })
  })

  describe('event handling - player:moved', () => {
    it('should progress prologue-arrival explore requirement on player:moved to village', () => {
      questSystem.startPrologue()

      mockBus.emit('player:moved', { scene: 'village', tileX: 0, tileY: 0 })

      const state = questSystem.getState()
      // prologue-arrival requirements: [talk:village-headman:1, explore:village:1]
      // progress[prologue-arrival][1] (explore) should be 1
      expect(state.progress['prologue-arrival']?.[1]).toBe(1)
    })
  })

  describe('quest completion', () => {
    it('should move prologue-arrival to completedQuests when all requirements are met', () => {
      questSystem.startPrologue()

      // talk requirement 충족
      mockBus.emit('npc:talked', { npcId: 'village-headman' })
      // explore requirement 충족
      mockBus.emit('player:moved', { scene: 'village', tileX: 0, tileY: 0 })

      expect(questSystem.getCompletedQuests()).toContain('prologue-arrival')
      expect(questSystem.getActiveQuests()).not.toContain('prologue-arrival')
    })
  })

  describe('prerequisite chain', () => {
    it('should auto-accept prologue-first-till when prologue-arrival completes', () => {
      questSystem.startPrologue()

      // prologue-arrival 완료 조건 충족
      mockBus.emit('npc:talked', { npcId: 'village-headman' })
      mockBus.emit('player:moved', { scene: 'village', tileX: 0, tileY: 0 })

      expect(questSystem.getActiveQuests()).toContain('prologue-first-till')
    })
  })

  describe('farm:planted requirement', () => {
    it('should complete prologue-first-till after 3 farm:planted events', () => {
      questSystem.startPrologue()

      // prologue-arrival 완료
      mockBus.emit('npc:talked', { npcId: 'village-headman' })
      mockBus.emit('player:moved', { scene: 'village', tileX: 0, tileY: 0 })

      // prologue-first-till requirements: [plant:any:3]
      mockBus.emit('farm:planted', { x: 0, y: 0, cropId: 'radish' })
      mockBus.emit('farm:planted', { x: 1, y: 0, cropId: 'radish' })
      mockBus.emit('farm:planted', { x: 2, y: 0, cropId: 'radish' })

      expect(questSystem.getCompletedQuests()).toContain('prologue-first-till')
    })
  })

  describe('prologue completion', () => {
    const completePrologue = () => {
      questSystem.startPrologue()

      // prologue-arrival: talk + explore
      mockBus.emit('npc:talked', { npcId: 'village-headman' })
      mockBus.emit('player:moved', { scene: 'village', tileX: 0, tileY: 0 })

      // prologue-first-till: plant x3
      mockBus.emit('farm:planted', { x: 0, y: 0, cropId: 'radish' })
      mockBus.emit('farm:planted', { x: 1, y: 0, cropId: 'radish' })
      mockBus.emit('farm:planted', { x: 2, y: 0, cropId: 'radish' })

      // prologue-first-seed: plant radish x1 + water x1
      mockBus.emit('farm:planted', { x: 3, y: 0, cropId: 'radish' })
      mockBus.emit('farm:watered', { x: 3, y: 0 })

      // prologue-first-harvest: harvest x1 + sell x1
      mockBus.emit('farm:harvested', { x: 0, y: 0, cropId: 'radish', quantity: 1 })
      mockBus.emit('shop:sell', { itemId: 'radish', quantity: 1 })
    }

    it('should return true from isPrologueCompleted after last prologue quest completes', () => {
      completePrologue()

      expect(questSystem.isPrologueCompleted()).toBe(true)
    })

    it('should emit prologue:completed event when last prologue quest completes', () => {
      completePrologue()

      expect(mockBus.emit).toHaveBeenCalledWith('prologue:completed', undefined)
    })
  })

  describe('state serialization', () => {
    it('should serialize and restore state via getState/loadState', () => {
      questSystem.startPrologue()
      mockBus.emit('npc:talked', { npcId: 'village-headman' })

      const savedState = questSystem.getState()

      // 새 인스턴스에 상태 복원
      const newBus = createMockEventBus()
      const newSystem = new QuestSystem(newBus, storyQuests)
      newSystem.loadState(savedState)

      expect(newSystem.getActiveQuests()).toEqual(savedState.activeQuests)
      expect(newSystem.getCompletedQuests()).toEqual(savedState.completedQuests)
      expect(newSystem.getState().progress).toEqual(savedState.progress)
      expect(newSystem.isPrologueCompleted()).toBe(savedState.prologueCompleted)

      newSystem.destroy()
    })
  })

  describe('destroy', () => {
    it('should unsubscribe from eventBus on destroy', () => {
      questSystem.destroy()

      // off가 호출되었는지 확인 (구독 해제)
      expect(mockBus.off).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should not progress quests that are not active', () => {
      // prologue 시작하지 않은 상태에서 이벤트 발생
      mockBus.emit('npc:talked', { npcId: 'village-headman' })

      const state = questSystem.getState()
      expect(state.activeQuests).toHaveLength(0)
      expect(state.progress).toEqual({})
    })

    it('should not exceed requirement quantity cap', () => {
      questSystem.startPrologue()

      // talk requirement quantity = 1, 2번 호출
      mockBus.emit('npc:talked', { npcId: 'village-headman' })
      mockBus.emit('npc:talked', { npcId: 'village-headman' })

      const state = questSystem.getState()
      // progress should be capped at 1 (requirement quantity)
      expect(state.progress['prologue-arrival']?.[0]).toBe(1)
    })

    it('should ignore events with non-matching targets', () => {
      questSystem.startPrologue()

      // prologue-arrival talk requirement target = 'village-headman'
      // 다른 NPC와 대화하면 progress 안 됨
      mockBus.emit('npc:talked', { npcId: 'some-other-npc' })

      const state = questSystem.getState()
      expect(state.progress['prologue-arrival']?.[0]).toBe(0)
    })

    it('should emit quest:accepted when quest is auto-accepted via prerequisite', () => {
      questSystem.startPrologue()

      // prologue-arrival 완료 -> prologue-first-till 자동 수락
      mockBus.emit('npc:talked', { npcId: 'village-headman' })
      mockBus.emit('player:moved', { scene: 'village', tileX: 0, tileY: 0 })

      expect(mockBus.emit).toHaveBeenCalledWith('quest:accepted', { questId: 'prologue-first-till' })
    })

    it('should emit quest:completed when a quest completes', () => {
      questSystem.startPrologue()

      mockBus.emit('npc:talked', { npcId: 'village-headman' })
      mockBus.emit('player:moved', { scene: 'village', tileX: 0, tileY: 0 })

      expect(mockBus.emit).toHaveBeenCalledWith('quest:completed', { questId: 'prologue-arrival' })
    })
  })
})
