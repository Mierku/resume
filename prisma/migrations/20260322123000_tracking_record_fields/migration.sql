ALTER TABLE "Record"
  ADD COLUMN "companyName" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "salaryMin" TEXT,
  ADD COLUMN "salaryMax" TEXT;

CREATE INDEX "Record_userId_updatedAt_idx" ON "Record"("userId", "updatedAt");
