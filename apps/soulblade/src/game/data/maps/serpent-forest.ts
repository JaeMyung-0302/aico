import type { WorldMapConfig } from '@soulblade/shared'
import { WORLD_WIDTH, WORLD_HEIGHT, ZONE_RESPAWN_DELAY } from '@soulblade/shared'

// 뱀의 숲: Lv 1-25 사냥터
export const SERPENT_FOREST_MAP: WorldMapConfig = {
  id: 'serpent_forest',
  name: '뱀의 숲',
  description: '독사와 숲 생물이 출몰하는 초보 사냥터.',
  backgroundColor: 0x1a2e1a,
  worldSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  playerSpawn: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 200 },
  zones: [
    {
      id: 'sf_zone_south',
      bounds: { x: 100, y: 2400, width: 1960, height: 1200 },
      monsterTypes: ['normal', 'fast'],
      monsterLevel: 3,
      maxConcurrent: 8,
      respawnDelay: ZONE_RESPAWN_DELAY,
      eliteChance: 0.05,
    },
    {
      id: 'sf_zone_mid',
      bounds: { x: 100, y: 1200, width: 1960, height: 1200 },
      monsterTypes: ['normal', 'fast', 'tank'],
      monsterLevel: 10,
      maxConcurrent: 10,
      respawnDelay: ZONE_RESPAWN_DELAY,
      eliteChance: 0.1,
    },
    {
      id: 'sf_zone_north',
      bounds: { x: 100, y: 200, width: 1960, height: 1000 },
      monsterTypes: ['normal', 'tank', 'ranged'],
      monsterLevel: 20,
      maxConcurrent: 12,
      respawnDelay: ZONE_RESPAWN_DELAY + 2000,
      eliteChance: 0.15,
    },
  ],
  portals: [
    {
      id: 'portal_town_return',
      position: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 60 },
      size: { width: 100, height: 60 },
      targetMapId: 'town',
      targetSpawnPoint: { x: WORLD_WIDTH / 2, y: 300 },
      recommendedLevel: 1,
      label: '마을로 귀환',
    },
  ],
  npcs: [],
  obstacles: [
    // 나무 장애물
    { x: 300, y: 800, width: 50, height: 50, color: 0x2d5a27 },
    { x: 900, y: 500, width: 60, height: 60, color: 0x2d5a27 },
    { x: 1500, y: 700, width: 50, height: 50, color: 0x2d5a27 },
    { x: 600, y: 1600, width: 70, height: 40, color: 0x3a6b32 },
    { x: 1200, y: 2000, width: 50, height: 50, color: 0x2d5a27 },
    { x: 400, y: 3000, width: 60, height: 60, color: 0x3a6b32 },
    { x: 1800, y: 2800, width: 50, height: 50, color: 0x2d5a27 },
  ],
  isSafeZone: false,
}
