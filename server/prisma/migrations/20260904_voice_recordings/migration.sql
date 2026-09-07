-- CreateTable
CREATE TABLE "voice_recordings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "s3Key" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "sessionId" TEXT,
    "meetingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "retentionExpiresAt" TIMESTAMP(3),

    CONSTRAINT "voice_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voice_recordings_userId_idx" ON "voice_recordings"("userId");

-- CreateIndex
CREATE INDEX "voice_recordings_organizationId_idx" ON "voice_recordings"("organizationId");

-- CreateIndex
CREATE INDEX "voice_recordings_sessionId_idx" ON "voice_recordings"("sessionId");

-- CreateIndex
CREATE INDEX "voice_recordings_meetingId_idx" ON "voice_recordings"("meetingId");

-- CreateIndex
CREATE INDEX "voice_recordings_retentionExpiresAt_idx" ON "voice_recordings"("retentionExpiresAt");

-- AddForeignKey
ALTER TABLE "voice_recordings" ADD CONSTRAINT "voice_recordings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
