import { prisma } from './prisma.js'
import { generateMonsterImage } from './gemini.js'
import type { Element, GrowthStage, Personality } from '@monster-factory/shared'

export const getOrCreateSpeciesImage = async (
  speciesId: string,
  growthStage: GrowthStage,
  element: Element,
  personality: Personality,
): Promise<string | null> => {
  try {
    const cached = await prisma.speciesImage.findUnique({
      where: { speciesId_growthStage: { speciesId, growthStage } },
    })
    if (cached) return cached.imageData

    const imageBuffer = await generateMonsterImage(element, personality, growthStage)
    if (!imageBuffer) return null

    const svg = imageBuffer.toString('utf-8')
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

    await prisma.speciesImage.create({
      data: { speciesId, growthStage, imageData: dataUri },
    })

    return dataUri
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[species-image] Failed:', msg)
    return null
  }
}
