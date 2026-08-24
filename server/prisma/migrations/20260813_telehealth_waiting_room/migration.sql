-- AlterTable
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "telehealthControl" JSONB;
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "telehealthControl" JSONB;
