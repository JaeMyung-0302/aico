import { Prisma, type PrismaClient } from '../../src/generated/prisma'

export type CoupleTable = { model: string; table: string }

// coupleId 필드가 있는 모든 모델 = purge·테넌트 검사 대상. 하드코딩하지 않아 새 테이블도 자동으로 들어온다
export const COUPLE_TABLES: readonly CoupleTable[] = Prisma.dmmf.datamodel.models
  .filter((model) => model.fields.some((field) => field.name === 'coupleId'))
  .map((model) => ({ model: model.name, table: model.dbName ?? model.name }))

type CountRow = { count: bigint }

export const countCoupleRows = async (prisma: PrismaClient, coupleId: string): Promise<Record<string, number>> => {
  const entries = await Promise.all(
    COUPLE_TABLES.map(async ({ model, table }) => {
      const rows = await prisma.$queryRawUnsafe<CountRow[]>(
        `SELECT count(*) AS count FROM "${table}" WHERE "coupleId" = $1::uuid`,
        coupleId,
      )
      return [model, Number(rows[0]?.count ?? 0)] as const
    }),
  )
  return Object.fromEntries(entries)
}

// 커플 행 + 커플 소유 테이블 전체 행을 직렬화 → 호출 전후 비교로 "B가 바뀌지 않았다"를 검사
export const snapshotCouple = async (prisma: PrismaClient, coupleId: string): Promise<string> => {
  const couple = await prisma.$queryRawUnsafe<unknown[]>(`SELECT * FROM "Couple" WHERE id = $1::uuid`, coupleId)
  const tables = await Promise.all(
    COUPLE_TABLES.map(({ table }) =>
      prisma.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${table}" WHERE "coupleId" = $1::uuid ORDER BY id`, coupleId),
    ),
  )
  return JSON.stringify({ couple, tables })
}
