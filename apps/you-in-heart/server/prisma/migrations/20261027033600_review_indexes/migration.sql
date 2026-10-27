-- DropIndex
DROP INDEX "DiaryEntry_coupleId_happenedOn_id_idx";

-- DropIndex
DROP INDEX "Photo_coupleId_takenAt_idx";

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "takenOffsetMinutes" INTEGER;

-- CreateIndex
CREATE INDEX "Anniversary_createdById_idx" ON "Anniversary"("createdById");

-- CreateIndex
CREATE INDEX "BucketItem_coupleId_entryId_idx" ON "BucketItem"("coupleId", "entryId");

-- CreateIndex
CREATE INDEX "BucketItem_createdById_idx" ON "BucketItem"("createdById");

-- CreateIndex
CREATE INDEX "DiaryEntry_coupleId_happenedOn_id_idx" ON "DiaryEntry"("coupleId", "happenedOn" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "DiaryEntry_authorId_idx" ON "DiaryEntry"("authorId");

-- CreateIndex
CREATE INDEX "EventLog_userId_idx" ON "EventLog"("userId");

-- CreateIndex
CREATE INDEX "ExportJob_requestedById_idx" ON "ExportJob"("requestedById");

-- CreateIndex
CREATE INDEX "Photo_uploaderId_idx" ON "Photo"("uploaderId");

-- CreateIndex
CREATE INDEX "Place_createdById_idx" ON "Place"("createdById");

-- CreateIndex
CREATE INDEX "Quote_createdById_idx" ON "Quote"("createdById");

-- ─── Prisma가 표현하지 못하는 제약·인덱스 (database 리뷰 반영) ───

-- 앨범: READY 사진만, 촬영 시각 없는 사진은 뒤로, id로 커서 동률 해소
CREATE INDEX "Photo_album_idx" ON "Photo"("coupleId", "takenAt" DESC NULLS LAST, "id" DESC) WHERE "status" = 'READY';

-- 커플당 진행 중인 내보내기는 하나
CREATE UNIQUE INDEX "ExportJob_active_key" ON "ExportJob"("coupleId") WHERE "status" IN ('PENDING', 'RUNNING');

-- 스크린샷 문구는 이미지 키, 그 외 문구는 텍스트가 반드시 있다
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_content_chk" CHECK (
  ("source" = 'SCREENSHOT' AND "screenshotKey" IS NOT NULL) OR ("source" <> 'SCREENSHOT' AND "text" IS NOT NULL)
);
