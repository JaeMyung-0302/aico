import type { Monster as PrismaMonster, MonsterSpecies as PrismaSpecies, Codex as PrismaCodex } from '@prisma/client'

export const toMonsterResponse = (m: PrismaMonster & { species?: PrismaSpecies | null }) => ({
  id: m.id,
  userId: m.userId,
  name: m.name,
  element: m.element,
  personality: m.personality,
  stats: {
    atk: m.atk,
    def: m.def,
    hp: m.hp,
    agi: m.agi,
    int: m.intStat,
    rec: m.rec,
  },
  growthStage: m.growthStage,
  imageUrl: m.imageUrl ?? null,
  speciesId: m.speciesId ?? null,
  speciesName: m.species?.name ?? null,
  rarity: m.species?.rarity ?? null,
  createdAt: m.createdAt.toISOString(),
  updatedAt: m.updatedAt.toISOString(),
})

export const toSpeciesResponse = (s: PrismaSpecies) => ({
  id: s.id,
  name: s.name,
  element: s.element,
  personality: s.personality,
  rarity: s.rarity,
  baseAtk: s.baseAtk,
  baseDef: s.baseDef,
  baseHp: s.baseHp,
  baseAgi: s.baseAgi,
  baseInt: s.baseInt,
  baseRec: s.baseRec,
  description: s.description,
})

export const toCodexResponse = (
  species: PrismaSpecies,
  codex: PrismaCodex | null,
) => ({
  species: toSpeciesResponse(species),
  discovered: codex !== null,
  discoveredAt: codex?.discoveredAt?.toISOString() ?? null,
})
