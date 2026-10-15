-- 보안 리뷰 Phase 5 DM (LOW-4, Note)

-- LOW-4: 사진 하나는 메시지 하나에만. 혹시 남아 있는 중복은 가장 먼저 보낸 메시지에만 남긴다
UPDATE "Message" m SET "mediaId" = NULL
WHERE m."mediaId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "Message" o WHERE o."mediaId" = m."mediaId" AND o.id < m.id);

-- DropIndex
DROP INDEX "Message_mediaId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Message_mediaId_key" ON "Message"("mediaId");

-- Note: DM_REQUEST 알림은 (받는 사람, 보낸 사람)당 1개. 동시 전송 경쟁으로 생긴 중복은 가장 오래된 것만 남긴다.
-- Prisma 스키마로 표현할 수 없는 부분 유니크 인덱스(수기 SQL). 충돌은 InAppNotificationService가 no-op으로 처리한다
DELETE FROM "Notification" n
WHERE n.kind = 'DM_REQUEST'
  AND EXISTS (
    SELECT 1 FROM "Notification" o
    WHERE o.kind = 'DM_REQUEST' AND o."userId" = n."userId" AND o."actorId" = n."actorId" AND o.id < n.id
  );

CREATE UNIQUE INDEX "Notification_dm_request_once_key" ON "Notification"("userId", "actorId")
WHERE kind = 'DM_REQUEST';
