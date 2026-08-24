-- Optional FK so episode-linked threads can be filtered and cleaned up with the episode.
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "episodeId" TEXT;
CREATE INDEX IF NOT EXISTS "conversations_episodeId_idx" ON "conversations"("episodeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversations_episodeId_fkey'
  ) THEN
    ALTER TABLE "conversations"
      ADD CONSTRAINT "conversations_episodeId_fkey"
      FOREIGN KEY ("episodeId") REFERENCES "care_episodes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
