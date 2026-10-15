-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "placeId" UUID;

-- CreateIndex
CREATE INDEX "Post_placeId_id_idx" ON "Post"("placeId", "id" DESC);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
