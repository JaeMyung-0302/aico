/**
 * 3D 모델 색상 팔레트 (SSOT)
 * sprite-generator.ts의 Canvas2D 색상값에서 추출
 *
 * 모든 값은 0xRRGGBB 형식의 hex number
 */

import type { CharacterClass } from '@soulblade/shared'

// ── 플레이어 클래스별 팔레트 ──

export const WARRIOR_COLORS = {
  head: 0x666666,
  helmet: 0x888888,
  visor: 0x222222,
  body: 0x556677,
  bodyDetail: 0x667788,
  shoulder: 0x778899,
  arm: 0x445566,
  leg: 0x445566,
  boot: 0x554433,
  sword: 0xccccdd,
  shieldHandle: 0x886633,
} as const

export const MAGE_COLORS = {
  head: 0x443366,
  hat: 0x332255,
  face: 0x221133,
  eyes: 0xaa88ff,
  robe: 0x443366,
  robeInner: 0x554477,
  belt: 0xaa8833,
  arm: 0x443366,
  boot: 0x332255,
  staff: 0x886644,
  orb: 0xaa66ff,
} as const

export const PALADIN_COLORS = {
  head: 0xccaa44,
  wings: 0xddbb55,
  visor: 0x222222,
  body: 0xccaa44,
  cross: 0xeedd66,
  shoulder: 0xddbb55,
  arm: 0xbbaa44,
  leg: 0xbbaa44,
  boot: 0xaa8833,
  hammerHandle: 0x887733,
  hammerHead: 0xccaa44,
} as const

export const ARCHER_COLORS = {
  head: 0x336633,
  hood: 0x447744,
  skin: 0xddbb88,
  eyes: 0x224422,
  body: 0x557755,
  belt: 0x775533,
  cloak: 0x336633,
  arm: 0x557755,
  bow: 0x886644,
  leg: 0x557755,
  boot: 0x664422,
} as const

export const PLAYER_COLORS: Record<
  CharacterClass,
  | typeof WARRIOR_COLORS
  | typeof MAGE_COLORS
  | typeof PALADIN_COLORS
  | typeof ARCHER_COLORS
> = {
  Warrior: WARRIOR_COLORS,
  Mage: MAGE_COLORS,
  Paladin: PALADIN_COLORS,
  Archer: ARCHER_COLORS,
}

// ── 몬스터 팔레트 ──

export const MONSTER_COLORS = {
  head: 0x884422,
  eyes: 0xff2200,
  body: 0x663311,
  arm: 0x774422,
  claw: 0xccaa77,
  leg: 0x663311,
} as const

// ── 엘리트 팔레트 ──

export const ELITE_COLORS = {
  horn: 0xaa6633,
  head: 0x664422,
  eyesOuter: 0xff4400,
  eyesInner: 0xffaa00,
  body: 0x554433,
  bodyDetail: 0x776655,
  arm: 0x665544,
  shoulder: 0x887766,
  leg: 0x443322,
} as const

// ── 보스 팔레트 ──

export const BOSS_COLORS = {
  horn: 0x882211,
  head: 0x553322,
  hornSmall: 0xaa4422,
  eyesOuter: 0xff2200,
  eyesInner: 0xffaa00,
  mouth: 0x221100,
  teeth: 0xccaa88,
  body: 0x443322,
  belly: 0x665544,
  arm: 0x443322,
  shoulder: 0x887766,
  claw: 0xaa8866,
  leg: 0x332211,
  foot: 0x554433,
} as const

// ── 투사체 팔레트 ──

export const PROJECTILE_COLORS = {
  shaft: 0x8b6914,
  tip: 0xcccccc,
  fletching: 0xcc3333,
} as const
