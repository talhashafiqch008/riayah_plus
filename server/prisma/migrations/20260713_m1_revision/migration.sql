-- M1 revision: org hierarchy constraints, user indexes, GDPR processingRestricted, audit index

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "processingRestricted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_organizationId_idx" ON "users"("organizationId");
CREATE INDEX IF NOT EXISTS "users_clinicId_idx" ON "users"("clinicId");
CREATE INDEX IF NOT EXISTS "users_departmentId_idx" ON "users"("departmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "clinics_organizationId_idx" ON "clinics"("organizationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "departments_clinicId_idx" ON "departments"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "clinics_organizationId_name_key" ON "clinics"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "departments_clinicId_name_key" ON "departments"("clinicId", "name");

-- DropForeignKey + AddForeignKey (Cascade)
ALTER TABLE "clinics" DROP CONSTRAINT IF EXISTS "clinics_organizationId_fkey";
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_clinicId_fkey";
ALTER TABLE "departments" ADD CONSTRAINT "departments_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
