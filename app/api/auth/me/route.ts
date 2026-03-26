import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

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

    const userRecord = user as unknown as Record<string, unknown>
    const rawPlan =
      userRecord.planType ??
      userRecord.planTier ??
      userRecord.subscriptionPlan ??
      userRecord.membershipPlan ??
      null

    const normalizedPlan = typeof rawPlan === 'string' ? rawPlan.toLowerCase() : null
    const planType =
      normalizedPlan === 'pro' || normalizedPlan === 'elite' || normalizedPlan === 'basic'
        ? normalizedPlan
        : 'basic'

    const rawPlanExpiresAt =
      userRecord.planExpiresAt ??
      userRecord.planExpireAt ??
      userRecord.membershipExpiresAt ??
      userRecord.subscriptionExpiresAt ??
      null

    let planExpiresAt: string | null = null
    if (typeof rawPlanExpiresAt === 'string') {
      const parsed = new Date(rawPlanExpiresAt)
      if (!Number.isNaN(parsed.getTime())) {
        planExpiresAt = parsed.toISOString()
      }
    } else if (rawPlanExpiresAt instanceof Date && !Number.isNaN(rawPlanExpiresAt.getTime())) {
      planExpiresAt = rawPlanExpiresAt.toISOString()
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.name,
        avatarUrl: user.image,
        onboardingCompleted: user.onboardingCompleted,
        defaultDataSourceId: user.defaultDataSourceId,
        providers: accounts.map(account => account.provider),
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
