import { NextResponse } from 'next/server'
import { normalizeAuthProviderIds } from '@/lib/auth-provider-labels'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { DEFAULT_USER_AVATAR_URL, isAdminRole } from '@/lib/user'
import { getVipSnapshot, resolvePlanExpiresAt, resolvePlanType } from '@/lib/vip'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: { provider: true },
    })
    const devTestEmail =
      process.env.NODE_ENV !== 'production'
        ? process.env.DEV_TEST_USER_EMAIL || 'dev@immersive.local'
        : null
    const providers = normalizeAuthProviderIds(
      accounts.map(account => account.provider),
      {
        currentEmail: user.email,
        devTestEmail,
      },
    )

    const userRecord = user as unknown as Record<string, unknown>
    const role = user.role === 'admin' || user.role === 'super_admin' ? user.role : 'user'
    const rawPlan =
      user.membershipPlan ??
      userRecord.planType ??
      userRecord.planTier ??
      userRecord.subscriptionPlan ??
      userRecord.membershipPlan ??
      null

    const rawPlanExpiresAt =
      user.membershipExpiresAt ??
      userRecord.planExpiresAt ??
      userRecord.planExpireAt ??
      userRecord.membershipExpiresAt ??
      userRecord.subscriptionExpiresAt ??
      null

    const vipSnapshot = getVipSnapshot({
      membershipPlan: typeof rawPlan === 'string' ? rawPlan : user.membershipPlan,
      membershipExpiresAt: rawPlanExpiresAt instanceof Date || typeof rawPlanExpiresAt === 'string' ? rawPlanExpiresAt : null,
      role,
    })
    const planType = resolvePlanType(vipSnapshot)
    const planExpiresAt = resolvePlanExpiresAt(vipSnapshot)

    const avatarUrl = typeof user.image === 'string' && user.image.trim()
      ? user.image
      : DEFAULT_USER_AVATAR_URL

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.name,
        avatarUrl,
        onboardingCompleted: user.onboardingCompleted,
        providers,
        role,
        isAdmin: isAdminRole(role),
        planType,
        planExpiresAt,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    )
  }
}
