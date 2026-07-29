/*
  Warnings:

  - The `urgencyLevel` column on the `care_episodes` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `serviceInterests` column on the `care_episodes` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "care_episodes" DROP COLUMN "urgencyLevel",
ADD COLUMN     "urgencyLevel" "UrgencyLevel",
DROP COLUMN "serviceInterests",
ADD COLUMN     "serviceInterests" "ServiceCategory"[],
ALTER COLUMN "observedChallenges" DROP DEFAULT,
ALTER COLUMN "priorAssessments" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ai_intake_summaries" (
    "id" TEXT NOT NULL,
    "careEpisodeId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "keyConcerns" TEXT[],
    "urgencyIndicators" TEXT[],
    "suggestedServiceCategories" TEXT[],
    "flaggedRiskFactors" JSONB,
    "clinicalImpressions" TEXT,
    "confidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_intake_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_intake_summaries_careEpisodeId_key" ON "ai_intake_summaries"("careEpisodeId");

-- CreateIndex
CREATE INDEX "ai_intake_summaries_careEpisodeId_idx" ON "ai_intake_summaries"("careEpisodeId");

-- AddForeignKey
ALTER TABLE "ai_intake_summaries" ADD CONSTRAINT "ai_intake_summaries_careEpisodeId_fkey" FOREIGN KEY ("careEpisodeId") REFERENCES "care_episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
