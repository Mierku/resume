import { CouponStatus, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getVipSnapshot } from '@/lib/vip'
import { CommerceError } from '@/server/commerce/errors'
import type { CouponValidationResult } from '@/server/commerce/types'

const adminCouponSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  status: true,
  type: true,
  audience: true,
  stackingRule: true,
  channel: true,
  amountFen: true,
  percentOff: true,
  thresholdFen: true,
  startsAt: true,
  endsAt: true,
  maxRedemptions: true,
  perUserLimit: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  packages: {
    select: {
      vipPackageId: true,
    },
  },
} satisfies Prisma.CouponSelect

const checkoutCouponSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  status: true,
  type: true,
  audience: true,
  stackingRule: true,
  channel: true,
  amountFen: true,
  percentOff: true,
  thresholdFen: true,
  startsAt: true,
  endsAt: true,
  maxRedemptions: true,
  perUserLimit: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  packages: {
    select: {
      vipPackageId: true,
    },
  },
} satisfies Prisma.CouponSelect

export async function listAdminCoupons() {
  return prisma.coupon.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: adminCouponSelect,
  })
}

export async function getCouponById(id: string) {
  return prisma.coupon.findUnique({
    where: { id },
    select: adminCouponSelect,
  })
}

export async function getCouponByCode(code: string) {
  return prisma.coupon.findUnique({
    where: { code },
    select: adminCouponSelect,
  })
}

interface UpsertCouponInput {
  code: string
  name: string
  description?: string | null
  status: CouponStatus
  type: 'fixed_amount' | 'percentage' | 'threshold_discount'
  audience: 'all' | 'new_user' | 'existing_user' | 'active_vip' | 'inactive_vip'
  stackingRule: 'single_only' | 'future_stackable'
  channel?: string | null
  amountFen?: number | null
  percentOff?: number | null
  thresholdFen?: number | null
  startsAt?: Date | null
  endsAt?: Date | null
  maxRedemptions?: number | null
  perUserLimit?: number | null
  sortOrder?: number
  vipPackageIds?: string[]
}

export async function createCoupon(input: UpsertCouponInput) {
  const vipPackageIds = input.vipPackageIds || []

  return prisma.coupon.create({
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      status: input.status,
      type: input.type,
      audience: input.audience,
      stackingRule: input.stackingRule,
      channel: input.channel,
      amountFen: input.amountFen,
      percentOff: input.percentOff,
      thresholdFen: input.thresholdFen,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      maxRedemptions: input.maxRedemptions,
      perUserLimit: input.perUserLimit,
      sortOrder: input.sortOrder || 0,
      packages: {
        create: vipPackageIds.map(vipPackageId => ({ vipPackageId })),
      },
    },
    select: adminCouponSelect,
  })
}

export async function updateCoupon(id: string, input: Partial<UpsertCouponInput>) {
  const vipPackageIds = input.vipPackageIds

  return prisma.coupon.update({
    where: { id },
    data: {
      code: input.code,
      name: input.name,
      description: input.description,
      status: input.status,
      type: input.type,
      audience: input.audience,
      stackingRule: input.stackingRule,
      channel: input.channel,
      amountFen: input.amountFen,
      percentOff: input.percentOff,
      thresholdFen: input.thresholdFen,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      maxRedemptions: input.maxRedemptions,
      perUserLimit: input.perUserLimit,
      sortOrder: input.sortOrder,
      packages:
        vipPackageIds === undefined
          ? undefined
          : {
              deleteMany: {},
              create: vipPackageIds.map(vipPackageId => ({ vipPackageId })),
            },
    },
    select: adminCouponSelect,
  })
}

export async function validateCouponForCheckout(input: {
  code: string
  vipPackageId: string
  userId: string
  originalAmountFen: number
}) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: input.code },
    select: checkoutCouponSelect,
  })

  if (!coupon || coupon.status !== CouponStatus.active) {
    throw new CommerceError('优惠券不可用', 404)
  }

  const [user, totalRedemptions, userRedemptions, priorPaidOrders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        membershipPlan: true,
        membershipExpiresAt: true,
        role: true,
      },
    }),
    prisma.couponRedemption.count({
      where: {
        couponId: coupon.id,
        status: { in: ['reserved', 'consumed'] },
      },
    }),
    prisma.couponRedemption.count({
      where: {
        couponId: coupon.id,
        userId: input.userId,
        status: { in: ['reserved', 'consumed'] },
      },
    }),
    prisma.commerceOrder.count({
      where: {
        userId: input.userId,
        status: { in: ['paid', 'fulfilled'] },
      },
    }),
  ])

  if (coupon.maxRedemptions !== null && coupon.maxRedemptions !== undefined && totalRedemptions >= coupon.maxRedemptions) {
    throw new CommerceError('优惠券已领完')
  }

  if (coupon.perUserLimit !== null && coupon.perUserLimit !== undefined && userRedemptions >= coupon.perUserLimit) {
    throw new CommerceError('你已达到该优惠券使用上限')
  }

  const vipSnapshot = getVipSnapshot({
    membershipPlan: user?.membershipPlan,
    membershipExpiresAt: user?.membershipExpiresAt,
    role: user?.role,
  })
  const evaluation = evaluateCouponForCheckout({
    coupon,
    vipPackageId: input.vipPackageId,
    originalAmountFen: input.originalAmountFen,
    totalRedemptions,
    userRedemptions,
    priorPaidOrders,
    vipSnapshot,
  })

  if (!evaluation.ok) {
    throw new CommerceError(evaluation.error)
  }

  const result: CouponValidationResult = {
    coupon,
    discountAmountFen: evaluation.discountAmountFen,
  }

  return result
}

export async function listEligibleCouponsForCheckout(input: {
  vipPackageId: string
  userId: string
  originalAmountFen: number
}) {
  const [coupons, user, priorPaidOrders] = await Promise.all([
    prisma.coupon.findMany({
      where: {
        status: CouponStatus.active,
        OR: [
          { packages: { none: {} } },
          { packages: { some: { vipPackageId: input.vipPackageId } } },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: checkoutCouponSelect,
    }),
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        membershipPlan: true,
        membershipExpiresAt: true,
        role: true,
      },
    }),
    prisma.commerceOrder.count({
      where: {
        userId: input.userId,
        status: { in: ['paid', 'fulfilled'] },
      },
    }),
  ])

  const vipSnapshot = getVipSnapshot({
    membershipPlan: user?.membershipPlan,
    membershipExpiresAt: user?.membershipExpiresAt,
    role: user?.role,
  })

  const evaluated = await Promise.all(
    coupons.map(async coupon => {
      const [totalRedemptions, userRedemptions] = await Promise.all([
        prisma.couponRedemption.count({
          where: {
            couponId: coupon.id,
            status: { in: ['reserved', 'consumed'] },
          },
        }),
        prisma.couponRedemption.count({
          where: {
            couponId: coupon.id,
            userId: input.userId,
            status: { in: ['reserved', 'consumed'] },
          },
        }),
      ])

      const evaluation = evaluateCouponForCheckout({
        coupon,
        vipPackageId: input.vipPackageId,
        originalAmountFen: input.originalAmountFen,
        totalRedemptions,
        userRedemptions,
        priorPaidOrders,
        vipSnapshot,
      })

      if (!evaluation.ok) {
        return null
      }

      return {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        discountAmountFen: evaluation.discountAmountFen,
        payableAmountFen: Math.max(1, input.originalAmountFen - evaluation.discountAmountFen),
      }
    }),
  )

  return evaluated.filter(item => item !== null)
}

function evaluateCouponForCheckout(input: {
  coupon: Prisma.CouponGetPayload<{ select: typeof checkoutCouponSelect }>
  vipPackageId: string
  originalAmountFen: number
  totalRedemptions: number
  userRedemptions: number
  priorPaidOrders: number
  vipSnapshot: ReturnType<typeof getVipSnapshot>
}) {
  const { coupon } = input
  const now = Date.now()

  if (coupon.startsAt && coupon.startsAt.getTime() > now) {
    return { ok: false as const, error: '优惠券尚未生效' }
  }
  if (coupon.endsAt && coupon.endsAt.getTime() < now) {
    return { ok: false as const, error: '优惠券已过期' }
  }

  if (coupon.packages.length > 0 && !coupon.packages.some(item => item.vipPackageId === input.vipPackageId)) {
    return { ok: false as const, error: '优惠券不适用于当前套餐' }
  }

  if (coupon.maxRedemptions !== null && coupon.maxRedemptions !== undefined && input.totalRedemptions >= coupon.maxRedemptions) {
    return { ok: false as const, error: '优惠券已领完' }
  }

  if (coupon.perUserLimit !== null && coupon.perUserLimit !== undefined && input.userRedemptions >= coupon.perUserLimit) {
    return { ok: false as const, error: '你已达到该优惠券使用上限' }
  }

  if (coupon.audience === 'new_user' && input.priorPaidOrders > 0) {
    return { ok: false as const, error: '该优惠券仅限新用户' }
  }
  if (coupon.audience === 'existing_user' && input.priorPaidOrders === 0) {
    return { ok: false as const, error: '该优惠券仅限老用户' }
  }
  if (coupon.audience === 'active_vip' && !input.vipSnapshot.isActive) {
    return { ok: false as const, error: '该优惠券仅限会员使用' }
  }
  if (coupon.audience === 'inactive_vip' && input.vipSnapshot.isActive) {
    return { ok: false as const, error: '该优惠券不适用于当前会员状态' }
  }

  let discountAmountFen = 0
  if (coupon.type === 'fixed_amount') {
    discountAmountFen = Math.max(0, coupon.amountFen || 0)
  } else if (coupon.type === 'percentage') {
    discountAmountFen = Math.floor(input.originalAmountFen * ((coupon.percentOff || 0) / 100))
  } else {
    if ((coupon.thresholdFen || 0) > input.originalAmountFen) {
      return { ok: false as const, error: '未达到优惠券使用门槛' }
    }
    discountAmountFen = Math.max(0, coupon.amountFen || 0)
  }

  if (discountAmountFen <= 0) {
    return { ok: false as const, error: '优惠券折扣无效' }
  }

  return {
    ok: true as const,
    discountAmountFen: Math.min(discountAmountFen, input.originalAmountFen),
  }
}
