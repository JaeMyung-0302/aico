-- Prisma 스키마로 표현하지 못하는 제약 (implementation-plan 0C.9)

-- 커플당 멤버 자리는 1·2 두 개뿐
ALTER TABLE "CoupleMember" ADD CONSTRAINT "CoupleMember_slot_chk" CHECK ("slot" IN (1, 2));

-- 과거 사진 일괄 등록의 날짜별 자동 일기는 커플당 하루 1개 (동시 업로드 경쟁에서도 중복 생성 방지)
CREATE UNIQUE INDEX "DiaryEntry_auto_day_key" ON "DiaryEntry"("coupleId", "happenedOn") WHERE "kind" = 'AUTO_DAY';
