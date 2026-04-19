-- CreateEnum
CREATE TYPE "ResumeShareVisibility" AS ENUM ('private', 'public');

-- AlterTable
ALTER TABLE "Resume"
ADD COLUMN "shareVisibility" "ResumeShareVisibility" NOT NULL DEFAULT 'private',
ADD COLUMN "shareWithRecruiters" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Resume_shareVisibility_shareWithRecruiters_idx"
ON "Resume"("shareVisibility", "shareWithRecruiters");
