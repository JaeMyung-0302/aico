import type { WorldMapConfig } from '@soulblade/shared'
import { WORLD_WIDTH, WORLD_HEIGHT, ZONE_RESPAWN_DELAY } from '@soulblade/shared'

// 얼음 동굴: Lv 15-35 사냥터
export const ICE_CAVE_MAP: WorldMapConfig = {
  id: 'ice_cave',
  name: '얼음 동굴',
  description: '얼음 골렘과 설원 생물이 서식하는 중급 사냥터.',
  backgroundColor: 0x1a2e3e,
  worldSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  playerSpawn: { x: WORLD_WIDTH - 200, y: WORLD_HEIGHT / 2 },
  zones: [
    {
      id: 'ic_zone_entrance',
      bounds: { x: 1200, y: 800, width: 860, height: 2200 },
      monsterTypes: ['normal', 'fast', 'tank'],
      monsterLevel: 15,
      maxConcurrent: 8,
      respawnDelay: ZONE_RESPAWN_DELAY,
      eliteChance: 0.1,
    },
    {
      id: 'ic_zone_depths',
      bounds: { x: 100, y: 800, width: 1100, height: 1200 },
      monsterTypes: ['tank', 'ranged', 'swarm'],
      monsterLevel: 25,
      maxConcurrent: 10,
      respawnDelay: ZONE_RESPAWN_DELAY + 1000,
      eliteChance: 0.15,
    },
    {
      id: 'ic_zone_core',
      bounds: { x: 100, y: 200, width: 1100, height: 600 },
      monsterTypes: ['tank', 'ranged'],
      monsterLevel: 35,
      maxConcurrent: 8,
      respawnDelay: ZONE_RESPAWN_DELAY + 3000,
      eliteChance: 0.2,
    },
  ],
  portals: [
    {
      id: 'portal_town_return',
      position: { x: WORLD_WIDTH - 60, y: WORLD_HEIGHT / 2 },
      size: { width: 60, height: 100 },
      targetMapId: 'town',
      targetSpawnPoint: { x: 300, y: WORLD_HEIGHT / 2 },
      recommendedLevel: 15,
      label: '마을로 귀환',
    },
  ],
  npcs: [],
  obstacles: [
    // 빙하/얼음 장애물
    { x: 500, y: 600, width: 70, height: 35, color: 0x88ccff },
    { x: 1000, y: 1200, width: 50, height: 70, color: 0x88ccff },
    { x: 300, y: 2000, width: 90, height: 30, color: 0x6699cc },
    { x: 1600, y: 1800, width: 60, height: 60, color: 0x88ccff },
    { x: 800, y: 3000, width: 55, height: 55, color: 0x6699cc },
    { x: 1400, y: 2600, width: 70, height: 40, color: 0x88ccff },
  ],
  isSafeZone: false,
}
