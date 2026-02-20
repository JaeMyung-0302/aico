import type { CharacterClass, MapId } from '@soulblade/shared'

// 플레이어 클래스별 텍스처 키
export const PLAYER_TEXTURES: Record<CharacterClass, string> = {
  Warrior: 'player_warrior',
  Mage: 'player_mage',
  Paladin: 'player_paladin',
  Archer: 'player_archer',
}

// 플레이어 spritesheet + 애니메이션 키
export const PLAYER_SPRITESHEET_KEYS: Record<CharacterClass, string> = {
  Warrior: 'ss_warrior',
  Mage: 'ss_mage',
  Paladin: 'ss_paladin',
  Archer: 'ss_archer',
}

export const PLAYER_ANIM_KEYS: Record<CharacterClass, { readonly idle: string; readonly walk: string; readonly attack: string }> = {
  Warrior: { idle: 'warrior_idle', walk: 'warrior_walk', attack: 'warrior_attack' },
  Mage: { idle: 'mage_idle', walk: 'mage_walk', attack: 'mage_attack' },
  Paladin: { idle: 'paladin_idle', walk: 'paladin_walk', attack: 'paladin_attack' },
  Archer: { idle: 'archer_idle', walk: 'archer_walk', attack: 'archer_attack' },
}

// 몬스터 등급별 텍스처 키
export const MONSTER_TEXTURES = {
  normal: 'monster_normal',
  elite: 'monster_elite',
  boss: 'monster_boss',
} as const

// 투사체 텍스처 키
export const PROJECTILE_TEXTURE = 'projectile' as const

// 맵별 배경 타일 텍스처 키
export const BG_TEXTURES: Record<MapId, string> = {
  town: 'bg_town',
  serpent_forest: 'bg_serpent_forest',
  ice_cave: 'bg_ice_cave',
  flame_castle: 'bg_flame_castle',
}
