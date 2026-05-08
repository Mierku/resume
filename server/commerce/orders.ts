import crypto from 'crypto'
import {
  CommerceOrderStatus,
  CouponRedemptionStatus,
  OrderAuditAction,
  PaymentProvider,
  PaymentStatus,
  PaymentWebhookStatus,
  Prisma,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { CommerceError } from '@/server/commerce/errors'
import { extendMembershipFromPurchase } from '@/server/vip/entitlement'

export function createOrderNumber() {
  return `ORD${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`
}

export async function listAdminOrders() {
  return prisma.commerceOrder.findMany({
    orderBy: [{ createdAt: 'desc' }],
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      paymentAttempts: {
        orderBy: [{ createdAt: 'desc' }],
      },
      couponApplication: true,
      auditEvents: {
        orderBy: [{ createdAt: 'desc' }],
      },
    },
  })
}

export async function getAdminOrderById(id: string) {
  return prisma.commerceOrder.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      paymentAttempts: {
        orderBy: [{ createdAt: 'desc' }],
      },
      couponApplication: true,
      auditEvents: {
        orderBy: [{ createdAt: 'desc' }],
      },
      webhookEvents: {
        orderBy: [{ createdAt: 'desc' }],
      },
    },
  })
}

export async function applyAdminOrderAction(input: {
  orderId: string
  actorUserId: string
  action: 'close_unpaid' | 'mark_manual_review'
  reason?: string
}) {
  return prisma.$transaction(async tx => {
    const order = await tx.commerceOrder.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        status: true,
      },
    })

    if (!order) {
      throw new CommerceError('订单不存在', 404)
    }

    if (input.action === 'close_unpaid') {
      if (order.status !== CommerceOrderStatus.pending && order.status !== CommerceOrderStatus.awaiting_payment) {
        throw new CommerceError('当前订单状态不允许关闭')
      }
      await tx.commerceOrder.update({
        where: { id: order.id },
        data: {
          status: CommerceOrderStatus.closed,
          closedAt: new Date(),
          closedReason: input.reason || '管理员关闭未支付订单',
        },
      })
    }

    if (input.action === 'mark_manual_review') {
      await tx.commerceOrder.update({
        where: { id: order.id },
        data: {
          status:
            order.status === CommerceOrderStatus.fulfilled
              ? CommerceOrderStatus.fulfilled
              : CommerceOrderStatus.manual_review,
          manualReviewReason: input.reason || '管理员标记人工复核',
        },
      })
    }

    await tx.orderAuditEvent.create({
      data: {
        orderId: order.id,
        actorUserId: input.actorUserId,
        action:
          input.action === 'close_unpaid'
            ? OrderAuditAction.close_unpaid
            : OrderAuditAction.mark_manual_review,
        reason: input.reason,
      },
    })
  })
}

export async function reserveCouponForOrder(tx: Prisma.TransactionClient, input: {
  couponId: string
  userId: string
  orderId: string
  discountAmountFen: number
}) {
  return tx.couponRedemption.create({
    data: {
      couponId: input.couponId,
      userId: input.userId,
      orderId: input.orderId,
      status: CouponRedemptionStatus.reserved,
      discountAmountFen: input.discountAmountFen,
    },
  })
}

export async function createPendingCommerceOrder(
  tx: Prisma.TransactionClient,
  input: {
    userId: string
    vipPackageId: string
    membershipPlanSnapshot: 'basic' | 'pro' | 'elite'
    durationDaysSnapshot: number
    packageCodeSnapshot: string
    packageNameSnapshot: string
    packageSubtitleSnapshot?: string | null
    originalAmountFen: number
    discountAmountFen: number
    payableAmountFen: number
    couponApplication?: {
      couponId: string
      couponCodeSnapshot: string
      couponNameSnapshot: string
      couponTypeSnapshot: 'fixed_amount' | 'percentage' | 'threshold_discount'
      stackingRuleSnapshot: 'single_only' | 'future_stackable'
      audienceSnapshot: 'all' | 'new_user' | 'existing_user' | 'active_vip' | 'inactive_vip'
      discountAmountFen: number
    }
  },
) {
  const order = await tx.commerceOrder.create({
    data: {
      orderNumber: createOrderNumber(),
      userId: input.userId,
      vipPackageId: input.vipPackageId,
      status: CommerceOrderStatus.pending,
      paymentProvider: PaymentProvider.wechat_native,
      membershipPlanSnapshot: input.membershipPlanSnapshot,
      durationDaysSnapshot: input.durationDaysSnapshot,
      packageCodeSnapshot: input.packageCodeSnapshot,
      packageNameSnapshot: input.packageNameSnapshot,
      packageSubtitleSnapshot: input.packageSubtitleSnapshot,
      originalAmountFen: input.originalAmountFen,
      discountAmountFen: input.discountAmountFen,
      payableAmountFen: input.payableAmountFen,
      couponCodeSnapshot: input.couponApplication?.couponCodeSnapshot,
      couponApplication: input.couponApplication
        ? {
            create: input.couponApplication,
          }
        : undefined,
    },
  })

  if (input.couponApplication) {
    await reserveCouponForOrder(tx, {
      couponId: input.couponApplication.couponId,
      userId: input.userId,
      orderId: order.id,
      discountAmountFen: input.couponApplication.discountAmountFen,
    })
  }

  return order
}

export async function persistWechatPaymentAttempt(input: {
  orderId: string
  merchantTradeNumber: string
  requestPayload: unknown
  responsePayload: unknown
  responseCodeUrl: string | null
}) {
  return prisma.$transaction(async tx => {
    const paymentAttempt = await tx.paymentAttempt.create({
      data: {
        orderId: input.orderId,
        provider: PaymentProvider.wechat_native,
        status: PaymentStatus.awaiting_payment,
        merchantTradeNumber: input.merchantTradeNumber,
        requestPayload: input.requestPayload as Prisma.InputJsonValue,
        responsePayload: input.responsePayload as Prisma.InputJsonValue,
        responseCodeUrl: input.responseCodeUrl,
        requestedAt: new Date(),
        respondedAt: new Date(),
      },
    })

    await tx.commerceOrder.update({
      where: { id: input.orderId },
      data: {
        status: CommerceOrderStatus.awaiting_payment,
        qrCodeUrl: input.responseCodeUrl,
      },
    })

    return paymentAttempt
  })
}

export async function markCheckoutManualReview(input: {
  orderId: string
  reason: string
}) {
  return prisma.commerceOrder.update({
    where: { id: input.orderId },
    data: {
      status: CommerceOrderStatus.manual_review,
      manualReviewReason: input.reason,
    },
  })
}

export async function recordWechatWebhookEvent(input: {
  orderId?: string | null
  paymentAttemptId?: string | null
  dedupeKey: string
  eventType?: string | null
  serial?: string | null
  signature?: string | null
  nonce?: string | null
  timestamp?: string | null
  bodyText: string
  status?: PaymentWebhookStatus
}) {
  return prisma.paymentWebhookEvent.upsert({
    where: { dedupeKey: input.dedupeKey },
    update: {
      orderId: input.orderId || undefined,
      paymentAttemptId: input.paymentAttemptId || undefined,
      status: input.status || PaymentWebhookStatus.received,
      eventType: input.eventType || undefined,
      serial: input.serial || undefined,
      signature: input.signature || undefined,
      nonce: input.nonce || undefined,
      timestamp: input.timestamp || undefined,
      bodyText: input.bodyText,
    },
    create: {
      orderId: input.orderId || undefined,
      paymentAttemptId: input.paymentAttemptId || undefined,
      status: input.status || PaymentWebhookStatus.received,
      eventType: input.eventType || undefined,
      dedupeKey: input.dedupeKey,
      serial: input.serial || undefined,
      signature: input.signature || undefined,
      nonce: input.nonce || undefined,
      timestamp: input.timestamp || undefined,
      bodyText: input.bodyText,
    },
  })
}

export async function fulfillPaidOrder(input: {
  orderNumber: string
  gatewayTransactionId?: string | null
}) {
  return prisma.$transaction(async tx => {
    const paymentAttempt = await tx.paymentAttempt.findUnique({
      where: { merchantTradeNumber: input.orderNumber },
      include: {
        order: {
          include: {
            couponApplication: true,
          },
        },
      },
    })

    if (!paymentAttempt) {
      throw new CommerceError('支付单不存在', 404)
    }

    if (paymentAttempt.order.fulfilledAt) {
      return paymentAttempt.order
    }

    const paidAt = new Date()

    await tx.paymentAttempt.update({
      where: { id: paymentAttempt.id },
      data: {
        status: PaymentStatus.succeeded,
        gatewayTransactionId: input.gatewayTransactionId || undefined,
        paidAt,
      },
    })

    await tx.commerceOrder.update({
      where: { id: paymentAttempt.order.id },
      data: {
        status: CommerceOrderStatus.paid,
        paidAt,
      },
    })

    const entitlement = await extendMembershipFromPurchase(tx, {
      userId: paymentAttempt.order.userId,
      membershipPlan: paymentAttempt.order.membershipPlanSnapshot,
      durationDays: paymentAttempt.order.durationDaysSnapshot,
      sourceType: 'purchase',
      sourceReference: paymentAttempt.order.orderNumber,
      orderId: paymentAttempt.order.id,
      note: `微信支付订单 ${paymentAttempt.order.orderNumber}`,
    })

    await tx.commerceOrder.update({
      where: { id: paymentAttempt.order.id },
      data: {
        status: CommerceOrderStatus.fulfilled,
        fulfilledAt: new Date(),
      },
    })

    if (paymentAttempt.order.couponApplication) {
      await tx.couponRedemption.updateMany({
        where: {
          orderId: paymentAttempt.order.id,
          status: CouponRedemptionStatus.reserved,
        },
        data: {
          status: CouponRedemptionStatus.consumed,
          consumedAt: new Date(),
        },
      })
    }

    return {
      ...paymentAttempt.order,
      membershipPlan: entitlement.membershipPlan,
      membershipExpiresAt: entitlement.membershipExpiresAt,
    }
  })
}
