/**
 * 스프라이트 에셋 매니페스트
 * 에셋별 경로, 프레임 크기, 프레임 수 설정
 *
 * 에셋을 public/assets/sprites/ 에 배치하면 자동으로 로드됨
 * 에셋이 없으면 프로시저럴 fallback 사용
 */

import type { CharacterClass } from '@soulblade/shared'
import type { MapId } from '@soulblade/shared'

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
  Warrior: { path: '/assets/sprites/player/warrior.png', frameWidth: 32, frameHeight: 48, frameCount: 5 },
  Mage:    { path: '/assets/sprites/player/mage.png',    frameWidth: 32, frameHeight: 48, frameCount: 5 },
  Paladin: { path: '/assets/sprites/player/paladin.png', frameWidth: 32, frameHeight: 48, frameCount: 5 },
  Archer:  { path: '/assets/sprites/player/archer.png',  frameWidth: 32, frameHeight: 48, frameCount: 5 },
}

// 엔티티 스프라이트 설정 (단일 프레임 기본)
export const ENTITY_SPRITE_ASSETS = {
  monster:    { path: '/assets/sprites/monster/normal.png', frameWidth: 24, frameHeight: 24, frameCount: 1 },
  elite:      { path: '/assets/sprites/monster/elite.png',  frameWidth: 32, frameHeight: 32, frameCount: 1 },
  boss:       { path: '/assets/sprites/monster/boss.png',   frameWidth: 48, frameHeight: 64, frameCount: 1 },
  projectile: { path: '/assets/sprites/projectile/arrow.png', frameWidth: 16, frameHeight: 6, frameCount: 1 },
} as const satisfies Record<string, SpriteAssetConfig>

// 맵별 배경 타일 설정
export const BACKGROUND_ASSETS: Record<MapId, BackgroundAssetConfig> = {
  town:           { path: '/assets/sprites/background/town.png',           tileSize: 64 },
  serpent_forest: { path: '/assets/sprites/background/serpent_forest.png', tileSize: 64 },
  ice_cave:       { path: '/assets/sprites/background/ice_cave.png',       tileSize: 64 },
  flame_castle:   { path: '/assets/sprites/background/flame_castle.png',   tileSize: 64 },
}
