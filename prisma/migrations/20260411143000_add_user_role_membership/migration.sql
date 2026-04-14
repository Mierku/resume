-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "MembershipPlan" AS ENUM ('basic', 'pro', 'elite');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'user',
ADD COLUMN "membershipPlan" "MembershipPlan" NOT NULL DEFAULT 'basic',
ADD COLUMN "membershipExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_membershipPlan_membershipExpiresAt_idx" ON "User"("membershipPlan", "membershipExpiresAt");
