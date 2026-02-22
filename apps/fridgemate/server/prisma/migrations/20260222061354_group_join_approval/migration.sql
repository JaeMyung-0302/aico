-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Step 1: 빈 그룹 정리 (사용자가 없는 그룹 삭제)
DELETE FROM "Group" WHERE "id" NOT IN (
  SELECT DISTINCT "groupId" FROM "User" WHERE "groupId" IS NOT NULL
);

-- Step 2: Group.creatorId를 nullable로 추가
ALTER TABLE "Group" ADD COLUMN "creatorId" TEXT;

-- Step 3: 기존 그룹의 creatorId를 첫 번째 가입 사용자로 설정
UPDATE "Group" g
SET "creatorId" = (
  SELECT u."id" FROM "User" u
  WHERE u."groupId" = g."id"
  ORDER BY u."createdAt" ASC
  LIMIT 1
);

-- Step 4: NOT NULL 제약 추가
ALTER TABLE "Group" ALTER COLUMN "creatorId" SET NOT NULL;

-- AlterTable: PushSubscription에 userId 추가
ALTER TABLE "PushSubscription" ADD COLUMN "userId" TEXT;

-- CreateTable: JoinRequest
CREATE TABLE "JoinRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JoinRequest_groupId_status_idx" ON "JoinRequest"("groupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "JoinRequest_userId_groupId_key" ON "JoinRequest"("userId", "groupId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
