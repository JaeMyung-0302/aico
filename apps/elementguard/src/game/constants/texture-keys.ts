import type { Element, FusionElement, TerrainType } from '@/types'

// 텍스처 키 SSOT — 모든 텍스처 키를 이 모듈에서 관리
export const TEXTURE_KEYS = {
  hero: (element: Element) => `hero-${element}` as const,
  unit: (element: Element) => `unit-${element}` as const,
  fusion: (fusion: FusionElement) => `unit-fusion-${fusion}` as const,
  enemy: (element: Element) => `enemy-${element}` as const,
  boss: (element: Element) => `boss-${element}` as const,
  projectile: (element: Element) => `projectile-${element}` as const,
  projectileSingle: 'projectile' as const,
  gridSlot: 'grid-slot' as const,
  pathTile: 'path-tile' as const,
  terrain: (type: TerrainType) => `terrain-${type}` as const,
} as const
