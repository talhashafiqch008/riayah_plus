-- G8: explicit retention expiry for M4 PHI/PII tables
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "retentionExpiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "messages_retentionExpiresAt_idx" ON "messages"("retentionExpiresAt");

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "retentionExpiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "notifications_retentionExpiresAt_idx" ON "notifications"("retentionExpiresAt");

ALTER TABLE "user_sessions" ADD COLUMN IF NOT EXISTS "retentionExpiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "user_sessions_retentionExpiresAt_idx" ON "user_sessions"("retentionExpiresAt");

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "retentionExpiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "sessions_retentionExpiresAt_idx" ON "sessions"("retentionExpiresAt");

ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "retentionExpiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "documents_retentionExpiresAt_idx" ON "documents"("retentionExpiresAt");

ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "retentionExpiresAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "meetings_retentionExpiresAt_idx" ON "meetings"("retentionExpiresAt");
