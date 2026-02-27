/**
 * 스프라이트 에셋 매니페스트
 * 에셋별 경로, 프레임 크기, 프레임 수 설정
 *
 * 에셋을 public/assets/sprites/ 에 배치하면 자동으로 로드됨
 * 에셋이 없으면 프로시저럴 fallback 사용
 */

import type { CharacterClass, NpcType, MapId } from '@soulblade/shared'

export interface SpriteAssetConfig {
  readonly path: string
  readonly frameWidth: number
  readonly frameHeight: number
  readonly frameCount: number
}

export interface BackgroundAssetConfig {
  readonly path: string
  readonly tileSize: number
}

// 플레이어 클래스별 스프라이트시트 설정
// 가로 배열: (frameWidth × frameCount) × frameHeight
export const PLAYER_SPRITE_ASSETS: Record<CharacterClass, SpriteAssetConfig> = {
  Warrior: {
    path: '/assets/sprites/player/warrior.png',
    frameWidth: 32,
    frameHeight: 48,
    frameCount: 5,
  },
  Mage: {
    path: '/assets/sprites/player/mage.png',
    frameWidth: 32,
    frameHeight: 48,
    frameCount: 5,
  },
  Paladin: {
    path: '/assets/sprites/player/paladin.png',
    frameWidth: 32,
    frameHeight: 48,
    frameCount: 5,
  },
  Archer: {
    path: '/assets/sprites/player/archer.png',
    frameWidth: 32,
    frameHeight: 48,
    frameCount: 5,
  },
}

// 엔티티 스프라이트 설정 (단일 프레임 기본)
export const ENTITY_SPRITE_ASSETS = {
  monster: {
    path: '/assets/sprites/monster/normal.png',
    frameWidth: 24,
    frameHeight: 24,
    frameCount: 1,
  },
  elite: {
    path: '/assets/sprites/monster/elite.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
  },
  boss: {
    path: '/assets/sprites/monster/boss.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
  },
  projectile: {
    path: '/assets/sprites/projectile/arrow.png',
    frameWidth: 16,
    frameHeight: 6,
    frameCount: 1,
  },
} as const satisfies Record<string, SpriteAssetConfig>

// NPC 타입별 스프라이트 설정
export const NPC_SPRITE_ASSETS: Record<NpcType, SpriteAssetConfig> = {
  shop: {
    path: '/assets/sprites/npc/shop.png',
    frameWidth: 64,
    frameHeight: 96,
    frameCount: 1,
  },
  blacksmith: {
    path: '/assets/sprites/npc/blacksmith.png',
    frameWidth: 64,
    frameHeight: 96,
    frameCount: 1,
  },
  portal_guide: {
    path: '/assets/sprites/npc/portal_guide.png',
    frameWidth: 48,
    frameHeight: 80,
    frameCount: 1,
  },
}

// 장애물 스프라이트 설정 (맵 데이터의 spriteType 키로 참조)
export const OBSTACLE_SPRITE_ASSETS: Record<string, SpriteAssetConfig> = {
  tree_01: {
    path: '/assets/sprites/obstacle/tree_01.png',
    frameWidth: 32,
    frameHeight: 48,
    frameCount: 1,
  },
  tree_02: {
    path: '/assets/sprites/obstacle/tree_02.png',
    frameWidth: 32,
    frameHeight: 48,
    frameCount: 1,
  },
  rock_01: {
    path: '/assets/sprites/obstacle/rock_01.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
  },
  fountain: {
    path: '/assets/sprites/obstacle/fountain.png',
    frameWidth: 48,
    frameHeight: 48,
    frameCount: 1,
  },
  grass: {
    path: '/assets/sprites/obstacle/grass.png',
    frameWidth: 24,
    frameHeight: 16,
    frameCount: 1,
  },
}

// 맵별 배경 타일 설정
export const BACKGROUND_ASSETS: Record<MapId, BackgroundAssetConfig> = {
  town: { path: '/assets/sprites/background/town.png', tileSize: 128 },
  serpent_forest: {
    path: '/assets/sprites/background/serpent_forest.png',
    tileSize: 128,
  },
  ice_cave: { path: '/assets/sprites/background/ice_cave.png', tileSize: 128 },
  flame_castle: {
    path: '/assets/sprites/background/flame_castle.png',
    tileSize: 128,
  },
}
