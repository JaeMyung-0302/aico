import { Router, type IRouter } from 'express'
import { prisma } from '../lib/prisma.js'
import { calculateGrade } from '../engine/grade.js'
import { useEnergy } from '../engine/energy.js'
import { toMonsterResponse } from '../lib/transform.js'
import { generateMonsterImage } from '../lib/gemini.js'
import { calcGrowthStage, calcTotalStats } from '@monster-factory/shared'
import type { MinigameType, Element, GrowthStage, Personality } from '@monster-factory/shared'
import type { AuthRequest } from '../middleware/auth.js'

export const minigameRouter: IRouter = Router()

interface MinigameResultBody {
  minigameType: MinigameType
  score: number
  inputLog: unknown
  monsterId?: string
}

// POST /api/minigame/result - 미니게임 결과 제출
minigameRouter.post('/result', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // 에너지 차감
    const energyUsed = await useEnergy(user.id, 'Minigame')
    if (!energyUsed) {
      res.status(400).json({ error: 'Not enough energy' })
      return
    }

    const { minigameType, score, inputLog, monsterId } = req.body as MinigameResultBody

    // 서버사이드 등급 산정
    const gradeResult = calculateGrade(
      minigameType,
      score,
      inputLog as Parameters<typeof calculateGrade>[2],
    )

    // 몬스터 스탯 업데이트 (monsterId 지정 시 해당 몬스터, 아니면 첫 번째)
    const monster = monsterId
      ? await prisma.monster.findUnique({ where: { id: monsterId } })
      : await prisma.monster.findFirst({ where: { userId: user.id } })
    if (!monster || monster.userId !== user.id) {
      res.status(404).json({ error: 'Monster not found' })
      return
    }

    const statField = gradeResult.statType === 'int' ? 'intStat' : gradeResult.statType
    const currentValue = (monster as Record<string, unknown>)[statField] as number

    const updatedMonster = await prisma.monster.update({
      where: { id: monster.id },
      data: {
        [statField]: currentValue + gradeResult.statIncrease,
        growthStage: calcGrowthStage(
          calcTotalStats({
            atk: monster.atk + (statField === 'atk' ? gradeResult.statIncrease : 0),
            def: monster.def + (statField === 'def' ? gradeResult.statIncrease : 0),
            hp: monster.hp + (statField === 'hp' ? gradeResult.statIncrease : 0),
            agi: monster.agi + (statField === 'agi' ? gradeResult.statIncrease : 0),
            int: monster.intStat + (statField === 'intStat' ? gradeResult.statIncrease : 0),
            rec: monster.rec + (statField === 'rec' ? gradeResult.statIncrease : 0),
          }),
        ),
      },
      include: { species: true },
    })

    // 성장단계 변경 시 이미지 재생성
    if (monster.growthStage !== updatedMonster.growthStage) {
      try {
        const imageBuffer = await generateMonsterImage(
          updatedMonster.element as Element,
          updatedMonster.personality as Personality,
          updatedMonster.growthStage as GrowthStage,
        )
        if (imageBuffer) {
          const svg = imageBuffer.toString('utf-8')
          const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
          const refreshed = await prisma.monster.update({
            where: { id: updatedMonster.id },
            data: { imageUrl: dataUri },
          })
          res.json({ gradeResult, monster: toMonsterResponse(refreshed) })
          return
        }
      } catch (imgError) {
        const msg = imgError instanceof Error ? imgError.message : 'Unknown error'
        console.error('[minigame] Growth image regeneration failed:', msg)
      }
    }

    res.json({ gradeResult, monster: toMonsterResponse(updatedMonster) })
  } catch {
    res.status(500).json({ error: 'Failed to process minigame result' })
  }
})
