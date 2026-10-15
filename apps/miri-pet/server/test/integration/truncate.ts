import type { PrismaClient } from '../../src/generated/prisma'
import { resolveTestDatabaseUrl } from './test-database-url'

// _prisma_migrations를 제외한 public 스키마 전체 테이블을 비운다.
// 테스트 DB(miripet_test*)가 아니면 resolveTestDatabaseUrl이 먼저 예외를 던진다
export const truncateAll = async (prisma: PrismaClient): Promise<void> => {
  resolveTestDatabaseUrl()
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (rows.length === 0) return
  const tables = rows.map(({ tablename }) => `"public"."${tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
}
