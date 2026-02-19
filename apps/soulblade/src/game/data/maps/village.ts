import type { WorldMapConfig } from '@soulblade/shared'
import { WORLD_WIDTH, WORLD_HEIGHT } from '@soulblade/shared'

// 마을 맵: 안전지대, NPC, 3개 사냥터 포탈 (540x960 1뷰포트)
export const VILLAGE_MAP: WorldMapConfig = {
  id: 'town',
  name: '평화의 마을',
  description: '모험의 시작점. 상점과 대장간이 있다.',
  backgroundColor: 0x2a3a2a,
  worldSize: { width: 540, height: 960 },
  playerSpawn: { x: 270, y: 480 },
  zones: [], // 안전지대: 몬스터 없음
  portals: [
    {
      id: 'portal_serpent',
      position: { x: 270, y: 70 },
      size: { width: 80, height: 60 },
      targetMapId: 'serpent_forest',
      targetSpawnPoint: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 200 },
      recommendedLevel: 1,
      label: '뱀의 숲',
    },
    {
      id: 'portal_ice',
      position: { x: 110, y: 800 },
      size: { width: 70, height: 70 },
      targetMapId: 'ice_cave',
      targetSpawnPoint: { x: WORLD_WIDTH - 200, y: WORLD_HEIGHT / 2 },
      recommendedLevel: 15,
      label: '얼음 동굴',
    },
    {
      id: 'portal_flame',
      position: { x: 430, y: 800 },
      size: { width: 70, height: 70 },
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
      position: { x: 160, y: 400 },
      label: '잡화 상인',
    },
    {
      id: 'npc_blacksmith',
      type: 'blacksmith',
      position: { x: 380, y: 400 },
      label: '대장간',
    },
  ],
  obstacles: [
    // 분수대 (중앙)
    { x: 270, y: 560, width: 50, height: 50, color: 0x4488aa, type: 'circle', radius: 25, collidable: true },
    // 분수대 물 이펙트
    { x: 270, y: 560, width: 70, height: 70, color: 0x3377aa, type: 'circle', radius: 35, collidable: false, alpha: 0.3 },
    // 나무 (4 모서리)
    { x: 60, y: 180, width: 40, height: 40, color: 0x2d5a27, type: 'circle', radius: 20, collidable: true },
    { x: 480, y: 180, width: 40, height: 40, color: 0x2d5a27, type: 'circle', radius: 20, collidable: true },
    { x: 60, y: 650, width: 40, height: 40, color: 0x3a6b32, type: 'circle', radius: 20, collidable: true },
    { x: 480, y: 650, width: 40, height: 40, color: 0x3a6b32, type: 'circle', radius: 20, collidable: true },
    // 길 (세로 중앙)
    { x: 270, y: 300, width: 60, height: 400, color: 0x3a3a2a, type: 'rect', collidable: false, alpha: 0.4 },
    // 길 (가로 - 상점/대장간 연결)
    { x: 270, y: 400, width: 280, height: 40, color: 0x3a3a2a, type: 'rect', collidable: false, alpha: 0.4 },
    // 풀 장식
    { x: 140, y: 250, width: 20, height: 25, color: 0x4a8b42, type: 'triangle', collidable: false, alpha: 0.5 },
    { x: 400, y: 300, width: 20, height: 25, color: 0x4a8b42, type: 'triangle', collidable: false, alpha: 0.5 },
    { x: 100, y: 550, width: 25, height: 30, color: 0x4a8b42, type: 'triangle', collidable: false, alpha: 0.4 },
    { x: 440, y: 520, width: 20, height: 25, color: 0x4a8b42, type: 'triangle', collidable: false, alpha: 0.4 },
  ],
  isSafeZone: true,
}
