import type { WorldMapConfig } from '@soulblade/shared'
import { WORLD_WIDTH, WORLD_HEIGHT, ZONE_RESPAWN_DELAY } from '@soulblade/shared'

// 화염의 성: Lv 30-50 사냥터
export const FLAME_CASTLE_MAP: WorldMapConfig = {
  id: 'flame_castle',
  name: '화염의 성',
  description: '용암과 화염 마물이 도사리는 고급 사냥터.',
  backgroundColor: 0x3e1a1a,
  worldSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  playerSpawn: { x: 200, y: WORLD_HEIGHT / 2 },
  zones: [
    {
      id: 'fc_zone_outer',
      bounds: { x: 100, y: 800, width: 860, height: 2200 },
      monsterTypes: ['normal', 'fast', 'tank', 'ranged'],
      monsterLevel: 30,
      maxConcurrent: 8,
      respawnDelay: ZONE_RESPAWN_DELAY + 1000,
      eliteChance: 0.15,
    },
    {
      id: 'fc_zone_inner',
      bounds: { x: 1000, y: 800, width: 1060, height: 1200 },
      monsterTypes: ['tank', 'ranged', 'swarm'],
      monsterLevel: 40,
      maxConcurrent: 10,
      respawnDelay: ZONE_RESPAWN_DELAY + 2000,
      eliteChance: 0.2,
    },
    {
      id: 'fc_zone_throne',
      bounds: { x: 600, y: 200, width: 1000, height: 600 },
      monsterTypes: ['tank', 'ranged'],
      monsterLevel: 50,
      maxConcurrent: 6,
      respawnDelay: ZONE_RESPAWN_DELAY + 4000,
      eliteChance: 0.25,
    },
  ],
  portals: [
    {
      id: 'portal_town_return',
      position: { x: 60, y: WORLD_HEIGHT / 2 },
      size: { width: 60, height: 100 },
      targetMapId: 'town',
      targetSpawnPoint: { x: WORLD_WIDTH - 300, y: WORLD_HEIGHT / 2 },
      recommendedLevel: 30,
      label: '마을로 귀환',
    },
  ],
  npcs: [],
  obstacles: [
    // 용암/기둥 장애물
    { x: 300, y: 600, width: 40, height: 80, color: 0x8b4513 },
    { x: 1200, y: 500, width: 40, height: 80, color: 0x8b4513 },
    { x: 1800, y: 1000, width: 90, height: 25, color: 0xff4400 },
    { x: 500, y: 2200, width: 60, height: 60, color: 0x8b4513 },
    { x: 1600, y: 2800, width: 40, height: 80, color: 0x8b4513 },
    { x: 900, y: 3200, width: 80, height: 25, color: 0xff4400 },
    { x: 1100, y: 1800, width: 70, height: 25, color: 0xff4400 },
  ],
  isSafeZone: false,
}
