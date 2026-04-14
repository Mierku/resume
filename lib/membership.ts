import type { MembershipPlan } from '@prisma/client'
import { isAdminRole } from '@/lib/user'

export interface ResumeLimitSummary {
  planType: MembershipPlan
  max: number | null
  reached: boolean
  remaining: number | null
}

export function normalizeMembershipPlan(rawPlan: MembershipPlan | string | null | undefined): MembershipPlan {
  const normalized = typeof rawPlan === 'string' ? rawPlan.toLowerCase() : 'basic'
  if (normalized === 'pro' || normalized === 'elite') {
    return normalized
  }

  return 'basic'
}

export function getResumeStorageLimit(
  rawPlan: MembershipPlan | string | null | undefined,
  role?: string | null,
): number | null {
  if (isAdminRole(role)) {
    return null
  }

  const planType = normalizeMembershipPlan(rawPlan)
  return planType === 'basic' ? 1 : null
}

export function buildResumeLimitSummary(
  rawPlan: MembershipPlan | string | null | undefined,
  resumeCount: number,
  role?: string | null,
): ResumeLimitSummary {
  const planType = normalizeMembershipPlan(rawPlan)
  const max = getResumeStorageLimit(planType, role)

  return {
    planType,
    max,
    reached: max !== null && resumeCount >= max,
    remaining: max === null ? null : Math.max(max - resumeCount, 0),
  }
}
