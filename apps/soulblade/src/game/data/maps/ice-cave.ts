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
      targetSpawnPoint: { x: 160, y: 660 },
      recommendedLevel: 15,
      label: '마을로 귀환',
    },
  ],
  npcs: [],
  obstacles: [
    // 종유석 (collidable)
    { x: 400, y: 650, width: 35, height: 50, color: 0x88ccff, type: 'triangle', collidable: true },
    { x: 900, y: 750, width: 40, height: 55, color: 0x88ccff, type: 'triangle', collidable: true },
    { x: 1400, y: 900, width: 35, height: 50, color: 0x88ccff, type: 'triangle', collidable: true },
    { x: 1100, y: 2600, width: 35, height: 50, color: 0x88ccff, type: 'triangle', collidable: true },
    // 빙하 (collidable)
    { x: 700, y: 1100, width: 80, height: 40, color: 0x6699cc, type: 'rect', collidable: true, alpha: 0.7 },
    { x: 300, y: 1500, width: 70, height: 35, color: 0x6699cc, type: 'rect', collidable: true, alpha: 0.7 },
    // 얼음 결정 (not collidable)
    { x: 500, y: 900, width: 25, height: 30, color: 0xaaddff, type: 'triangle', collidable: false, alpha: 0.5 },
    { x: 1100, y: 1300, width: 20, height: 25, color: 0xaaddff, type: 'triangle', collidable: false, alpha: 0.5 },
    { x: 200, y: 1800, width: 25, height: 30, color: 0xaaddff, type: 'triangle', collidable: false, alpha: 0.5 },
    { x: 400, y: 400, width: 20, height: 25, color: 0xaaddff, type: 'triangle', collidable: false, alpha: 0.5 },
    { x: 1900, y: 2800, width: 25, height: 30, color: 0xaaddff, type: 'triangle', collidable: false, alpha: 0.5 },
    // 얼음 웅덩이 (not collidable)
    { x: 600, y: 1700, width: 80, height: 50, color: 0x4488bb, type: 'ellipse', collidable: false, alpha: 0.3 },
    { x: 1500, y: 1200, width: 70, height: 45, color: 0x4488bb, type: 'ellipse', collidable: false, alpha: 0.3 },
    { x: 1800, y: 2500, width: 90, height: 55, color: 0x4488bb, type: 'ellipse', collidable: false, alpha: 0.3 },
    { x: 800, y: 2200, width: 75, height: 50, color: 0x4488bb, type: 'ellipse', collidable: false, alpha: 0.3 },
    // 빙하 장식 (not collidable)
    { x: 1700, y: 1600, width: 60, height: 30, color: 0x6699cc, type: 'rect', collidable: false, alpha: 0.4 },
  ],
  isSafeZone: false,
}
