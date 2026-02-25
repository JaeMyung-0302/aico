import { PrismaClient } from '../src/generated/prisma/index.js'

const prisma = new PrismaClient()

const tableExists = async (tableName) => {
  const result = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) AS "exists"`,
    tableName
  )
  return result[0].exists
}

const main = async () => {
  const hasGroup = await tableExists('Group')
  const hasUser = await tableExists('User')

  if (!hasGroup) {
    console.log('Fresh database. Skipping pre-push migration.')
    return
  }

  if (hasGroup && !hasUser) {
    // Group은 있지만 User가 없는 불일치 상태 → 고아 데이터 정리
    console.log('Inconsistent state: Group exists without User. Cleaning up orphaned rows...')
    await prisma.$executeRawUnsafe(`DELETE FROM "Group"`)
    console.log('Cleaned up. prisma db push will recreate tables.')
    return
  }

  // 양쪽 테이블 존재 → 기존 마이그레이션 실행
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Group' AND column_name = 'creatorId'
      ) THEN
        ALTER TABLE "Group" ADD COLUMN "creatorId" TEXT;

        UPDATE "Group" g
        SET "creatorId" = (
          SELECT u.id FROM "User" u
          WHERE u."groupId" = g.id
          ORDER BY u."createdAt" ASC
          LIMIT 1
        );

        ALTER TABLE "Group" ALTER COLUMN "creatorId" SET NOT NULL;

        ALTER TABLE "Group"
        ADD CONSTRAINT "Group_creatorId_fkey"
        FOREIGN KEY ("creatorId") REFERENCES "User"(id)
        ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Group' AND column_name = 'isPremium'
      ) THEN
        ALTER TABLE "Group" ADD COLUMN "isPremium" BOOLEAN NOT NULL DEFAULT false;
      END IF;
    END $$;
  `)

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Group' AND column_name = 'premiumExpiresAt'
      ) THEN
        ALTER TABLE "Group" ADD COLUMN "premiumExpiresAt" TIMESTAMPTZ(3);
      END IF;
    END $$;
  `)

  console.log('Pre-push migration completed successfully')
}

main()
  .catch((e) => {
    console.error('Pre-push migration failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
