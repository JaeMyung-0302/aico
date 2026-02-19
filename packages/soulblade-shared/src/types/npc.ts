import type { CharacterStats } from './character.js'

// 상점 아이템
export interface ShopItem {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly cost: number
  readonly effect: Partial<CharacterStats>
  readonly duration?: number // ms, undefined = 영구
}

// 대장간 강화 레시피
export interface ForgeRecipe {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly cost: number
  readonly statBoost: Partial<CharacterStats>
}
