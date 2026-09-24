-- TM-022: GPS log retention deadline + purge index
ALTER TABLE "gps_logs" ADD COLUMN IF NOT EXISTS "retentionExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "gps_logs_retentionExpiresAt_idx" ON "gps_logs"("retentionExpiresAt");
