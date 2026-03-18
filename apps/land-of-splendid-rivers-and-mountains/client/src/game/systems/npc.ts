import type Phaser from 'phaser'
import type { NpcDefinition } from '@land-of-splendid-rivers-and-mountains/shared'
import { GAME_CONSTANTS } from '@land-of-splendid-rivers-and-mountains/shared'
import { eventBus } from '@/lib/event-bus'
import { NPC } from '../entities/NPC'
import type { IGameSystem } from './system-manager'
import npcsData from '../data/npcs.json'

type GiftReaction = 'loved' | 'liked' | 'neutral' | 'disliked'

const GIFT_RELATION_CHANGE: Readonly<Record<GiftReaction, number>> = {
  loved: 3,
  liked: 1,
  neutral: 0,
  disliked: -2,
}

const TALK_RELATION_BONUS = 1

const npcDefs = npcsData as ReadonlyArray<NpcDefinition>

export class NPCSystem implements IGameSystem {
  readonly id = 'npc'

  private readonly npcs = new Map<string, NPC>()
  private readonly relations = new Map<string, number>()
  private readonly talkedToday = new Set<string>()
  private currentLocation = 'farm'

  setInitialLocation(location: string): void {
    this.currentLocation = location
  }

  init(scene: Phaser.Scene): void {
    eventBus.on('time:dayEnd', this.onDayEnd)
    this.spawnNpcsForLocation(scene, this.currentLocation)
  }

  private playerSprite: Phaser.GameObjects.Sprite | null = null

  setPlayerSprite(sprite: Phaser.GameObjects.Sprite): void {
    this.playerSprite = sprite
  }

  update(_scene: Phaser.Scene, _time: number, _delta: number): void {
    if (this.playerSprite) {
      const px = this.playerSprite.x
      const py = this.playerSprite.y
      for (const [, npc] of this.npcs) {
        npc.updateHint(px, py)
      }
    }
  }

  destroy(): void {
    eventBus.off('time:dayEnd', this.onDayEnd)
    for (const [, npc] of this.npcs) {
      npc.destroy()
    }
    this.npcs.clear()
    this.talkedToday.clear()
  }

  talk(npcId: string): boolean {
    if (!this.npcs.has(npcId)) return false

    if (!this.talkedToday.has(npcId)) {
      this.talkedToday.add(npcId)
      this.changeRelation(npcId, TALK_RELATION_BONUS)
    }

    eventBus.emit('npc:talked', { npcId })
    return true
  }

  giveGift(npcId: string, itemId: string): GiftReaction | null {
    const npc = this.npcs.get(npcId)
    if (!npc) return null

    const def = npc.getDefinition()
    const reaction = this.getGiftReaction(def, itemId)
    const change = GIFT_RELATION_CHANGE[reaction]

    if (change !== 0) {
      this.changeRelation(npcId, change)
    }

    eventBus.emit('npc:gifted', { npcId, itemId, reaction })
    return reaction
  }

  getRelation(npcId: string): number {
    return this.relations.get(npcId) ?? 0
  }

  getNpc(npcId: string): NPC | undefined {
    return this.npcs.get(npcId)
  }

  getNpcsInRange(playerX: number, playerY: number, range: number): ReadonlyArray<NPC> {
    const result: NPC[] = []
    for (const [, npc] of this.npcs) {
      if (npc.isNearPlayer(playerX, playerY, range)) {
        result.push(npc)
      }
    }
    return result
  }

  getRelationsState(): Readonly<Record<string, number>> {
    const state: Record<string, number> = {}
    for (const [id, value] of this.relations) {
      state[id] = value
    }
    return state
  }

  loadRelationsState(relations: Readonly<Record<string, number>>): void {
    this.relations.clear()
    for (const [id, value] of Object.entries(relations)) {
      const clamped = Math.max(
        GAME_CONSTANTS.NPC_RELATION_MIN,
        Math.min(GAME_CONSTANTS.NPC_RELATION_MAX, value),
      )
      this.relations.set(id, clamped)
    }
  }

  setLocation(location: string, scene: Phaser.Scene): void {
    for (const [, npc] of this.npcs) {
      npc.destroy()
    }
    this.npcs.clear()
    this.currentLocation = location
    this.spawnNpcsForLocation(scene, location)
  }

  private spawnNpcsForLocation(scene: Phaser.Scene, location: string): void {
    const locationNpcs = npcDefs.filter((def) => def.location === location)
    for (let i = 0; i < locationNpcs.length; i++) {
      const def = locationNpcs[i]!
      const npc = new NPC(scene, def.spawnTileX, def.spawnTileY, def, i)
      this.npcs.set(def.id, npc)
    }
  }

  private changeRelation(npcId: string, amount: number): void {
    const current = this.relations.get(npcId) ?? 0
    const clamped = Math.max(
      GAME_CONSTANTS.NPC_RELATION_MIN,
      Math.min(GAME_CONSTANTS.NPC_RELATION_MAX, current + amount),
    )
    this.relations.set(npcId, clamped)
    eventBus.emit('npc:relationChanged', { npcId, newValue: clamped })
  }

  private getGiftReaction(def: NpcDefinition, itemId: string): GiftReaction {
    if (def.lovedGifts.includes(itemId)) return 'loved'
    if (def.likedGifts.includes(itemId)) return 'liked'
    if (def.dislikedGifts.includes(itemId)) return 'disliked'
    return 'neutral'
  }

  private readonly onDayEnd = (): void => {
    this.talkedToday.clear()
  }
}
