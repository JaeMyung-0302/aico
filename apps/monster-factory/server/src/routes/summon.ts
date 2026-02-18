import { Router, type IRouter } from 'express'
import { prisma } from '../lib/prisma.js'
import { executeSummon } from '../engine/summon.js'
import { getOrCreateSpeciesImage } from '../lib/species-image.js'
import { toMonsterResponse } from '../lib/transform.js'
import { SUMMON_COST, MAX_MONSTERS, INITIAL_STAT_VALUE } from '@monster-factory/shared'
import type { Element, GrowthStage, Personality, SummonType } from '@monster-factory/shared'
import type { AuthRequest } from '../middleware/auth.js'

export const summonRouter: IRouter = Router()

// POST /api/summon - 소환
summonRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
      include: { monsters: { select: { id: true } } },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { summonType } = req.body as { summonType: SummonType }
    if (summonType !== 'Gold' && summonType !== 'SummonStone') {
      res.status(400).json({ error: 'Invalid summon type' })
      return
    }

    // 보유 상한 체크
    if (user.monsters.length >= user.maxMonsters) {
      res.status(400).json({ error: 'Monster capacity full', max: user.maxMonsters })
      return
    }

    // 첫 소환 무료 여부
    const isFirstSummon = user.monsters.length === 0

    // 소환 실행
    const result = await executeSummon(summonType, user.pityCounter)

    // 종 정보 조회
    const species = await prisma.monsterSpecies.findUniqueOrThrow({
      where: { id: result.speciesId },
    })

    // 이미지 가져오기 (캐시)
    const imageUrl = await getOrCreateSpeciesImage(
      species.id,
      'Egg' as GrowthStage,
      species.element as Element,
      species.personality as Personality,
    )

    // 트랜잭션: 비용 체크 + 차감 + 몬스터 생성 + 도감 등록 + 소환 이력 + pity 업데이트
    const txResult = await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUniqueOrThrow({ where: { id: user.id } })

      // 첫 소환이 아니면 비용 체크 (첫 소환은 무료)
      if (!isFirstSummon) {
        if (summonType === 'Gold' && freshUser.gold < SUMMON_COST.Gold) {
          throw new Error('Not enough gold')
        }
        if (summonType === 'SummonStone' && freshUser.summonStones < SUMMON_COST.SummonStone) {
          throw new Error('Not enough summon stones')
        }
      }

      // 비용 차감 + pity 업데이트 (첫 소환은 비용 차감 없음)
      const newPity = result.pityReset ? 0 : freshUser.pityCounter + 1
      if (isFirstSummon) {
        await tx.user.update({
          where: { id: user.id },
          data: { pityCounter: newPity },
        })
      } else if (summonType === 'Gold') {
        await tx.user.update({
          where: { id: user.id },
          data: { gold: { decrement: SUMMON_COST.Gold }, pityCounter: newPity },
        })
      } else {
        await tx.user.update({
          where: { id: user.id },
          data: { summonStones: { decrement: SUMMON_COST.SummonStone }, pityCounter: newPity },
        })
      }

      // 몬스터 생성
      const newMonster = await tx.monster.create({
        data: {
          userId: user.id,
          speciesId: species.id,
          element: species.element,
          personality: species.personality,
          atk: species.baseAtk,
          def: species.baseDef,
          hp: species.baseHp,
          agi: species.baseAgi,
          intStat: species.baseInt,
          rec: species.baseRec,
          growthStage: 'Egg',
          imageUrl,
        },
        include: { species: true },
      })

      // 도감 등록 (이미 있으면 무시)
      const existingCodex = await tx.codex.findUnique({
        where: { userId_speciesId: { userId: user.id, speciesId: species.id } },
      })
      let isNew = false
      if (!existingCodex) {
        await tx.codex.create({
          data: { userId: user.id, speciesId: species.id },
        })
        isNew = true
      }

      // 소환 이력
      await tx.summonHistory.create({
        data: { userId: user.id, speciesId: species.id, summonType },
      })

      return { monster: newMonster, isNew, newPity }
    })

    res.json({
      monster: toMonsterResponse(txResult.monster),
      isNew: txResult.isNew,
      pityCounter: txResult.newPity,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg === 'Not enough gold' || msg === 'Not enough summon stones') {
      res.status(400).json({ error: msg })
      return
    }
    console.error('[summon] Error:', msg)
    res.status(500).json({ error: 'Failed to summon' })
  }
})
