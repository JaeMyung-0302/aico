import { prisma } from '../lib/prisma.js'
import { getOrCreateSpeciesImage } from '../lib/species-image.js'
import type { Element, GrowthStage, Personality } from '@monster-factory/shared'

export interface EvolutionResult {
  success: boolean
  monsterId: string
  fromSpeciesId: string
  toSpeciesId: string
  toSpeciesName: string
  newImageUrl: string | null
  goldSpent: number
}

/**
 * 진화 실행
 * 1. 경로 확인 (fromSpeciesId → toSpeciesId)
 * 2. 성장단계 체크
 * 3. 골드 차감
 * 4. speciesId 변경
 * 5. 도감 등록
 * 6. 이미지 갱신 (트랜잭션 외부)
 */
export const executeEvolution = async (
  userId: string,
  monsterId: string,
  evolutionPathId: string,
): Promise<EvolutionResult> => {
  const txResult = await prisma.$transaction(async (tx) => {
    const path = await tx.evolutionPath.findUniqueOrThrow({
      where: { id: evolutionPathId },
      include: { toSpecies: true },
    })

    const monster = await tx.monster.findUniqueOrThrow({ where: { id: monsterId } })
    if (monster.userId !== userId) throw new Error('Not your monster')
    if (monster.speciesId !== path.fromSpeciesId) throw new Error('Species mismatch')

    // 성장단계 체크
    const stageOrder = ['Egg', 'Baby', 'Boy', 'Adult', 'Awakened']
    const currentIdx = stageOrder.indexOf(monster.growthStage)
    const requiredIdx = stageOrder.indexOf(path.minGrowthStage)
    if (currentIdx < requiredIdx) {
      throw new Error(`Growth stage too low. Need: ${path.minGrowthStage}`)
    }

    // 골드 차감
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.gold < path.goldCost) throw new Error('Not enough gold')

    await tx.user.update({
      where: { id: userId },
      data: { gold: { decrement: path.goldCost } },
    })

    // 몬스터 종 변경 (이미지는 트랜잭션 외부에서 갱신)
    await tx.monster.update({
      where: { id: monsterId },
      data: {
        speciesId: path.toSpeciesId,
        element: path.toSpecies.element,
        personality: path.toSpecies.personality,
      },
    })

    // 도감 등록
    const existingCodex = await tx.codex.findUnique({
      where: { userId_speciesId: { userId, speciesId: path.toSpeciesId } },
    })
    if (!existingCodex) {
      await tx.codex.create({ data: { userId, speciesId: path.toSpeciesId } })
    }

    return {
      path,
      monster,
    }
  })

  // 이미지 생성 (트랜잭션 외부 - Gemini API 호출이 DB 락을 잡지 않도록)
  const newImageUrl = await getOrCreateSpeciesImage(
    txResult.path.toSpeciesId,
    txResult.monster.growthStage as GrowthStage,
    txResult.path.toSpecies.element as Element,
    txResult.path.toSpecies.personality as Personality,
  )

  if (newImageUrl) {
    await prisma.monster.update({
      where: { id: monsterId },
      data: { imageUrl: newImageUrl },
    })
  }

  return {
    success: true,
    monsterId,
    fromSpeciesId: txResult.path.fromSpeciesId,
    toSpeciesId: txResult.path.toSpeciesId,
    toSpeciesName: txResult.path.toSpecies.name,
    newImageUrl,
    goldSpent: txResult.path.goldCost,
  }
}
