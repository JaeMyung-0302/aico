-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseId" TEXT NOT NULL,
    "nickname" TEXT,
    "gold" INTEGER NOT NULL DEFAULT 500,
    "summonStones" INTEGER NOT NULL DEFAULT 0,
    "maxMonsters" INTEGER NOT NULL DEFAULT 20,
    "pityCounter" INTEGER NOT NULL DEFAULT 0,
    "tutorialCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Monster" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesId" TEXT,
    "name" TEXT,
    "element" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "atk" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "def" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "hp" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "agi" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "intStat" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "rec" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "growthStage" TEXT NOT NULL DEFAULT 'Egg',
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterSpecies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "personality" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'Common',
    "baseAtk" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "baseDef" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "baseHp" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "baseAgi" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "baseInt" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "baseRec" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "description" TEXT,

    CONSTRAINT "MonsterSpecies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "element" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "power" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "cooldown" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesSkill" (
    "id" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "learnStage" TEXT NOT NULL DEFAULT 'Egg',

    CONSTRAINT "SpeciesSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesImage" (
    "id" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "growthStage" TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeciesImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Codex" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Codex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot1Id" TEXT,
    "slot2Id" TEXT,
    "slot3Id" TEXT,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "isBoss" BOOLEAN NOT NULL DEFAULT false,
    "energyCost" INTEGER NOT NULL DEFAULT 2,
    "enemies" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,

    CONSTRAINT "Stage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "clearedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StageResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SummonHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "summonType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SummonHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvolutionPath" (
    "id" TEXT NOT NULL,
    "fromSpeciesId" TEXT NOT NULL,
    "toSpeciesId" TEXT NOT NULL,
    "goldCost" INTEGER NOT NULL DEFAULT 1000,
    "minGrowthStage" TEXT NOT NULL DEFAULT 'Adult',

    CONSTRAINT "EvolutionPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FusionRecipe" (
    "id" TEXT NOT NULL,
    "parent1SpeciesId" TEXT NOT NULL,
    "parent2SpeciesId" TEXT NOT NULL,
    "resultSpeciesId" TEXT NOT NULL,
    "goldCost" INTEGER NOT NULL DEFAULT 500,

    CONSTRAINT "FusionRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monsterId" TEXT,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "statType" TEXT NOT NULL,
    "statValue" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnergyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DungeonResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "goldReward" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DungeonResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterSpecies_name_key" ON "MonsterSpecies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterSpecies_element_personality_key" ON "MonsterSpecies"("element", "personality");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesSkill_speciesId_skillId_key" ON "SpeciesSkill"("speciesId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesImage_speciesId_growthStage_key" ON "SpeciesImage"("speciesId", "growthStage");

-- CreateIndex
CREATE UNIQUE INDEX "Codex_userId_speciesId_key" ON "Codex"("userId", "speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "Party_userId_key" ON "Party"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Party_slot1Id_key" ON "Party"("slot1Id");

-- CreateIndex
CREATE UNIQUE INDEX "Party_slot2Id_key" ON "Party"("slot2Id");

-- CreateIndex
CREATE UNIQUE INDEX "Party_slot3Id_key" ON "Party"("slot3Id");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_number_key" ON "Chapter"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_chapterId_stageNumber_key" ON "Stage"("chapterId", "stageNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StageResult_userId_stageId_key" ON "StageResult"("userId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "EvolutionPath_fromSpeciesId_toSpeciesId_key" ON "EvolutionPath"("fromSpeciesId", "toSpeciesId");

-- CreateIndex
CREATE UNIQUE INDEX "FusionRecipe_parent1SpeciesId_parent2SpeciesId_key" ON "FusionRecipe"("parent1SpeciesId", "parent2SpeciesId");

-- AddForeignKey
ALTER TABLE "Monster" ADD CONSTRAINT "Monster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monster" ADD CONSTRAINT "Monster_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "MonsterSpecies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeciesSkill" ADD CONSTRAINT "SpeciesSkill_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "MonsterSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeciesSkill" ADD CONSTRAINT "SpeciesSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeciesImage" ADD CONSTRAINT "SpeciesImage_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "MonsterSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Codex" ADD CONSTRAINT "Codex_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Codex" ADD CONSTRAINT "Codex_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "MonsterSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_slot1Id_fkey" FOREIGN KEY ("slot1Id") REFERENCES "Monster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_slot2Id_fkey" FOREIGN KEY ("slot2Id") REFERENCES "Monster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_slot3Id_fkey" FOREIGN KEY ("slot3Id") REFERENCES "Monster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stage" ADD CONSTRAINT "Stage_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageResult" ADD CONSTRAINT "StageResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageResult" ADD CONSTRAINT "StageResult_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummonHistory" ADD CONSTRAINT "SummonHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummonHistory" ADD CONSTRAINT "SummonHistory_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "MonsterSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionPath" ADD CONSTRAINT "EvolutionPath_fromSpeciesId_fkey" FOREIGN KEY ("fromSpeciesId") REFERENCES "MonsterSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvolutionPath" ADD CONSTRAINT "EvolutionPath_toSpeciesId_fkey" FOREIGN KEY ("toSpeciesId") REFERENCES "MonsterSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FusionRecipe" ADD CONSTRAINT "FusionRecipe_parent1SpeciesId_fkey" FOREIGN KEY ("parent1SpeciesId") REFERENCES "MonsterSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FusionRecipe" ADD CONSTRAINT "FusionRecipe_parent2SpeciesId_fkey" FOREIGN KEY ("parent2SpeciesId") REFERENCES "MonsterSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FusionRecipe" ADD CONSTRAINT "FusionRecipe_resultSpeciesId_fkey" FOREIGN KEY ("resultSpeciesId") REFERENCES "MonsterSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnergyLog" ADD CONSTRAINT "EnergyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DungeonResult" ADD CONSTRAINT "DungeonResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
