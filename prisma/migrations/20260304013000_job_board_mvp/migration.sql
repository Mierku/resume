-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('paid', 'public', 'user');

-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('pending_review', 'active', 'inactive', 'expired');

-- CreateEnum
CREATE TYPE "JobEducationLevel" AS ENUM ('any', 'college', 'bachelor', 'master', 'phd');

-- CreateEnum
CREATE TYPE "JobProgressStage" AS ENUM ('intent', 'applied', 'test', 'interview', 'offer', 'rejected');

-- CreateEnum
CREATE TYPE "JobSyncRunStatus" AS ENUM ('running', 'success', 'partial', 'failed');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceChannel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SourceType" NOT NULL,
    "homepageUrl" TEXT,
    "sourceUrl" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "refreshHours" INTEGER NOT NULL DEFAULT 6,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceChannelId" TEXT,
    "title" TEXT NOT NULL,
    "positions" JSONB NOT NULL DEFAULT '[]',
    "cities" JSONB NOT NULL DEFAULT '[]',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "educationMin" "JobEducationLevel" NOT NULL DEFAULT 'any',
    "batch" TEXT,
    "industry" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "announcementUrl" TEXT NOT NULL,
    "applyUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "deadlineAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'pending_review',
    "dedupeKey" TEXT NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "resumeId" TEXT,
    "stage" "JobProgressStage" NOT NULL DEFAULT 'intent',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSyncRun" (
    "id" TEXT NOT NULL,
    "sourceChannelId" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "sourceName" TEXT NOT NULL,
    "status" "JobSyncRunStatus" NOT NULL DEFAULT 'running',
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "normalizedCount" INTEGER NOT NULL DEFAULT 0,
    "publishedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "meta" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_normalizedName_key" ON "Company"("normalizedName");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "Company"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SourceChannel_name_key" ON "SourceChannel"("name");

-- CreateIndex
CREATE INDEX "SourceChannel_enabled_type_idx" ON "SourceChannel"("enabled", "type");

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_dedupeKey_key" ON "JobPosting"("dedupeKey");

-- CreateIndex
CREATE INDEX "JobPosting_status_publishedAt_idx" ON "JobPosting"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "JobPosting_status_deadlineAt_idx" ON "JobPosting"("status", "deadlineAt");

-- CreateIndex
CREATE INDEX "JobPosting_industry_idx" ON "JobPosting"("industry");

-- CreateIndex
CREATE INDEX "JobPosting_batch_idx" ON "JobPosting"("batch");

-- CreateIndex
CREATE INDEX "JobPosting_sourceType_sourceName_idx" ON "JobPosting"("sourceType", "sourceName");

-- CreateIndex
CREATE INDEX "JobPosting_qualityScore_idx" ON "JobPosting"("qualityScore");

-- CreateIndex
CREATE INDEX "JobPosting_createdAt_idx" ON "JobPosting"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobProgress_userId_jobPostingId_key" ON "JobProgress"("userId", "jobPostingId");

-- CreateIndex
CREATE INDEX "JobProgress_userId_updatedAt_idx" ON "JobProgress"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "JobProgress_jobPostingId_idx" ON "JobProgress"("jobPostingId");

-- CreateIndex
CREATE INDEX "JobProgress_stage_idx" ON "JobProgress"("stage");

-- CreateIndex
CREATE INDEX "JobSyncRun_status_startedAt_idx" ON "JobSyncRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "JobSyncRun_sourceName_startedAt_idx" ON "JobSyncRun"("sourceName", "startedAt");

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_sourceChannelId_fkey" FOREIGN KEY ("sourceChannelId") REFERENCES "SourceChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProgress" ADD CONSTRAINT "JobProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProgress" ADD CONSTRAINT "JobProgress_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProgress" ADD CONSTRAINT "JobProgress_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSyncRun" ADD CONSTRAINT "JobSyncRun_sourceChannelId_fkey" FOREIGN KEY ("sourceChannelId") REFERENCES "SourceChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
