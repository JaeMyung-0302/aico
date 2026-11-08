-- CreateTable
CREATE TABLE "Puzzle" (
    "id" UUID NOT NULL,
    "coupleId" UUID NOT NULL,
    "createdById" UUID,
    "backgroundPhotoId" UUID,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "pieceCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Puzzle_coupleId_endsOn_idx" ON "Puzzle"("coupleId", "endsOn" DESC);

-- CreateIndex
CREATE INDEX "Puzzle_createdById_idx" ON "Puzzle"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Puzzle_coupleId_id_key" ON "Puzzle"("coupleId", "id");

-- AddForeignKey
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_coupleId_fkey" FOREIGN KEY ("coupleId") REFERENCES "Couple"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puzzle" ADD CONSTRAINT "Puzzle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
