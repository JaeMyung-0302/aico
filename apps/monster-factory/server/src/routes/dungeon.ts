import { Router, type IRouter } from 'express'
import { prisma } from '../lib/prisma.js'
import { useEnergy } from '../engine/energy.js'
import { executeBattle } from '../engine/combat.js'
import { generateEnemy, calculateGoldReward } from '../engine/dungeon.js'
import { generateEquipment } from '../engine/item-gen.js'
import { DUNGEON_FLOORS } from '@monster-factory/shared'
import type { DungeonDifficulty, MonsterStats, Skill, Element } from '@monster-factory/shared'
import type { AuthRequest } from '../middleware/auth.js'

export const dungeonRouter: IRouter = Router()

interface DungeonEnterBody {
  floor: number
  difficulty: DungeonDifficulty
  monsterId?: string
}

// POST /api/dungeon/enter - 던전 입장
dungeonRouter.post('/enter', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { floor, difficulty, monsterId } = req.body as DungeonEnterBody

    if (floor < 1 || floor > DUNGEON_FLOORS) {
      res.status(400).json({ error: 'Invalid floor' })
      return
    }

    // 에너지 차감
    const energyUsed = await useEnergy(user.id, 'Dungeon')
    if (!energyUsed) {
      res.status(400).json({ error: 'Not enough energy' })
      return
    }

    // 몬스터 조회 (monsterId 지정 시 해당 몬스터, 아니면 첫 번째)
    const monster = monsterId
      ? await prisma.monster.findUnique({ where: { id: monsterId }, include: { species: { include: { speciesSkills: { include: { skill: true } } } } } })
      : await prisma.monster.findFirst({ where: { userId: user.id }, include: { species: { include: { speciesSkills: { include: { skill: true } } } } } })
    if (!monster || monster.userId !== user.id) {
      res.status(404).json({ error: 'Monster not found' })
      return
    }

    const playerStats: MonsterStats = {
      atk: monster.atk,
      def: monster.def,
      hp: monster.hp,
      agi: monster.agi,
      int: monster.intStat,
      rec: monster.rec,
    }

    // 플레이어 스킬 로드
    const playerSkills: Skill[] = (monster.species?.speciesSkills ?? []).map((ss) => ({
      id: ss.skill.id,
      name: ss.skill.name,
      element: ss.skill.element as Element,
      category: ss.skill.category as Skill['category'],
      power: ss.skill.power,
      accuracy: ss.skill.accuracy,
      cooldown: ss.skill.cooldown,
      description: ss.skill.description,
    }))

    // 적 생성 + 적 스킬 로드 (적 속성 기반)
    const enemy = generateEnemy(playerStats, floor, difficulty)
    const enemySkillRecords = await prisma.skill.findMany({
      where: { element: enemy.element },
    })
    const enemySkills: Skill[] = enemySkillRecords.map((sk) => ({
      id: sk.id,
      name: sk.name,
      element: sk.element as Element,
      category: sk.category as Skill['category'],
      power: sk.power,
      accuracy: sk.accuracy,
      cooldown: sk.cooldown,
      description: sk.description,
    }))

    const battleResult = executeBattle(
      { stats: playerStats, element: monster.element as Element, skills: playerSkills },
      { ...enemy, skills: enemySkills },
    )

    let goldReward = 0
    let equipment = null

    if (battleResult.winner === 'player') {
      goldReward = calculateGoldReward(floor, difficulty)

      // 골드 지급
      await prisma.user.update({
        where: { id: user.id },
        data: { gold: { increment: goldReward } },
      })

      // 장비 드롭 (50% 확률)
      if (Math.random() < 0.5) {
        const equipData = generateEquipment(user.id)
        equipment = await prisma.equipment.create({
          data: equipData,
        })
      }
    }

    // 던전 결과 저장
    await prisma.dungeonResult.create({
      data: {
        userId: user.id,
        floor,
        difficulty,
        result: battleResult.winner === 'player' ? 'win' : 'lose',
        goldReward,
      },
    })

    res.json({
      ...battleResult,
      goldReward,
      equipment,
      enemyElement: enemy.element,
    })
  } catch {
    res.status(500).json({ error: 'Failed to enter dungeon' })
  }
})
