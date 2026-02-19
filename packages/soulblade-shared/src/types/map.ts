import type { MonsterType } from './stage.js'

// 맵 ID (마을 + 3개 사냥터)
export type MapId = 'town' | 'serpent_forest' | 'ice_cave' | 'flame_castle'

// NPC 타입
export type NpcType = 'shop' | 'blacksmith' | 'portal_guide'

// 존 설정 (WaveConfig 대체)
export interface ZoneConfig {
  readonly id: string
  readonly bounds: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }
  readonly monsterTypes: readonly MonsterType[]
  readonly monsterLevel: number
  readonly maxConcurrent: number
  readonly respawnDelay: number // ms (5000-10000)
  readonly eliteChance: number // 0-1
}

// 포탈 설정
export interface PortalConfig {
  readonly id: string
  readonly position: { readonly x: number; readonly y: number }
  readonly size: { readonly width: number; readonly height: number }
  readonly targetMapId: MapId
  readonly targetSpawnPoint: { readonly x: number; readonly y: number }
  readonly recommendedLevel: number
  readonly label: string
}

// NPC 설정
export interface NpcConfig {
  readonly id: string
  readonly type: NpcType
  readonly position: { readonly x: number; readonly y: number }
  readonly label: string
}

// 장애물/장식 설정
export interface ObstacleConfig {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly color: number
  readonly type?: 'rect' | 'circle' | 'triangle' | 'ellipse'
  readonly collidable?: boolean   // default true
  readonly radius?: number        // circle/ellipse용
  readonly alpha?: number         // 투명도 (default 0.6)
}

// 월드 맵 설정 (StageConfig 대체)
export interface WorldMapConfig {
  readonly id: MapId
  readonly name: string
  readonly description: string
  readonly backgroundColor: number
  readonly worldSize: { readonly width: number; readonly height: number }
  readonly playerSpawn: { readonly x: number; readonly y: number }
  readonly zones: readonly ZoneConfig[]
  readonly portals: readonly PortalConfig[]
  readonly npcs: readonly NpcConfig[]
  readonly obstacles: readonly ObstacleConfig[]
  readonly isSafeZone: boolean
}
