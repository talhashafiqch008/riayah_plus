-- AUTH-02: refresh-token rotation families
-- AUTH-07: DB watermark for logout-all / credential revocation

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokensInvalidBefore" TIMESTAMP(3);

ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "familyId" TEXT;

-- Backfill existing rows: each token is its own family root
UPDATE "refresh_tokens" SET "familyId" = "id" WHERE "familyId" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "familyId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");
