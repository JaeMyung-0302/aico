-- DropIndex
DROP INDEX "PostImage_mediaId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PostImage_mediaId_key" ON "PostImage"("mediaId");

