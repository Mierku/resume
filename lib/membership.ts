import type { MembershipPlan } from '@prisma/client'
import { getVipSnapshot } from '@/lib/vip'

interface ResumeLimitSummary {
  planType: MembershipPlan
  max: number | null
  reached: boolean
  remaining: number | null
}

function normalizeMembershipPlan(rawPlan: MembershipPlan | string | null | undefined): MembershipPlan {
  const normalized = typeof rawPlan === 'string' ? rawPlan.toLowerCase() : 'basic'
  if (normalized === 'pro' || normalized === 'elite') {
    return normalized
  }

  return 'basic'
}

export function getResumeStorageLimit(
  rawPlan: MembershipPlan | string | null | undefined,
  membershipExpiresAt?: Date | string | null,
  role?: string | null,
): number | null {
  const snapshot = getVipSnapshot({
    membershipPlan: normalizeMembershipPlan(rawPlan),
    membershipExpiresAt,
    role,
  })

  if (snapshot.isAdminBypass || snapshot.isActive) {
    return null
  }

  return 1
}

export function buildResumeLimitSummary(
  rawPlan: MembershipPlan | string | null | undefined,
  membershipExpiresAt: Date | string | null | undefined,
  resumeCount: number,
  role?: string | null,
): ResumeLimitSummary {
  const planType = normalizeMembershipPlan(rawPlan)
  const max = getResumeStorageLimit(planType, membershipExpiresAt, role)

  return {
    planType,
    max,
    reached: max !== null && resumeCount >= max,
    remaining: max === null ? null : Math.max(max - resumeCount, 0),
  }
}
