-- TM-013: transcript content integrity hash
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "recordingTranscriptSha256" TEXT;
