-- M2: Care Unit, IntakeRecord, CareRecipient extensions, Document categories

-- These enums exist in Prisma schema but were never created in the initial DB
-- (care_episodes.urgencyLevel / serviceInterests were stored as TEXT / TEXT[]).
CREATE TYPE "UrgencyLevel" AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE "ServiceCategory" AS ENUM (
  'speech_therapy',
  'occupational_therapy',
  'behavioral_support',
  'physiotherapy',
  'nursing',
  'companion_care'
);

CREATE TYPE "IntakeStatus" AS ENUM (
  'submitted',
  'under_review',
  'validated',
  'episode_created',
  'withdrawn'
);

CREATE TYPE "IntakeDocumentCategory" AS ENUM (
  'referral',
  'prior_assessment',
  'insurance',
  'medical_report',
  'consent',
  'other'
);

CREATE TABLE "care_units" (
  "id" TEXT NOT NULL,
  "familyUserId" TEXT NOT NULL,
  "organizationId" TEXT,
  "clinicId" TEXT,
  "name" TEXT NOT NULL,
  "primaryCaregiverName" TEXT,
  "primaryCaregiverPhone" TEXT,
  "primaryCaregiverRelation" TEXT,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT NOT NULL DEFAULT 'QA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "care_units_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "care_recipient_revisions" (
  "id" TEXT NOT NULL,
  "careRecipientId" TEXT NOT NULL,
  "changedById" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changeSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "care_recipient_revisions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "intake_records" (
  "id" TEXT NOT NULL,
  "careUnitId" TEXT NOT NULL,
  "careRecipientId" TEXT NOT NULL,
  "familyUserId" TEXT NOT NULL,
  "organizationId" TEXT,
  "careEpisodeId" TEXT,
  "status" "IntakeStatus" NOT NULL DEFAULT 'submitted',
  "urgencyLevel" "UrgencyLevel",
  "reasonForCare" TEXT NOT NULL,
  "medicalHistory" TEXT,
  "currentMeds" TEXT,
  "diagnoses" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "serviceInterests" "ServiceCategory"[] DEFAULT ARRAY[]::"ServiceCategory"[],
  "primaryCaregiverName" TEXT,
  "primaryCaregiverPhone" TEXT,
  "primaryCaregiverRelation" TEXT,
  "wizardPayload" JSONB,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewerId" TEXT,
  "reviewSummary" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "intake_records_pkey" PRIMARY KEY ("id")
);

-- CareRecipient extensions
ALTER TABLE "care_recipients" ADD COLUMN "careUnitId" TEXT;
ALTER TABLE "care_recipients" ADD COLUMN "externalRef" TEXT;
ALTER TABLE "care_recipients" ADD COLUMN "pocName" TEXT;
ALTER TABLE "care_recipients" ADD COLUMN "pocPhone" TEXT;
ALTER TABLE "care_recipients" ADD COLUMN "diagnosisCodes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CareEpisode extensions
ALTER TABLE "care_episodes" ADD COLUMN "careUnitId" TEXT;
ALTER TABLE "care_episodes" ADD COLUMN "organizationId" TEXT;

-- Document extensions
ALTER TABLE "documents" ADD COLUMN "intakeRecordId" TEXT;
ALTER TABLE "documents" ADD COLUMN "careUnitId" TEXT;
ALTER TABLE "documents" ADD COLUMN "category" "IntakeDocumentCategory";

-- Uniques
CREATE UNIQUE INDEX "care_recipients_externalRef_key" ON "care_recipients"("externalRef");
CREATE UNIQUE INDEX "intake_records_careEpisodeId_key" ON "intake_records"("careEpisodeId");

-- Indexes
CREATE INDEX "care_units_familyUserId_idx" ON "care_units"("familyUserId");
CREATE INDEX "care_units_organizationId_idx" ON "care_units"("organizationId");
CREATE INDEX "care_units_clinicId_idx" ON "care_units"("clinicId");
CREATE INDEX "care_recipients_careUnitId_idx" ON "care_recipients"("careUnitId");
CREATE INDEX "care_recipient_revisions_careRecipientId_idx" ON "care_recipient_revisions"("careRecipientId");
CREATE INDEX "care_recipient_revisions_changedById_idx" ON "care_recipient_revisions"("changedById");
CREATE INDEX "intake_records_careUnitId_idx" ON "intake_records"("careUnitId");
CREATE INDEX "intake_records_careRecipientId_idx" ON "intake_records"("careRecipientId");
CREATE INDEX "intake_records_familyUserId_idx" ON "intake_records"("familyUserId");
CREATE INDEX "intake_records_organizationId_idx" ON "intake_records"("organizationId");
CREATE INDEX "intake_records_status_idx" ON "intake_records"("status");
CREATE INDEX "intake_records_urgencyLevel_idx" ON "intake_records"("urgencyLevel");
CREATE INDEX "care_episodes_careUnitId_idx" ON "care_episodes"("careUnitId");
CREATE INDEX "care_episodes_organizationId_idx" ON "care_episodes"("organizationId");
CREATE INDEX "documents_intakeRecordId_idx" ON "documents"("intakeRecordId");
CREATE INDEX "documents_careUnitId_idx" ON "documents"("careUnitId");

-- Foreign keys
ALTER TABLE "care_units" ADD CONSTRAINT "care_units_familyUserId_fkey"
  FOREIGN KEY ("familyUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "care_units" ADD CONSTRAINT "care_units_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "care_units" ADD CONSTRAINT "care_units_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "care_recipients" ADD CONSTRAINT "care_recipients_careUnitId_fkey"
  FOREIGN KEY ("careUnitId") REFERENCES "care_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "care_recipient_revisions" ADD CONSTRAINT "care_recipient_revisions_careRecipientId_fkey"
  FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "care_recipient_revisions" ADD CONSTRAINT "care_recipient_revisions_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_careUnitId_fkey"
  FOREIGN KEY ("careUnitId") REFERENCES "care_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_careRecipientId_fkey"
  FOREIGN KEY ("careRecipientId") REFERENCES "care_recipients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_familyUserId_fkey"
  FOREIGN KEY ("familyUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_careEpisodeId_fkey"
  FOREIGN KEY ("careEpisodeId") REFERENCES "care_episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "intake_records" ADD CONSTRAINT "intake_records_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "care_episodes" ADD CONSTRAINT "care_episodes_careUnitId_fkey"
  FOREIGN KEY ("careUnitId") REFERENCES "care_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "care_episodes" ADD CONSTRAINT "care_episodes_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_intakeRecordId_fkey"
  FOREIGN KEY ("intakeRecordId") REFERENCES "intake_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_careUnitId_fkey"
  FOREIGN KEY ("careUnitId") REFERENCES "care_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
