-- Permanent UI language preference (null until forced chooser completes)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "uiLanguage" TEXT;
