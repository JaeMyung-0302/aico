-- prisma db push 전에 실행: 기존 Group 행에 creatorId 추가
-- 운영 DB에 creatorId 컬럼이 없을 때만 실행됨

-- 1. creatorId 컬럼이 없으면 nullable로 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Group' AND column_name = 'creatorId'
  ) THEN
    ALTER TABLE "Group" ADD COLUMN "creatorId" TEXT;

    -- 2. 기존 그룹에 첫 번째 멤버를 creatorId로 설정
    UPDATE "Group" g
    SET "creatorId" = (
      SELECT u.id FROM "User" u
      WHERE u."groupId" = g.id
      ORDER BY u."createdAt" ASC
      LIMIT 1
    );

    -- 3. NOT NULL 제약 추가
    ALTER TABLE "Group" ALTER COLUMN "creatorId" SET NOT NULL;

    -- 4. FK 제약 추가
    ALTER TABLE "Group"
    ADD CONSTRAINT "Group_creatorId_fkey"
    FOREIGN KEY ("creatorId") REFERENCES "User"(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- isPremium 컬럼이 없으면 추가 (default false이므로 안전)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Group' AND column_name = 'isPremium'
  ) THEN
    ALTER TABLE "Group" ADD COLUMN "isPremium" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- premiumExpiresAt 컬럼이 없으면 추가 (nullable이므로 안전)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Group' AND column_name = 'premiumExpiresAt'
  ) THEN
    ALTER TABLE "Group" ADD COLUMN "premiumExpiresAt" TIMESTAMPTZ(3);
  END IF;
END $$;
