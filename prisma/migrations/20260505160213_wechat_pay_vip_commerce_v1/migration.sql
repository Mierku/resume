-- CreateEnum
CREATE TYPE "VipPackageStatus" AS ENUM ('draft', 'active', 'disabled', 'archived');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('fixed_amount', 'percentage', 'threshold_discount');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('draft', 'active', 'disabled', 'archived');

-- CreateEnum
CREATE TYPE "CouponAudience" AS ENUM ('all', 'new_user', 'existing_user', 'active_vip', 'inactive_vip');

-- CreateEnum
CREATE TYPE "CouponStackingRule" AS ENUM ('single_only', 'future_stackable');

-- CreateEnum
CREATE TYPE "CouponRedemptionStatus" AS ENUM ('reserved', 'consumed', 'released');

-- CreateEnum
CREATE TYPE "CommerceOrderStatus" AS ENUM ('pending', 'awaiting_payment', 'manual_review', 'callback_error', 'paid', 'fulfilled', 'closed');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('wechat_native');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'awaiting_payment', 'manual_review', 'callback_received', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "PaymentWebhookStatus" AS ENUM ('received', 'verified', 'processed', 'rejected');

-- CreateEnum
CREATE TYPE "EntitlementSourceType" AS ENUM ('purchase', 'merge', 'manual');

-- CreateEnum
CREATE TYPE "OrderAuditAction" AS ENUM ('close_unpaid', 'mark_manual_review', 'note');

-- CreateTable
CREATE TABLE "VipPackage" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "membershipPlan" "MembershipPlan" NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "priceFen" INTEGER NOT NULL,
    "compareAtPriceFen" INTEGER,
    "status" "VipPackageStatus" NOT NULL DEFAULT 'draft',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "note" TEXT,
    "featureList" JSONB DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VipPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CouponStatus" NOT NULL DEFAULT 'draft',
    "type" "CouponType" NOT NULL,
    "audience" "CouponAudience" NOT NULL DEFAULT 'all',
    "stackingRule" "CouponStackingRule" NOT NULL DEFAULT 'single_only',
    "channel" TEXT,
    "amountFen" INTEGER,
    "percentOff" INTEGER,
    "thresholdFen" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "perUserLimit" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponPackage" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "vipPackageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommerceOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vipPackageId" TEXT NOT NULL,
    "status" "CommerceOrderStatus" NOT NULL DEFAULT 'pending',
    "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'wechat_native',
    "currency" TEXT NOT NULL DEFAULT 'CNY',
    "membershipPlanSnapshot" "MembershipPlan" NOT NULL,
    "durationDaysSnapshot" INTEGER NOT NULL,
    "packageCodeSnapshot" TEXT NOT NULL,
    "packageNameSnapshot" TEXT NOT NULL,
    "packageSubtitleSnapshot" TEXT,
    "originalAmountFen" INTEGER NOT NULL,
    "discountAmountFen" INTEGER NOT NULL DEFAULT 0,
    "payableAmountFen" INTEGER NOT NULL,
    "couponCodeSnapshot" TEXT,
    "manualReviewReason" TEXT,
    "closedReason" TEXT,
    "qrCodeUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommerceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCouponApplication" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "couponCodeSnapshot" TEXT NOT NULL,
    "couponNameSnapshot" TEXT NOT NULL,
    "couponTypeSnapshot" "CouponType" NOT NULL,
    "stackingRuleSnapshot" "CouponStackingRule" NOT NULL,
    "audienceSnapshot" "CouponAudience" NOT NULL,
    "discountAmountFen" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCouponApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'reserved',
    "discountAmountFen" INTEGER NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'wechat_native',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "merchantTradeNumber" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "responseCodeUrl" TEXT,
    "gatewayTransactionId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'wechat_native',
    "orderId" TEXT,
    "paymentAttemptId" TEXT,
    "status" "PaymentWebhookStatus" NOT NULL DEFAULT 'received',
    "eventType" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "serial" TEXT,
    "signature" TEXT,
    "nonce" TEXT,
    "timestamp" TEXT,
    "bodyText" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitlementGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "sourceType" "EntitlementSourceType" NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "membershipPlan" "MembershipPlan" NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "grantedDays" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntitlementGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAuditEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "OrderAuditAction" NOT NULL,
    "reason" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VipPackage_code_key" ON "VipPackage"("code");

-- CreateIndex
CREATE INDEX "VipPackage_status_sortOrder_idx" ON "VipPackage"("status", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_status_startsAt_endsAt_idx" ON "Coupon"("status", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Coupon_channel_status_idx" ON "Coupon"("channel", "status");

-- CreateIndex
CREATE INDEX "CouponPackage_vipPackageId_idx" ON "CouponPackage"("vipPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponPackage_couponId_vipPackageId_key" ON "CouponPackage"("couponId", "vipPackageId");

-- CreateIndex
CREATE UNIQUE INDEX "CommerceOrder_orderNumber_key" ON "CommerceOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "CommerceOrder_userId_createdAt_idx" ON "CommerceOrder"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CommerceOrder_userId_status_idx" ON "CommerceOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "CommerceOrder_status_createdAt_idx" ON "CommerceOrder"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCouponApplication_orderId_key" ON "OrderCouponApplication"("orderId");

-- CreateIndex
CREATE INDEX "OrderCouponApplication_couponId_idx" ON "OrderCouponApplication"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_status_reservedAt_idx" ON "CouponRedemption"("couponId", "status", "reservedAt");

-- CreateIndex
CREATE INDEX "CouponRedemption_userId_couponId_status_idx" ON "CouponRedemption"("userId", "couponId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_merchantTradeNumber_key" ON "PaymentAttempt"("merchantTradeNumber");

-- CreateIndex
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentAttempt_status_updatedAt_idx" ON "PaymentAttempt"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_dedupeKey_key" ON "PaymentWebhookEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_orderId_createdAt_idx" ON "PaymentWebhookEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentAttemptId_createdAt_idx" ON "PaymentWebhookEvent"("paymentAttemptId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EntitlementGrant_orderId_key" ON "EntitlementGrant"("orderId");

-- CreateIndex
CREATE INDEX "EntitlementGrant_userId_createdAt_idx" ON "EntitlementGrant"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EntitlementGrant_sourceType_sourceReference_key" ON "EntitlementGrant"("sourceType", "sourceReference");

-- CreateIndex
CREATE INDEX "OrderAuditEvent_orderId_createdAt_idx" ON "OrderAuditEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderAuditEvent_actorUserId_createdAt_idx" ON "OrderAuditEvent"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "CouponPackage" ADD CONSTRAINT "CouponPackage_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponPackage" ADD CONSTRAINT "CouponPackage_vipPackageId_fkey" FOREIGN KEY ("vipPackageId") REFERENCES "VipPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommerceOrder" ADD CONSTRAINT "CommerceOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommerceOrder" ADD CONSTRAINT "CommerceOrder_vipPackageId_fkey" FOREIGN KEY ("vipPackageId") REFERENCES "VipPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCouponApplication" ADD CONSTRAINT "OrderCouponApplication_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommerceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCouponApplication" ADD CONSTRAINT "OrderCouponApplication_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommerceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommerceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommerceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitlementGrant" ADD CONSTRAINT "EntitlementGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitlementGrant" ADD CONSTRAINT "EntitlementGrant_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommerceOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAuditEvent" ADD CONSTRAINT "OrderAuditEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommerceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAuditEvent" ADD CONSTRAINT "OrderAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
