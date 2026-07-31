-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'org_admin';

-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustSetPassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "assignedCoordinatorId" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_assignedCoordinatorId_fkey"
    FOREIGN KEY ("assignedCoordinatorId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "users_assignedCoordinatorId_idx" ON "users"("assignedCoordinatorId");
