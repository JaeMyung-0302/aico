import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

const seed = async () => {
  // 기존 데이터 초기화
  await prisma.foodItem.deleteMany()
  await prisma.compartment.deleteMany()
  await prisma.fridge.deleteMany()
  await prisma.user.deleteMany()
  await prisma.group.deleteMany()

  // 그룹 생성
  const group = await prisma.group.create({
    data: {
      code: '6712',
      name: '우리집',
    },
  })

  // 1. LG 디오스 김치톡톡 4도어 (Z499MPSF11, 491L)
  const kimchiFridge = await prisma.fridge.create({
    data: {
      groupId: group.id,
      type: 'FOUR_DOOR',
      name: 'LG 김치냉장고',
    },
  })

  const kimchiCompartments = [
    // 좌측 상단 (3칸)
    { type: 'FRIDGE_UPPER' as const, label: '좌상 1', position: 0 },
    { type: 'FRIDGE_UPPER' as const, label: '좌상 2', position: 1 },
    { type: 'FRIDGE_UPPER' as const, label: '좌상 3', position: 2 },
    // 좌측 하단 (3칸)
    { type: 'FRIDGE_LOWER' as const, label: '좌하 1', position: 3 },
    { type: 'FRIDGE_LOWER' as const, label: '좌하 2', position: 4 },
    { type: 'FRIDGE_LOWER' as const, label: '좌하 3', position: 5 },
    // 우측 상단 (3칸)
    { type: 'FRIDGE_UPPER' as const, label: '우상 1', position: 6 },
    { type: 'FRIDGE_UPPER' as const, label: '우상 2', position: 7 },
    { type: 'FRIDGE_UPPER' as const, label: '우상 3', position: 8 },
    // 우측 하단 (3칸)
    { type: 'FRIDGE_LOWER' as const, label: '우하 1', position: 9 },
    { type: 'FRIDGE_LOWER' as const, label: '우하 2', position: 10 },
    { type: 'FRIDGE_LOWER' as const, label: '우하 3', position: 11 },
    // 하단 서랍 (2칸)
    { type: 'DRAWER' as const, label: '하칸 좌', position: 12 },
    { type: 'DRAWER' as const, label: '하칸 우', position: 13 },
  ]

  for (const comp of kimchiCompartments) {
    await prisma.compartment.create({
      data: { fridgeId: kimchiFridge.id, ...comp },
    })
  }

  // 2. 삼성 지펠 푸드쇼케이스 양문형 (RH833GKME7S, 831L)
  const samsungFridge = await prisma.fridge.create({
    data: {
      groupId: group.id,
      type: 'SIDE_BY_SIDE',
      name: '삼성 양문형냉장고',
    },
  })

  const samsungCompartments = [
    // 냉동실 도어 (5칸)
    { type: 'DOOR' as const, label: '냉동도어 1', position: 0 },
    { type: 'DOOR' as const, label: '냉동도어 2', position: 1 },
    { type: 'DOOR' as const, label: '냉동도어 3', position: 2 },
    { type: 'DOOR' as const, label: '냉동도어 4', position: 3 },
    { type: 'DOOR' as const, label: '냉동도어 5', position: 4 },
    // 냉동실 본체 (4칸 + 서랍 2칸)
    { type: 'FREEZER' as const, label: '냉동 1', position: 5 },
    { type: 'FREEZER' as const, label: '냉동 2', position: 6 },
    { type: 'FREEZER' as const, label: '냉동 3', position: 7 },
    { type: 'FREEZER' as const, label: '냉동 4', position: 8 },
    { type: 'DRAWER' as const, label: '냉동서랍 1', position: 9 },
    { type: 'DRAWER' as const, label: '냉동서랍 2', position: 10 },
    // 냉장실 본체 (4칸 + 서랍 2칸)
    { type: 'FRIDGE_UPPER' as const, label: '냉장 1', position: 11 },
    { type: 'FRIDGE_UPPER' as const, label: '냉장 2', position: 12 },
    { type: 'FRIDGE_UPPER' as const, label: '냉장 3', position: 13 },
    { type: 'FRIDGE_UPPER' as const, label: '냉장 4', position: 14 },
    { type: 'DRAWER' as const, label: '냉장서랍 1', position: 15 },
    { type: 'DRAWER' as const, label: '냉장서랍 2', position: 16 },
    // 쇼케이스 도어 (6칸)
    { type: 'DOOR' as const, label: '쇼케이스 1', position: 17 },
    { type: 'DOOR' as const, label: '쇼케이스 2', position: 18 },
    { type: 'DOOR' as const, label: '쇼케이스 3', position: 19 },
    { type: 'DOOR' as const, label: '쇼케이스 4', position: 20 },
    { type: 'DOOR' as const, label: '쇼케이스 5', position: 21 },
    { type: 'DOOR' as const, label: '쇼케이스 6', position: 22 },
  ]

  for (const comp of samsungCompartments) {
    await prisma.compartment.create({
      data: { fridgeId: samsungFridge.id, ...comp },
    })
  }

  // 기본 사용자 생성
  const defaultUser = await prisma.user.create({
    data: {
      email: 'admin@fridgemate.local',
      password: await bcrypt.hash('password123', 10),
      name: '관리자',
      groupId: group.id,
    },
  })

  console.log(`Seed complete:`)
  console.log(`  Group: "${group.name}" (code: ${group.code})`)
  console.log(`  User: "${defaultUser.name}" (${defaultUser.email})`)
  console.log(
    `  Fridge 1: "${kimchiFridge.name}" (${kimchiCompartments.length} compartments)`,
  )
  console.log(
    `  Fridge 2: "${samsungFridge.name}" (${samsungCompartments.length} compartments)`,
  )
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
