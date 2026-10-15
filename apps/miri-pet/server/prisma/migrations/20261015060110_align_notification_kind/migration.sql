-- AlterEnum
BEGIN;
CREATE TYPE "NotificationKind_new" AS ENUM ('LIKE', 'COMMENT', 'FOLLOW', 'DM_REQUEST', 'VACCINATION_DUE', 'PLACE_REPORT_REVIEWED');
ALTER TABLE "Notification" ALTER COLUMN "kind" TYPE "NotificationKind_new" USING ("kind"::text::"NotificationKind_new");
ALTER TYPE "NotificationKind" RENAME TO "NotificationKind_old";
ALTER TYPE "NotificationKind_new" RENAME TO "NotificationKind";
DROP TYPE "public"."NotificationKind_old";
COMMIT;

