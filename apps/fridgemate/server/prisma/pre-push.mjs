import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const main = async () => {
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
