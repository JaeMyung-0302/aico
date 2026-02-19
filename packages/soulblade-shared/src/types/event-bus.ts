import type { CharacterClass, CharacterStats } from './character.js'
import type { Equipment } from './equipment.js'
import type { MapId, NpcType } from './map.js'
import type { PassiveSkillId, SkillEvolution } from './skill.js'
import type { EventType } from './stage.js'
import type { RunResult } from './run.js'

// 스탯 배분 타입
export interface StatAllocationData {
  readonly hp: number
  readonly atk: number
  readonly def: number
  readonly spd: number
  readonly crit: number
}

// Phaser -> React 이벤트
export interface PhaserToReactEvents {
  readonly 'player:levelup': {
    readonly level: number
    readonly statPoints: number
  }
  readonly 'player:death': {
    readonly survivedSeconds: number
    readonly score: number
  }
  readonly 'player:statsUpdate': {
    readonly hp: number
    readonly maxHp: number
    readonly level: number
    readonly exp: number
    readonly expToNext: number
  }
  readonly 'run:complete': RunResult
  readonly 'event:trigger': {
    readonly type: EventType
    readonly data: Record<string, unknown>
  }
  readonly 'evolution:available': {
    readonly evolution: SkillEvolution
  }
  readonly 'hud:killCount': {
    readonly count: number
  }
  readonly 'hud:timer': {
    readonly seconds: number
  }
  readonly 'hud:gold': {
    readonly gold: number
  }
  // RPG 맵/포탈/NPC 이벤트
  readonly 'portal:enter': {
    readonly portalId: string
    readonly targetMapId: MapId
    readonly targetSpawnPoint: { readonly x: number; readonly y: number }
    readonly recommendedLevel: number
    readonly label: string
  }
  readonly 'hud:mapName': {
    readonly name: string
  }
  readonly 'map:transitionStart': undefined
  readonly 'map:transitionEnd': {
    readonly mapId: MapId
  }
  readonly 'npc:interact': {
    readonly npcId: string
    readonly npcType: NpcType
    readonly label: string
  }
  readonly 'npc:leave': undefined
  readonly 'save:request': undefined
  readonly 'player:fullStats': {
    readonly hp: number
    readonly maxHp: number
    readonly atk: number
    readonly def: number
    readonly spd: number
    readonly crit: number
    readonly critDmg: number
    readonly level: number
    readonly gold: number
    readonly passiveSkills: ReadonlyArray<{ readonly id: PassiveSkillId; readonly level: number }>
  }
}

// React -> Phaser 이벤트
export interface ReactToPhaserEvents {
  readonly 'stat:allocate': StatAllocationData
  readonly 'ui:requestStats': undefined
  readonly 'skill:selected': {
    readonly skillId: PassiveSkillId
  }
  readonly 'skill:activate': {
    readonly skillId: string
  }
  readonly 'evolution:accept': {
    readonly evolutionId: string
  }
  readonly 'evolution:reject': undefined
  readonly 'event:merchant:select': {
    readonly itemIndex: number
  }
  readonly 'game:start': {
    readonly mapId: MapId
    readonly classType: CharacterClass
    readonly stats: CharacterStats
    readonly equippedItems: readonly Equipment[]
  }
  readonly 'game:pause': undefined
  readonly 'game:resume': undefined
  readonly 'game:revive': {
    readonly hpPercent: number
    readonly applyDeathPenalty?: boolean
  }
  readonly 'input:joystick': {
    readonly x: number
    readonly y: number
  }
  readonly 'input:attack': undefined
  // RPG 포탈/NPC 응답 이벤트
  readonly 'portal:confirm': {
    readonly targetMapId: MapId
  }
  readonly 'portal:cancel': undefined
  readonly 'npc:close': undefined
  readonly 'npc:buy': {
    readonly itemId: string
    readonly cost: number
  }
  readonly 'npc:forge': {
    readonly equipmentId: string
    readonly cost: number
  }
}

// 전체 이벤트 맵
export type GameEvents = PhaserToReactEvents & ReactToPhaserEvents
