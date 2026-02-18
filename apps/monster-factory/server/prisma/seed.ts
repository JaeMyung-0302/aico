import { PrismaClient } from '@prisma/client'
import {
  Element,
  Personality,
  PERSONALITY_RARITY,
  INITIAL_STAT_VALUE,
} from '@monster-factory/shared'

const prisma = new PrismaClient()

const ELEMENTS = Object.values(Element)
const PERSONALITIES = Object.values(Personality)

// 성격별 기본 스탯 보정 (Personality Modifiers 기반)
const PERSONALITY_STAT_BONUS: Record<string, Partial<Record<string, number>>> = {
  Brave: { atk: 1, def: -0.5 },
  Cautious: { def: 1, agi: -0.5 },
  Mischievous: { agi: 1, rec: -0.5 },
  Relaxed: { rec: 1, atk: -0.5 },
  Unstable: { atk: 1.5 },
  Tough: { hp: 1, int: -0.5 },
}

const main = async () => {
  console.log('[seed] Starting MonsterSpecies seed...')

  for (const element of ELEMENTS) {
    for (const personality of PERSONALITIES) {
      const name = `${element} ${personality}`
      const rarity = PERSONALITY_RARITY[personality as keyof typeof PERSONALITY_RARITY] ?? 'Common'
      const bonus = PERSONALITY_STAT_BONUS[personality] ?? {}

      await prisma.monsterSpecies.upsert({
        where: { element_personality: { element, personality } },
        update: {},
        create: {
          name,
          element,
          personality,
          rarity,
          baseAtk: INITIAL_STAT_VALUE + (bonus['atk'] ?? 0),
          baseDef: INITIAL_STAT_VALUE + (bonus['def'] ?? 0),
          baseHp: INITIAL_STAT_VALUE + (bonus['hp'] ?? 0),
          baseAgi: INITIAL_STAT_VALUE + (bonus['agi'] ?? 0),
          baseInt: INITIAL_STAT_VALUE + (bonus['int'] ?? 0),
          baseRec: INITIAL_STAT_VALUE + (bonus['rec'] ?? 0),
          description: `A ${rarity.toLowerCase()} ${element}-type monster with a ${personality.toLowerCase()} nature.`,
        },
      })
    }
  }

  const count = await prisma.monsterSpecies.count()
  console.log(`[seed] MonsterSpecies seeded: ${count} species`)

  // === Chapter & Stage 시드 ===
  console.log('[seed] Starting Chapter & Stage seed...')

  const CHAPTERS = [
    { number: 1, name: '화학 공장', description: '독성 화학물질이 넘치는 폐공장' },
    { number: 2, name: '기어 요새', description: '거대한 톱니바퀴가 돌아가는 요새' },
    { number: 3, name: '네온 시티', description: '형형색색의 네온사인이 빛나는 도시' },
  ]

  for (const ch of CHAPTERS) {
    const chapter = await prisma.chapter.upsert({
      where: { number: ch.number },
      update: {},
      create: { number: ch.number, name: ch.name, description: ch.description },
    })

    // 9 일반 + 1 보스 = 10 스테이지
    for (let s = 1; s <= 10; s++) {
      const isBoss = s === 10
      const level = (ch.number - 1) * 10 + s
      const enemyCount = isBoss ? 3 : Math.min(3, Math.ceil(s / 3))

      // 적 구성: 해당 챕터 속성 위주
      const chapterElement = ELEMENTS[(ch.number - 1) % ELEMENTS.length]!
      const enemies = Array.from({ length: enemyCount }, (_, i) => ({
        element: i === 0 ? chapterElement : ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]!,
        level,
      }))

      const rewards = {
        gold: isBoss ? 200 * ch.number : 50 * ch.number,
        summonStones: isBoss ? 2 : s % 3 === 0 ? 1 : 0,
        equipDropRate: isBoss ? 0.5 : 0.1 + s * 0.02,
      }

      await prisma.stage.upsert({
        where: { chapterId_stageNumber: { chapterId: chapter.id, stageNumber: s } },
        update: {},
        create: {
          chapterId: chapter.id,
          stageNumber: s,
          isBoss,
          energyCost: isBoss ? 3 : 2,
          enemies,
          rewards,
        },
      })
    }
  }

  const chapterCount = await prisma.chapter.count()
  const stageCount = await prisma.stage.count()
  console.log(`[seed] Chapters: ${chapterCount}, Stages: ${stageCount}`)

  // === Evolution Path 시드 ===
  // 같은 속성 내에서 Common → Uncommon, Uncommon → Rare 진화
  console.log('[seed] Starting EvolutionPath seed...')

  const allSpecies = await prisma.monsterSpecies.findMany()
  const speciesByElement = new Map<string, typeof allSpecies>()
  for (const sp of allSpecies) {
    const list = speciesByElement.get(sp.element) ?? []
    list.push(sp)
    speciesByElement.set(sp.element, list)
  }

  let evoCount = 0
  for (const [, speciesList] of speciesByElement) {
    const commons = speciesList.filter((s) => s.rarity === 'Common')
    const uncommons = speciesList.filter((s) => s.rarity === 'Uncommon')
    const rares = speciesList.filter((s) => s.rarity === 'Rare')

    // Common → Uncommon 진화 경로
    for (const common of commons) {
      for (const uncommon of uncommons) {
        await prisma.evolutionPath.upsert({
          where: { fromSpeciesId_toSpeciesId: { fromSpeciesId: common.id, toSpeciesId: uncommon.id } },
          update: {},
          create: { fromSpeciesId: common.id, toSpeciesId: uncommon.id, goldCost: 1000, minGrowthStage: 'Boy' },
        })
        evoCount++
      }
    }

    // Uncommon → Rare 진화 경로
    for (const uncommon of uncommons) {
      for (const rare of rares) {
        await prisma.evolutionPath.upsert({
          where: { fromSpeciesId_toSpeciesId: { fromSpeciesId: uncommon.id, toSpeciesId: rare.id } },
          update: {},
          create: { fromSpeciesId: uncommon.id, toSpeciesId: rare.id, goldCost: 2000, minGrowthStage: 'Adult' },
        })
        evoCount++
      }
    }
  }
  console.log(`[seed] EvolutionPaths seeded: ${evoCount}`)

  // === Fusion Recipe 시드 ===
  // 서로 다른 속성 Common 2마리 합성 → 결과 속성의 Uncommon
  console.log('[seed] Starting FusionRecipe seed...')

  let fusionCount = 0
  const elementPairs: [string, string][] = [
    ['Chemical', 'Gear'], ['Chemical', 'Neon'], ['Chemical', 'Nitro'],
    ['Gear', 'Neon'], ['Gear', 'Nitro'], ['Neon', 'Nitro'],
    ['Crystal', 'Plasma'], ['Crystal', 'Chemical'], ['Plasma', 'Gear'],
  ]

  for (const [el1, el2] of elementPairs) {
    const parent1 = allSpecies.find((s) => s.element === el1 && s.rarity === 'Common')
    const parent2 = allSpecies.find((s) => s.element === el2 && s.rarity === 'Common')
    // 결과: 첫 번째 부모 속성의 Uncommon
    const result = allSpecies.find((s) => s.element === el1 && s.rarity === 'Uncommon')

    if (parent1 && parent2 && result) {
      await prisma.fusionRecipe.upsert({
        where: { parent1SpeciesId_parent2SpeciesId: { parent1SpeciesId: parent1.id, parent2SpeciesId: parent2.id } },
        update: {},
        create: { parent1SpeciesId: parent1.id, parent2SpeciesId: parent2.id, resultSpeciesId: result.id, goldCost: 500 },
      })
      fusionCount++
    }
  }
  console.log(`[seed] FusionRecipes seeded: ${fusionCount}`)

  // === Skill 시드 ===
  console.log('[seed] Starting Skill seed...')

  // 속성별 물리 + 마법 스킬 (6속성 x 2 = 12스킬)
  const SKILL_SEEDS = [
    // Chemical
    { name: 'Chemical Slash', element: 'Chemical', category: 'physical', power: 1.5, cooldown: 1, description: '독성 화학물질을 입힌 베기 공격' },
    { name: 'Acid Burst', element: 'Chemical', category: 'magical', power: 1.8, cooldown: 2, description: '강산을 폭발시키는 마법 공격' },
    // Gear
    { name: 'Gear Crush', element: 'Gear', category: 'physical', power: 1.5, cooldown: 1, description: '거대한 톱니바퀴로 찍어 누르는 공격' },
    { name: 'Spark Bolt', element: 'Gear', category: 'magical', power: 1.8, cooldown: 2, description: '전기 스파크를 발사하는 마법 공격' },
    // Neon
    { name: 'Neon Strike', element: 'Neon', category: 'physical', power: 1.5, cooldown: 1, description: '네온빛으로 물든 강력한 타격' },
    { name: 'Flash Beam', element: 'Neon', category: 'magical', power: 1.8, cooldown: 2, description: '눈부신 네온 광선을 발사' },
    // Nitro
    { name: 'Nitro Punch', element: 'Nitro', category: 'physical', power: 1.5, cooldown: 1, description: '폭발적인 속도의 강펀치' },
    { name: 'Flame Blast', element: 'Nitro', category: 'magical', power: 1.8, cooldown: 2, description: '니트로 연료를 태워 화염 폭발' },
    // Crystal
    { name: 'Crystal Edge', element: 'Crystal', category: 'physical', power: 1.5, cooldown: 1, description: '날카로운 수정 조각으로 벤다' },
    { name: 'Prism Ray', element: 'Crystal', category: 'magical', power: 1.8, cooldown: 2, description: '프리즘 빛을 집중시켜 발사' },
    // Plasma
    { name: 'Plasma Claw', element: 'Plasma', category: 'physical', power: 1.5, cooldown: 1, description: '플라즈마로 감싼 발톱 공격' },
    { name: 'Ion Cannon', element: 'Plasma', category: 'magical', power: 1.8, cooldown: 2, description: '이온 에너지를 집중 발사' },
  ]

  for (const s of SKILL_SEEDS) {
    await prisma.skill.upsert({
      where: { name: s.name },
      update: {},
      create: { ...s, accuracy: 1.0 },
    })
  }

  const skillCount = await prisma.skill.count()
  console.log(`[seed] Skills seeded: ${skillCount}`)

  // === SpeciesSkill 연결 ===
  console.log('[seed] Starting SpeciesSkill seed...')

  const allSkills = await prisma.skill.findMany()
  const updatedSpecies = await prisma.monsterSpecies.findMany()

  let speciesSkillCount = 0
  for (const sp of updatedSpecies) {
    // 자기 속성의 스킬 2개 연결
    const elementSkills = allSkills.filter((sk) => sk.element === sp.element)
    for (const sk of elementSkills) {
      await prisma.speciesSkill.upsert({
        where: { speciesId_skillId: { speciesId: sp.id, skillId: sk.id } },
        update: {},
        create: {
          speciesId: sp.id,
          skillId: sk.id,
          learnStage: sk.cooldown === 0 ? 'Egg' : sk.cooldown === 1 ? 'Baby' : 'Boy',
        },
      })
      speciesSkillCount++
    }
  }

  console.log(`[seed] SpeciesSkills seeded: ${speciesSkillCount}`)
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
