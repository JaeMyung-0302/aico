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
      targetSpawnPoint: { x: 270, y: 200 },
      recommendedLevel: 1,
      label: '마을로 귀환',
    },
  ],
  npcs: [],
  obstacles: [
    // 큰 나무 (존 사이, collidable)
    { x: 250, y: 1150, width: 60, height: 60, color: 0x2d5a27, type: 'circle', radius: 30, collidable: true },
    { x: 1800, y: 1150, width: 60, height: 60, color: 0x2d5a27, type: 'circle', radius: 30, collidable: true },
    { x: 400, y: 2350, width: 60, height: 60, color: 0x2d5a27, type: 'circle', radius: 30, collidable: true },
    { x: 1600, y: 2350, width: 60, height: 60, color: 0x2d5a27, type: 'circle', radius: 30, collidable: true },
    // 바위 (collidable)
    { x: 800, y: 1700, width: 70, height: 50, color: 0x666666, type: 'ellipse', collidable: true },
    { x: 1700, y: 2500, width: 60, height: 45, color: 0x666666, type: 'ellipse', collidable: true },
    // 덤불 (not collidable)
    { x: 150, y: 600, width: 45, height: 45, color: 0x3a6b32, type: 'circle', radius: 22, collidable: false, alpha: 0.5 },
    { x: 1900, y: 400, width: 40, height: 40, color: 0x3a6b32, type: 'circle', radius: 20, collidable: false, alpha: 0.5 },
    { x: 500, y: 1500, width: 45, height: 45, color: 0x3a6b32, type: 'circle', radius: 22, collidable: false, alpha: 0.5 },
    { x: 1400, y: 1800, width: 40, height: 40, color: 0x3a6b32, type: 'circle', radius: 20, collidable: false, alpha: 0.5 },
    { x: 900, y: 3300, width: 45, height: 45, color: 0x3a6b32, type: 'circle', radius: 22, collidable: false, alpha: 0.5 },
    // 풀 (not collidable)
    { x: 700, y: 900, width: 25, height: 30, color: 0x4a8b42, type: 'triangle', collidable: false, alpha: 0.4 },
    { x: 1300, y: 1000, width: 25, height: 30, color: 0x4a8b42, type: 'triangle', collidable: false, alpha: 0.4 },
    { x: 300, y: 2700, width: 20, height: 25, color: 0x4a8b42, type: 'triangle', collidable: false, alpha: 0.4 },
    { x: 1100, y: 2900, width: 25, height: 30, color: 0x4a8b42, type: 'triangle', collidable: false, alpha: 0.4 },
    { x: 1600, y: 1400, width: 20, height: 25, color: 0x4a8b42, type: 'triangle', collidable: false, alpha: 0.4 },
  ],
  isSafeZone: false,
}
