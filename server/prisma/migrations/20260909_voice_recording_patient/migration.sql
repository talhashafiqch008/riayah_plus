-- Link staff voice notes to an assigned patient / care recipient.
ALTER TABLE "voice_recordings" ADD COLUMN IF NOT EXISTS "patientId" TEXT;
ALTER TABLE "voice_recordings" ADD COLUMN IF NOT EXISTS "careRecipientId" TEXT;
ALTER TABLE "voice_recordings" ADD COLUMN IF NOT EXISTS "episodeId" TEXT;

CREATE INDEX IF NOT EXISTS "voice_recordings_patientId_idx" ON "voice_recordings"("patientId");
CREATE INDEX IF NOT EXISTS "voice_recordings_careRecipientId_idx" ON "voice_recordings"("careRecipientId");
CREATE INDEX IF NOT EXISTS "voice_recordings_episodeId_idx" ON "voice_recordings"("episodeId");

DO $$ BEGIN
  ALTER TABLE "voice_recordings"
    ADD CONSTRAINT "voice_recordings_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "voice_recordings"
    ADD CONSTRAINT "voice_recordings_careRecipientId_fkey"
    FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
