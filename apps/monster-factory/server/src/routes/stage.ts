import { Router, type IRouter } from 'express'
import { prisma } from '../lib/prisma.js'
import { executeTeamBattle } from '../engine/team-combat.js'
import { INITIAL_STAT_VALUE } from '@monster-factory/shared'
import type { MonsterStats, Element, TeamMember, SynergyBonus, TeamBattleRound, Skill } from '@monster-factory/shared'
import type { AuthRequest } from '../middleware/auth.js'

export const stageRouter: IRouter = Router()

// GET /api/stages - 챕터+스테이지 목록 (클리어 결과 포함)
stageRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const chapters = await prisma.chapter.findMany({
      orderBy: { number: 'asc' },
      include: {
        stages: {
          orderBy: { stageNumber: 'asc' },
          include: {
            stageResults: {
              where: { userId: user.id },
              take: 1,
            },
          },
        },
      },
    })

    const result = chapters.map((ch) => ({
      id: ch.id,
      number: ch.number,
      name: ch.name,
      description: ch.description,
      stages: ch.stages.map((s) => ({
        id: s.id,
        stageNumber: s.stageNumber,
        isBoss: s.isBoss,
        energyCost: s.energyCost,
        enemies: s.enemies,
        rewards: s.rewards,
        result: s.stageResults[0] ?? null,
      })),
      clearedCount: ch.stages.filter((s) => s.stageResults.length > 0).length,
      totalCount: ch.stages.length,
    }))

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Failed to fetch stages' })
  }
})

// POST /api/stages/:id/battle - 스테이지 전투
stageRouter.post('/:id/battle', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseId: req.supabaseId! },
    })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const stageId = req.params['id'] as string
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: { chapter: true },
    })
    if (!stage) {
      res.status(404).json({ error: 'Stage not found' })
      return
    }

    // TODO: 에너지 시스템 활성화 시 stage.energyCost 차감 추가 (현재 DEV 모드)

    // 파티 조회 (species + speciesSkills 포함)
    const skillInclude = { include: { species: { include: { speciesSkills: { include: { skill: true } } } } } }
    const party = await prisma.party.findUnique({
      where: { userId: user.id },
      include: {
        slot1: skillInclude,
        slot2: skillInclude,
        slot3: skillInclude,
      },
    })

    const partyMembers = [party?.slot1, party?.slot2, party?.slot3].filter(Boolean)
    if (partyMembers.length === 0) {
      // 파티 없으면 첫 번째 몬스터 사용
      const firstMonster = await prisma.monster.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        include: { species: { include: { speciesSkills: { include: { skill: true } } } } },
      })
      if (!firstMonster) {
        res.status(400).json({ error: 'No monsters available' })
        return
      }
      partyMembers.push(firstMonster)
    }

    // 스킬 매핑 헬퍼
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapSkills = (speciesSkills: Array<{ skill: Record<string, any> }> | undefined): Skill[] =>
      (speciesSkills ?? []).map((ss) => ({
        id: ss.skill.id as string,
        name: ss.skill.name as string,
        element: ss.skill.element as Element,
        category: ss.skill.category as Skill['category'],
        power: ss.skill.power as number,
        accuracy: ss.skill.accuracy as number,
        cooldown: ss.skill.cooldown as number,
        description: ss.skill.description as string | null,
      }))

    // 플레이어 팀 구성 (스킬 포함)
    // Prisma include 결과에서 species.speciesSkills 접근
    const playerTeam = partyMembers.map((m) => {
      const monster = m!
      const speciesData = (monster as Record<string, any>).species
      return {
        id: monster.id,
        stats: {
          atk: monster.atk,
          def: monster.def,
          hp: monster.hp,
          agi: monster.agi,
          int: monster.intStat,
          rec: monster.rec,
        } as MonsterStats,
        element: monster.element as Element,
        skills: mapSkills(speciesData?.speciesSkills),
      }
    })

    // 적 팀 구성 (Stage.enemies JSON에서)
    const enemies = stage.enemies as Array<{ element: string; level: number }>

    // 적 스킬 로드 (속성별 일괄 조회)
    const uniqueEnemyElements = [...new Set(enemies.map((e) => e.element))]
    const enemySkillRecords = await prisma.skill.findMany({
      where: { element: { in: uniqueEnemyElements } },
    })
    const skillsByElement = new Map<string, Skill[]>()
    for (const sk of enemySkillRecords) {
      const list = skillsByElement.get(sk.element) ?? []
      list.push({
        id: sk.id,
        name: sk.name,
        element: sk.element as Element,
        category: sk.category as Skill['category'],
        power: sk.power,
        accuracy: sk.accuracy,
        cooldown: sk.cooldown,
        description: sk.description,
      })
      skillsByElement.set(sk.element, list)
    }

    const enemyTeam = enemies.map((e) => {
      const levelBonus = e.level * 0.5
      return {
        stats: {
          atk: INITIAL_STAT_VALUE + levelBonus,
          def: INITIAL_STAT_VALUE + levelBonus * 0.8,
          hp: INITIAL_STAT_VALUE + levelBonus * 1.2,
          agi: INITIAL_STAT_VALUE + levelBonus * 0.6,
          int: INITIAL_STAT_VALUE + levelBonus * 0.4,
          rec: INITIAL_STAT_VALUE + levelBonus * 0.3,
        } as MonsterStats,
        element: e.element as Element,
        skills: skillsByElement.get(e.element) ?? [],
      }
    })

    // 팀 전투 실행
    const battleResult = executeTeamBattle(playerTeam, enemyTeam)

    // 라운드 데이터를 공유 타입으로 변환 (몬스터 정보 포함)
    const enrichedRounds: TeamBattleRound[] = battleResult.rounds.map((r) => {
      const playerMonster = partyMembers.find((m) => m!.id === r.playerMemberId)
      const enemyData = enemies[r.enemyIndex]
      const playerMember: TeamMember = {
        monsterId: r.playerMemberId,
        name: playerMonster?.name ?? playerMonster?.species?.name ?? null,
        element: (playerMonster?.element ?? 'Fire') as Element,
        stats: playerTeam.find((p) => p.id === r.playerMemberId)?.stats ?? { atk: 0, def: 0, hp: 0, agi: 0, int: 0, rec: 0 },
        imageUrl: playerMonster?.imageUrl ?? null,
      }
      const enemyMember: TeamMember = {
        monsterId: `enemy-${r.enemyIndex}`,
        name: null,
        element: (enemyData?.element ?? 'Fire') as Element,
        stats: enemyTeam[r.enemyIndex]?.stats ?? { atk: 0, def: 0, hp: 0, agi: 0, int: 0, rec: 0 },
        imageUrl: null,
      }
      return {
        roundNumber: r.roundNumber,
        playerMember,
        enemyMember,
        battleResult: r.result,
      }
    })

    // 시너지 보너스 객체 구성
    const synergyBonus: SynergyBonus | null = battleResult.synergyType
      ? { type: battleResult.synergyType as SynergyBonus['type'], description: `${battleResult.synergyType} 시너지`, statModifiers: {} }
      : null

    // 보상 계산
    const rewards = stage.rewards as { gold: number; summonStones: number; equipDropRate: number }
    let goldReward = 0
    let summonStonesReward = 0

    if (battleResult.winner === 'player') {
      goldReward = rewards.gold
      summonStonesReward = rewards.summonStones

      // 보상 지급 + 결과 저장
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            gold: { increment: goldReward },
            summonStones: { increment: summonStonesReward },
          },
        })

        const existing = await tx.stageResult.findUnique({
          where: { userId_stageId: { userId: user.id, stageId: stage.id } },
        })
        const newStars = Math.max(battleResult.stars, existing?.stars ?? 0)
        await tx.stageResult.upsert({
          where: { userId_stageId: { userId: user.id, stageId: stage.id } },
          update: { stars: newStars },
          create: { userId: user.id, stageId: stage.id, stars: newStars },
        })
      })
    }

    res.json({
      winner: battleResult.winner,
      rounds: enrichedRounds,
      totalGoldReward: goldReward,
      summonStonesReward,
      stars: battleResult.stars,
      synergyBonus,
      stageId: stage.id,
      stageNumber: stage.stageNumber,
      chapterName: stage.chapter.name,
    })
  } catch (err) {
    console.error('Stage battle error:', err)
    res.status(500).json({ error: 'Failed to battle stage' })
  }
})
