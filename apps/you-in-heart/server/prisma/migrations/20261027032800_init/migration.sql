-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('KAKAO');

-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('TERMS', 'PRIVACY', 'LOCATION');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "CoupleStatus" AS ENUM ('ACTIVE', 'UNLINKING');

-- CreateEnum
CREATE TYPE "DiaryEntryKind" AS ENUM ('MANUAL', 'AUTO_DAY');

-- CreateEnum
CREATE TYPE "PhotoStatus" AS ENUM ('PENDING', 'READY');

-- CreateEnum
CREATE TYPE "QuoteSource" AS ENUM ('SHARE', 'TXT', 'SCREENSHOT');

-- CreateEnum
CREATE TYPE "NotificationLogKind" AS ENUM ('ANNIVERSARY_D0', 'ANNIVERSARY_D3', 'PARTNER_ENTRY', 'STARTED_ON_CHANGED', 'UNLINK_REQUESTED', 'EXPORT_READY');

-- CreateEnum
CREATE TYPE "ExportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "displayName" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerSub" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "rotatedAt" TIMESTAMPTZ(3),
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "expoToken" TEXT NOT NULL,
    "platform" "DevicePlatform" NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "version" TEXT NOT NULL,
    "agreedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMPTZ(3),

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoupleInvite" (
    "id" UUID NOT NULL,
    "creatorId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoupleInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Couple" (
    "id" UUID NOT NULL,
    "status" "CoupleStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedOn" DATE,
    "unlinkRequestedAt" TIMESTAMPTZ(3),
    "unlinkRequestedBy" UUID,
    "purgeAfter" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Couple_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoupleMember" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "slot" INTEGER NOT NULL,
    "reconnectConfirmedAt" TIMESTAMPTZ(3),
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoupleMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Anniversary" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "createdById" UUID,
    "title" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "repeatYearly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Anniversary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "kind" "DiaryEntryKind" NOT NULL DEFAULT 'MANUAL',
    "authorId" UUID,
    "happenedOn" DATE NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL DEFAULT '',
    "placeId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "uploaderId" UUID,
    "status" "PhotoStatus" NOT NULL DEFAULT 'PENDING',
    "originalKey" TEXT NOT NULL,
    "displayKey" TEXT,
    "thumbKey" TEXT,
    "takenAt" TIMESTAMPTZ(3),
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "originalBytes" INTEGER NOT NULL,
    "originalMime" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "createdById" UUID,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "kakaoPlaceId" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BucketItem" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "createdById" UUID,
    "title" TEXT NOT NULL,
    "doneAt" TIMESTAMPTZ(3),
    "entryId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BucketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "createdById" UUID,
    "source" "QuoteSource" NOT NULL,
    "text" TEXT,
    "speakerLabel" TEXT,
    "saidAt" TIMESTAMPTZ(3),
    "screenshotKey" TEXT,
    "screenshotThumbKey" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "kind" "NotificationLogKind" NOT NULL,
    "refKey" TEXT NOT NULL,
    "dueOn" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportJob" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "requestedById" UUID,
    "status" "ExportJobStatus" NOT NULL DEFAULT 'PENDING',
    "objectKey" TEXT,
    "expiresAt" TIMESTAMPTZ(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" UUID NOT NULL,
    "coupleId" UUID,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "props" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurgedCouple" (
    "id" UUID NOT NULL,
    "purgedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objectCountBefore" INTEGER,

    CONSTRAINT "PurgedCouple_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurgeFailure" (
    "id" UUID NOT NULL,
    "purgedCoupleId" UUID NOT NULL,
    "remainingKeys" INTEGER NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PurgeFailure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_providerSub_key" ON "AuthAccount"("provider", "providerSub");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_expoToken_key" ON "PushToken"("expoToken");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "Consent_userId_kind_idx" ON "Consent"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleInvite_code_key" ON "CoupleInvite"("code");

-- CreateIndex
CREATE INDEX "CoupleInvite_creatorId_idx" ON "CoupleInvite"("creatorId");

-- CreateIndex
CREATE INDEX "Couple_status_purgeAfter_idx" ON "Couple"("status", "purgeAfter");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleMember_userId_key" ON "CoupleMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleMember_coupleId_slot_key" ON "CoupleMember"("coupleId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "CoupleMember_coupleId_id_key" ON "CoupleMember"("coupleId", "id");

-- CreateIndex
CREATE INDEX "Anniversary_coupleId_date_idx" ON "Anniversary"("coupleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Anniversary_coupleId_id_key" ON "Anniversary"("coupleId", "id");

-- CreateIndex
CREATE INDEX "DiaryEntry_coupleId_happenedOn_id_idx" ON "DiaryEntry"("coupleId", "happenedOn" DESC, "id");

-- CreateIndex
CREATE INDEX "DiaryEntry_coupleId_placeId_idx" ON "DiaryEntry"("coupleId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryEntry_coupleId_id_key" ON "DiaryEntry"("coupleId", "id");

-- CreateIndex
CREATE INDEX "Photo_coupleId_entryId_idx" ON "Photo"("coupleId", "entryId");

-- CreateIndex
CREATE INDEX "Photo_coupleId_takenAt_idx" ON "Photo"("coupleId", "takenAt" DESC);

-- CreateIndex
CREATE INDEX "Photo_status_createdAt_idx" ON "Photo"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_coupleId_id_key" ON "Photo"("coupleId", "id");

-- CreateIndex
CREATE INDEX "Place_coupleId_createdAt_idx" ON "Place"("coupleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Place_coupleId_id_key" ON "Place"("coupleId", "id");

-- CreateIndex
CREATE INDEX "BucketItem_coupleId_doneAt_idx" ON "BucketItem"("coupleId", "doneAt");

-- CreateIndex
CREATE UNIQUE INDEX "BucketItem_coupleId_id_key" ON "BucketItem"("coupleId", "id");

-- CreateIndex
CREATE INDEX "Quote_coupleId_createdAt_idx" ON "Quote"("coupleId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_coupleId_id_key" ON "Quote"("coupleId", "id");

-- CreateIndex
CREATE INDEX "NotificationLog_coupleId_createdAt_idx" ON "NotificationLog"("coupleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_kind_coupleId_refKey_dueOn_key" ON "NotificationLog"("kind", "coupleId", "refKey", "dueOn");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_coupleId_id_key" ON "NotificationLog"("coupleId", "id");

-- CreateIndex
CREATE INDEX "ExportJob_coupleId_createdAt_idx" ON "ExportJob"("coupleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExportJob_coupleId_id_key" ON "ExportJob"("coupleId", "id");

-- CreateIndex
CREATE INDEX "EventLog_coupleId_name_createdAt_idx" ON "EventLog"("coupleId", "name", "createdAt");

-- CreateIndex
CREATE INDEX "EventLog_name_createdAt_idx" ON "EventLog"("name", "createdAt");

-- CreateIndex
CREATE INDEX "PurgeFailure_resolvedAt_createdAt_idx" ON "PurgeFailure"("resolvedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleInvite" ADD CONSTRAINT "CoupleInvite_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleMember" ADD CONSTRAINT "CoupleMember_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoupleMember" ADD CONSTRAINT "CoupleMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anniversary" ADD CONSTRAINT "Anniversary_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anniversary" ADD CONSTRAINT "Anniversary_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_coupleId_placeId_fkey" FOREIGN KEY ("coupleId", "placeId") REFERENCES "Place"("coupleId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_coupleId_entryId_fkey" FOREIGN KEY ("coupleId", "entryId") REFERENCES "DiaryEntry"("coupleId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketItem" ADD CONSTRAINT "BucketItem_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketItem" ADD CONSTRAINT "BucketItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BucketItem" ADD CONSTRAINT "BucketItem_coupleId_entryId_fkey" FOREIGN KEY ("coupleId", "entryId") REFERENCES "DiaryEntry"("coupleId", "id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
