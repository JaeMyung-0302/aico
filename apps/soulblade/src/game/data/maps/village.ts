import type { WorldMapConfig } from '@soulblade/shared'
import { WORLD_WIDTH, WORLD_HEIGHT } from '@soulblade/shared'

// 마을 맵: 안전지대, NPC, 3개 사냥터 포탈
export const VILLAGE_MAP: WorldMapConfig = {
  id: 'town',
  name: '평화의 마을',
  description: '모험의 시작점. 상점과 대장간이 있다.',
  backgroundColor: 0x2a3a2a,
  worldSize: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  playerSpawn: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
  zones: [], // 안전지대: 몬스터 없음
  portals: [
    {
      id: 'portal_serpent',
      position: { x: WORLD_WIDTH / 2, y: 200 },
      size: { width: 80, height: 80 },
      targetMapId: 'serpent_forest',
      targetSpawnPoint: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 200 },
      recommendedLevel: 1,
      label: '뱀의 숲',
    },
    {
      id: 'portal_ice',
      position: { x: 200, y: WORLD_HEIGHT / 2 },
      size: { width: 80, height: 80 },
      targetMapId: 'ice_cave',
      targetSpawnPoint: { x: WORLD_WIDTH - 200, y: WORLD_HEIGHT / 2 },
      recommendedLevel: 15,
      label: '얼음 동굴',
    },
    {
      id: 'portal_flame',
      position: { x: WORLD_WIDTH - 200, y: WORLD_HEIGHT / 2 },
      size: { width: 80, height: 80 },
      targetMapId: 'flame_castle',
      targetSpawnPoint: { x: 200, y: WORLD_HEIGHT / 2 },
      recommendedLevel: 30,
      label: '화염의 성',
    },
  ],
  npcs: [
    {
      id: 'npc_shop',
      type: 'shop',
      position: { x: WORLD_WIDTH / 2 - 150, y: WORLD_HEIGHT / 2 - 100 },
      label: '잡화 상인',
    },
    {
      id: 'npc_blacksmith',
      type: 'blacksmith',
      position: { x: WORLD_WIDTH / 2 + 150, y: WORLD_HEIGHT / 2 - 100 },
      label: '대장간',
    },
  ],
  obstacles: [
    // 마을 경계 장식 (나무/울타리)
    { x: 400, y: 600, width: 60, height: 60, color: 0x3a5a3a },
    { x: 1700, y: 600, width: 60, height: 60, color: 0x3a5a3a },
    { x: 400, y: 3200, width: 60, height: 60, color: 0x3a5a3a },
    { x: 1700, y: 3200, width: 60, height: 60, color: 0x3a5a3a },
    // 분수대 (중앙 장식)
    { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 + 100, width: 80, height: 80, color: 0x4488aa },
  ],
  isSafeZone: true,
}
