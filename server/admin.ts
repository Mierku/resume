import { prisma } from '@/lib/prisma'
import { normalizeAuthProviderIds } from '@/lib/auth-provider-labels'
import type { Prisma } from '@prisma/client'

interface AdminUserSummary {
  totalUsers: number
  adminUsers: number
  activeMembers: number
  resumesTotal: number
  recordsTotal: number
  recentSignups: number
}

interface AdminUserUsageRow {
  id: string
  displayName: string | null
  email: string | null
  image: string | null
  role: 'user' | 'admin' | 'super_admin'
  membershipPlan: 'basic' | 'pro' | 'elite'
  membershipExpiresAt: string | null
  onboardingCompleted: boolean
  providers: string[]
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  metrics: {
    recordsTotal: number
    resumesTotal: number
    dataSourcesTotal: number
    aiConversationsTotal: number
    jobSitesTotal: number
    sessionsTotal: number
  }
}

interface AdminUsersDashboardData {
  query: string
  summary: AdminUserSummary
  users: AdminUserUsageRow[]
}

function buildUserSearchWhere(query: string): Prisma.UserWhereInput | undefined {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return undefined
  }

  return {
    OR: [
      { email: { contains: normalizedQuery, mode: 'insensitive' } },
      { name: { contains: normalizedQuery, mode: 'insensitive' } },
    ],
  }
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

const DEV_TEST_EMAIL =
  process.env.NODE_ENV !== 'production'
    ? process.env.DEV_TEST_USER_EMAIL || 'dev@immersive.local'
    : null

export async function getAdminUsersDashboardData(rawQuery: string | undefined): Promise<AdminUsersDashboardData> {
  const query = rawQuery?.trim() || ''
  const where = buildUserSearchWhere(query)
  const now = new Date()
  const activeMemberWhere: Prisma.UserWhereInput = {
    membershipPlan: { in: ['pro', 'elite'] },
    OR: [
      { membershipExpiresAt: null },
      { membershipExpiresAt: { gt: now } },
    ],
  }

  const [summaryCounts, users] = await Promise.all([
    Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          role: { in: ['admin', 'super_admin'] },
        },
      }),
      prisma.user.count({ where: activeMemberWhere }),
      prisma.resume.count(),
      prisma.record.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]),
    prisma.user.findMany({
      where,
      take: 100,
      orderBy: [
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        membershipPlan: true,
        membershipExpiresAt: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: {
            provider: true,
          },
        },
        sessions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            createdAt: true,
          },
        },
        _count: {
          select: {
            records: true,
            resumes: true,
            dataSources: true,
            aiConversations: true,
            jobSites: true,
            sessions: true,
          },
        },
      },
    }),
  ])

  const [
    totalUsers,
    adminUsers,
    activeMembers,
    resumesTotal,
    recordsTotal,
    recentSignups,
  ] = summaryCounts

  return {
    query,
    summary: {
      totalUsers,
      adminUsers,
      activeMembers,
      resumesTotal,
      recordsTotal,
      recentSignups,
    },
    users: users.map(user => ({
      id: user.id,
      displayName: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      membershipPlan: user.membershipPlan,
      membershipExpiresAt: toIsoString(user.membershipExpiresAt),
      onboardingCompleted: user.onboardingCompleted,
      providers: normalizeAuthProviderIds(
        user.accounts.map(account => account.provider),
        {
          currentEmail: user.email,
          devTestEmail: DEV_TEST_EMAIL,
        },
      ),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: toIsoString(user.sessions[0]?.createdAt),
      metrics: {
        recordsTotal: user._count.records,
        resumesTotal: user._count.resumes,
        dataSourcesTotal: user._count.dataSources,
        aiConversationsTotal: user._count.aiConversations,
        jobSitesTotal: user._count.jobSites,
        sessionsTotal: user._count.sessions,
      },
    })),
  }
}
