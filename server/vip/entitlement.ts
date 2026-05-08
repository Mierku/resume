import type { MembershipPlan, Prisma, UserRole } from '@prisma/client'
import { getVipSnapshot } from '@/lib/vip'

interface ExtendMembershipInput {
  userId: string
  membershipPlan: MembershipPlan
  durationDays: number
  sourceType: 'purchase' | 'merge' | 'manual'
  sourceReference: string
  orderId?: string
  note?: string
}

interface MergeMembershipInput {
  target: {
    membershipPlan: MembershipPlan
    membershipExpiresAt: Date | null
    role: UserRole
  }
  source: {
    membershipPlan: MembershipPlan
    membershipExpiresAt: Date | null
    role: UserRole
  }
}

export function resolveMergedMembership(input: MergeMembershipInput) {
  const target = getVipSnapshot(input.target)
  const source = getVipSnapshot(input.source)

  if (target.isAdminBypass || source.isAdminBypass) {
    return target.membershipPlan === 'elite' || target.membershipPlan === 'pro'
      ? {
          membershipPlan: target.membershipPlan,
          membershipExpiresAt: target.membershipExpiresAt,
        }
      : {
          membershipPlan: source.membershipPlan,
          membershipExpiresAt: source.membershipExpiresAt,
        }
  }

  if (source.isActive && !target.isActive) {
    return {
      membershipPlan: source.membershipPlan,
      membershipExpiresAt: source.membershipExpiresAt,
    }
  }

  if (target.isActive && !source.isActive) {
    return {
      membershipPlan: target.membershipPlan,
      membershipExpiresAt: target.membershipExpiresAt,
    }
  }

  const priority = (plan: MembershipPlan) => (plan === 'elite' ? 2 : plan === 'pro' ? 1 : 0)

  if (priority(source.membershipPlan) > priority(target.membershipPlan)) {
    return {
      membershipPlan: source.membershipPlan,
      membershipExpiresAt: source.membershipExpiresAt,
    }
  }

  if (priority(target.membershipPlan) > priority(source.membershipPlan)) {
    return {
      membershipPlan: target.membershipPlan,
      membershipExpiresAt: target.membershipExpiresAt,
    }
  }

  if (target.membershipExpiresAt == null || source.membershipExpiresAt == null) {
    return target.membershipExpiresAt == null
      ? {
          membershipPlan: target.membershipPlan,
          membershipExpiresAt: target.membershipExpiresAt,
        }
      : {
          membershipPlan: source.membershipPlan,
          membershipExpiresAt: source.membershipExpiresAt,
        }
  }

  return source.membershipExpiresAt.getTime() > target.membershipExpiresAt.getTime()
    ? {
        membershipPlan: source.membershipPlan,
        membershipExpiresAt: source.membershipExpiresAt,
      }
    : {
        membershipPlan: target.membershipPlan,
        membershipExpiresAt: target.membershipExpiresAt,
      }
}

export async function extendMembershipFromPurchase(
  tx: Prisma.TransactionClient,
  input: ExtendMembershipInput,
) {
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: {
      membershipPlan: true,
      membershipExpiresAt: true,
    },
  })

  if (!user) {
    throw new Error('User not found for entitlement extension')
  }

  const now = new Date()
  const baseline =
    user.membershipExpiresAt && user.membershipExpiresAt.getTime() > now.getTime()
      ? user.membershipExpiresAt
      : now
  const nextExpiresAt = new Date(baseline.getTime() + input.durationDays * 24 * 60 * 60 * 1000)

  await tx.user.update({
    where: { id: input.userId },
    data: {
      membershipPlan: input.membershipPlan,
      membershipExpiresAt: nextExpiresAt,
    },
  })

  await tx.entitlementGrant.upsert({
    where: {
      sourceType_sourceReference: {
        sourceType: input.sourceType,
        sourceReference: input.sourceReference,
      },
    },
    update: {
      membershipPlan: input.membershipPlan,
      startsAt: baseline,
      endsAt: nextExpiresAt,
      grantedDays: input.durationDays,
      note: input.note,
      orderId: input.orderId,
    },
    create: {
      userId: input.userId,
      orderId: input.orderId,
      sourceType: input.sourceType,
      sourceReference: input.sourceReference,
      membershipPlan: input.membershipPlan,
      startsAt: baseline,
      endsAt: nextExpiresAt,
      grantedDays: input.durationDays,
      note: input.note,
    },
  })

  return {
    membershipPlan: input.membershipPlan,
    membershipExpiresAt: nextExpiresAt,
  }
}
