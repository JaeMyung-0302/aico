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

export const PLAYER_ANIM_KEYS: Record<
  CharacterClass,
  { readonly idle: string; readonly walk: string; readonly attack: string }
> = {
  Warrior: {
    idle: 'warrior_idle',
    walk: 'warrior_walk',
    attack: 'warrior_attack',
  },
  Mage: { idle: 'mage_idle', walk: 'mage_walk', attack: 'mage_attack' },
  Paladin: {
    idle: 'paladin_idle',
    walk: 'paladin_walk',
    attack: 'paladin_attack',
  },
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

// 시각 이펙트 텍스처 키
export const VFX_TEXTURES = {
  vignette: 'vfx_vignette',
  shadow: 'vfx_shadow',
} as const

// 맵별 패럴랙스 텍스처 키 (far/near 레이어)
export const PARALLAX_TEXTURES: Record<
  MapId,
  { readonly far: string; readonly near: string }
> = {
  town: { far: 'parallax_town_far', near: 'parallax_town_near' },
  serpent_forest: { far: 'parallax_forest_far', near: 'parallax_forest_near' },
  ice_cave: { far: 'parallax_ice_far', near: 'parallax_ice_near' },
  flame_castle: { far: 'parallax_flame_far', near: 'parallax_flame_near' },
}
