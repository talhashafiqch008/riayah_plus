-- AlterTable
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "recordingStatus" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "recordingTranscript" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "recordingEgressId" TEXT;
