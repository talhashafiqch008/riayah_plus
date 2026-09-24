-- CreateTable
CREATE TABLE "recording_intelligence_runs" (
    "id" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "pipelineVersion" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'mixed',
    "jobId" TEXT,
    "status" TEXT NOT NULL,
    "sessionId" TEXT,
    "meetingId" TEXT,
    "voiceRecordingId" TEXT,
    "mediaUrlHint" TEXT,
    "languageHint" TEXT,
    "outputLanguage" TEXT,
    "analysisStrategy" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callbackReceivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recording_intelligence_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recording_intelligence_artifacts" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "pipelineVersion" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payloadEnc" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "model" TEXT,
    "promptVersion" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recording_intelligence_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recording_intelligence_runs_recordingId_pipelineVersion_key"
  ON "recording_intelligence_runs"("recordingId", "pipelineVersion");

-- CreateIndex
CREATE INDEX "recording_intelligence_runs_status_requestedAt_idx"
  ON "recording_intelligence_runs"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "recording_intelligence_runs_sessionId_idx"
  ON "recording_intelligence_runs"("sessionId");

-- CreateIndex
CREATE INDEX "recording_intelligence_runs_meetingId_idx"
  ON "recording_intelligence_runs"("meetingId");

-- CreateIndex
CREATE UNIQUE INDEX "recording_intelligence_artifacts_recordingId_pipelineVersion_artifactType_key"
  ON "recording_intelligence_artifacts"("recordingId", "pipelineVersion", "artifactType");

-- CreateIndex
CREATE INDEX "recording_intelligence_artifacts_runId_idx"
  ON "recording_intelligence_artifacts"("runId");

-- AddForeignKey
ALTER TABLE "recording_intelligence_artifacts"
  ADD CONSTRAINT "recording_intelligence_artifacts_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "recording_intelligence_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
