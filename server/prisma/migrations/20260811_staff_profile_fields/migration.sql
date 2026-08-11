-- PE-01: extend provider_profiles for staff self-managed settings
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "languages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "qatarId" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "availabilitySchedule" JSONB;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "mohLicenseNumber" TEXT;
