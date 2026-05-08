import type { MembershipPlan, UserRole } from '@prisma/client'

export type VipCapability =
  | 'resume.unlimited'
  | 'resume.export'
  | 'resume.ai'
  | 'resume.storage.unlimited'

export interface VipSnapshot {
  membershipPlan: MembershipPlan
  membershipExpiresAt: Date | null
  role?: UserRole | null
  isPerpetual: boolean
  isActive: boolean
  isAdminBypass: boolean
}

const PAID_PLANS = new Set<MembershipPlan>(['pro', 'elite'])

export function isAdminRole(role: UserRole | string | null | undefined): role is UserRole {
  return role === 'admin' || role === 'super_admin'
}

export function getVipSnapshot(input: {
  membershipPlan?: MembershipPlan | string | null
  membershipExpiresAt?: Date | string | null
  role?: UserRole | string | null
}): VipSnapshot {
  const membershipPlan =
    input.membershipPlan === 'pro' || input.membershipPlan === 'elite'
      ? input.membershipPlan
      : 'basic'
  const membershipExpiresAt = normalizeDate(input.membershipExpiresAt)
  const isPerpetual = PAID_PLANS.has(membershipPlan) && membershipExpiresAt == null
  const isAdminBypass = isAdminRole(input.role)
  const isActive =
    isAdminBypass ||
    (PAID_PLANS.has(membershipPlan) &&
      (membershipExpiresAt == null || membershipExpiresAt.getTime() > Date.now()))

  return {
    membershipPlan,
    membershipExpiresAt,
    role: isAdminRole(input.role) ? input.role : input.role === 'user' ? 'user' : null,
    isPerpetual,
    isActive,
    isAdminBypass,
  }
}

export function hasVipCapability(snapshot: VipSnapshot, capability: VipCapability): boolean {
  void capability
  return snapshot.isAdminBypass || snapshot.isActive
}

export function isVipActive(snapshot: VipSnapshot): boolean {
  return snapshot.isActive
}

export function resolvePlanType(snapshot: VipSnapshot): MembershipPlan {
  return snapshot.isActive && PAID_PLANS.has(snapshot.membershipPlan)
    ? snapshot.membershipPlan
    : 'basic'
}

export function resolvePlanExpiresAt(snapshot: VipSnapshot): string | null {
  return snapshot.membershipExpiresAt ? snapshot.membershipExpiresAt.toISOString() : null
}

export function getResumeStorageLimitFromVip(snapshot: VipSnapshot): number | null {
  if (snapshot.isAdminBypass || snapshot.isActive) {
    return null
  }

  return 1
}

function normalizeDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
