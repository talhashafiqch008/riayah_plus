-- AUTH-09: one live OTP row per (identifier, type)
-- AUTH-10: TOTP replay protection

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastTotpStep" INTEGER;

-- Keep the newest row per (identifier, type); drop older duplicates
DELETE FROM "otp_verifications" a
USING "otp_verifications" b
WHERE a."identifier" = b."identifier"
  AND a."type" = b."type"
  AND a."createdAt" < b."createdAt";

CREATE UNIQUE INDEX IF NOT EXISTS "otp_verifications_identifier_type_key"
  ON "otp_verifications"("identifier", "type");
