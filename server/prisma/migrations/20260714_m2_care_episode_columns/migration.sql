-- Align CareEpisode columns present in Prisma schema but missing from DB
ALTER TABLE "care_episodes" ADD COLUMN IF NOT EXISTS "observedChallenges" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "care_episodes" ADD COLUMN IF NOT EXISTS "developmentalMilestones" TEXT;
ALTER TABLE "care_episodes" ADD COLUMN IF NOT EXISTS "priorAssessments" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "care_episodes" ADD COLUMN IF NOT EXISTS "consentGiven" BOOLEAN NOT NULL DEFAULT false;
