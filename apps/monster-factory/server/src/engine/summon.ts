import { RARITY_RATES, PITY_THRESHOLD } from '@monster-factory/shared'
import type { Rarity, SummonType } from '@monster-factory/shared'
import { prisma } from '../lib/prisma.js'

interface SummonRollResult {
  speciesId: string
  rarity: Rarity
  pityReset: boolean
}

export const executeSummon = async (
  summonType: SummonType,
  pityCounter: number,
): Promise<SummonRollResult> => {
  // Pity check (소환석 소환에만 적용)
  let forcedRarity: Rarity | null = null
  if (summonType === 'SummonStone' && pityCounter >= PITY_THRESHOLD) {
    forcedRarity = 'Rare'
  }

  // Rarity roll
  const rates = RARITY_RATES[summonType]
  const rarity = forcedRarity ?? rollRarity(rates)

  // rarity 내에서 균등 랜덤 species 선택
  const species = await prisma.monsterSpecies.findMany({
    where: { rarity },
  })

  if (species.length === 0) {
    throw new Error(`No species found for rarity: ${rarity}`)
  }

  const selected = species[Math.floor(Math.random() * species.length)]!

  return {
    speciesId: selected.id,
    rarity: rarity as Rarity,
    pityReset: rarity === 'Rare',
  }
}

const rollRarity = (rates: { Common: number; Uncommon: number; Rare: number }): Rarity => {
  const roll = Math.random()
  if (roll < rates.Rare) return 'Rare'
  if (roll < rates.Rare + rates.Uncommon) return 'Uncommon'
  return 'Common'
}
