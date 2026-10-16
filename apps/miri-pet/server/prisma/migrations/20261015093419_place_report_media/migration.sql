-- AlterEnum
ALTER TYPE "MediaPurpose" ADD VALUE 'PLACE_REPORT';

-- CreateTable
CREATE TABLE "PlaceReportImage" (
    "reportId" UUID NOT NULL,
    "mediaId" UUID NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "PlaceReportImage_pkey" PRIMARY KEY ("reportId","mediaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaceReportImage_mediaId_key" ON "PlaceReportImage"("mediaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceReportImage_reportId_order_key" ON "PlaceReportImage"("reportId", "order");

-- AddForeignKey
ALTER TABLE "PlaceReportImage" ADD CONSTRAINT "PlaceReportImage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "PlaceReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceReportImage" ADD CONSTRAINT "PlaceReportImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

