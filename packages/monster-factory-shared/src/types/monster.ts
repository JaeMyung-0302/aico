export const Element = {
  Chemical: 'Chemical',
  Gear: 'Gear',
  Neon: 'Neon',
  Nitro: 'Nitro',
  Crystal: 'Crystal',
  Plasma: 'Plasma',
} as const

export type Element = (typeof Element)[keyof typeof Element]

export const Personality = {
  Brave: 'Brave',
  Cautious: 'Cautious',
  Mischievous: 'Mischievous',
  Relaxed: 'Relaxed',
  Unstable: 'Unstable',
  Tough: 'Tough',
} as const

export type Personality = (typeof Personality)[keyof typeof Personality]

export const GrowthStage = {
  Egg: 'Egg',
  Baby: 'Baby',
  Boy: 'Boy',
  Adult: 'Adult',
  Awakened: 'Awakened',
} as const

export type GrowthStage = (typeof GrowthStage)[keyof typeof GrowthStage]

export interface MonsterStats {
  atk: number
  def: number
  hp: number
  agi: number
  int: number
  rec: number
}

export interface Monster {
  id: string
  userId: string
  name: string | null
  element: Element
  personality: Personality
  stats: MonsterStats
  growthStage: GrowthStage
  imageUrl: string | null
  speciesId: string | null
  speciesName: string | null
  rarity: string | null // Rarity enum value (nullable for pre-species monsters)
  createdAt: string
  updatedAt: string
}
