import { prisma } from '../lib/prisma.js'
import { getOrCreateSpeciesImage } from '../lib/species-image.js'
import type { Element, GrowthStage, Personality } from '@monster-factory/shared'

export interface FusionResult {
  success: boolean
  parent1Id: string
  parent2Id: string
  newMonsterId: string
  resultSpeciesId: string
  resultSpeciesName: string
  resultRarity: string
  newImageUrl: string | null
  goldSpent: number
}

/**
 * 합성 실행
 * 1. 레시피 조회 (parent1Species + parent2Species)
 * 2. 골드 차감
 * 3. 부모 2마리 삭제 + 결과 몬스터 생성 (원자적)
 * 4. 도감 등록
 * 5. 이미지 생성 (트랜잭션 외부)
 */
export const executeFusion = async (
  userId: string,
  parent1Id: string,
  parent2Id: string,
): Promise<FusionResult> => {
  const txResult = await prisma.$transaction(async (tx) => {
    const parent1 = await tx.monster.findUniqueOrThrow({
      where: { id: parent1Id },
      include: { species: true },
    })
    const parent2 = await tx.monster.findUniqueOrThrow({
      where: { id: parent2Id },
      include: { species: true },
    })

    if (parent1.userId !== userId || parent2.userId !== userId) {
      throw new Error('Not your monsters')
    }
    if (!parent1.speciesId || !parent2.speciesId) {
      throw new Error('Monsters must have species')
    }

    // 레시피 조회 (양방향)
    let recipe = await tx.fusionRecipe.findUnique({
      where: { parent1SpeciesId_parent2SpeciesId: { parent1SpeciesId: parent1.speciesId, parent2SpeciesId: parent2.speciesId } },
      include: { resultSpecies: true },
    })
    if (!recipe) {
      recipe = await tx.fusionRecipe.findUnique({
        where: { parent1SpeciesId_parent2SpeciesId: { parent1SpeciesId: parent2.speciesId, parent2SpeciesId: parent1.speciesId } },
        include: { resultSpecies: true },
      })
    }
    if (!recipe) throw new Error('No fusion recipe found')

    // 골드 차감
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.gold < recipe.goldCost) throw new Error('Not enough gold')

    await tx.user.update({
      where: { id: userId },
      data: { gold: { decrement: recipe.goldCost } },
    })

    // 파티에서 부모 제거
    const party = await tx.party.findUnique({ where: { userId } })
    if (party) {
      const updates: Record<string, null> = {}
      if (party.slot1Id === parent1Id || party.slot1Id === parent2Id) updates['slot1Id'] = null
      if (party.slot2Id === parent1Id || party.slot2Id === parent2Id) updates['slot2Id'] = null
      if (party.slot3Id === parent1Id || party.slot3Id === parent2Id) updates['slot3Id'] = null
      if (Object.keys(updates).length > 0) {
        await tx.party.update({ where: { id: party.id }, data: updates })
      }
    }

    // 장비 해제
    await tx.equipment.updateMany({
      where: { monsterId: { in: [parent1Id, parent2Id] } },
      data: { monsterId: null },
    })

    // 부모 삭제
    await tx.monster.delete({ where: { id: parent1Id } })
    await tx.monster.delete({ where: { id: parent2Id } })

    // 결과 몬스터 생성 (이미지는 트랜잭션 외부에서)
    const newMonster = await tx.monster.create({
      data: {
        userId,
        speciesId: recipe.resultSpeciesId,
        element: recipe.resultSpecies.element,
        personality: recipe.resultSpecies.personality,
        atk: recipe.resultSpecies.baseAtk,
        def: recipe.resultSpecies.baseDef,
        hp: recipe.resultSpecies.baseHp,
        agi: recipe.resultSpecies.baseAgi,
        intStat: recipe.resultSpecies.baseInt,
        rec: recipe.resultSpecies.baseRec,
        growthStage: 'Egg',
      },
    })

    // 도감 등록
    const existingCodex = await tx.codex.findUnique({
      where: { userId_speciesId: { userId, speciesId: recipe.resultSpeciesId } },
    })
    if (!existingCodex) {
      await tx.codex.create({ data: { userId, speciesId: recipe.resultSpeciesId } })
    }

    return {
      recipe,
      newMonsterId: newMonster.id,
    }
  })

  // 이미지 생성 (트랜잭션 외부 - Gemini API 호출이 DB 락을 잡지 않도록)
  const newImageUrl = await getOrCreateSpeciesImage(
    txResult.recipe.resultSpeciesId,
    'Egg' as GrowthStage,
    txResult.recipe.resultSpecies.element as Element,
    txResult.recipe.resultSpecies.personality as Personality,
  )

  if (newImageUrl) {
    await prisma.monster.update({
      where: { id: txResult.newMonsterId },
      data: { imageUrl: newImageUrl },
    })
  }

  return {
    success: true,
    parent1Id,
    parent2Id,
    newMonsterId: txResult.newMonsterId,
    resultSpeciesId: txResult.recipe.resultSpeciesId,
    resultSpeciesName: txResult.recipe.resultSpecies.name,
    resultRarity: txResult.recipe.resultSpecies.rarity,
    newImageUrl,
    goldSpent: txResult.recipe.goldCost,
  }
}
