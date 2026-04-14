import { randomBytes } from 'crypto'
import type { Prisma, PrismaClient, User } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { normalizeAuthProviderIds } from '@/lib/auth-provider-labels'
import { redis } from '@/lib/redis'

export const EMAIL_BIND_PROVIDER = 'email_code'
export const WECHAT_BIND_PROVIDER = 'wechat_official'

const ACCOUNT_BIND_CONFLICT_PREFIX = 'account:bind:conflict:'
const ACCOUNT_BIND_CONFLICT_TTL_SECONDS = 10 * 60

const MEMBERSHIP_PLAN_PRIORITY = {
  basic: 0,
  pro: 1,
  elite: 2,
} as const

const ROLE_PRIORITY = {
  user: 0,
  admin: 1,
  super_admin: 2,
} as const

const DEV_TEST_EMAIL =
  process.env.NODE_ENV !== 'production'
    ? process.env.DEV_TEST_USER_EMAIL || 'dev@immersive.local'
    : null

export type BindingProvider = typeof EMAIL_BIND_PROVIDER | typeof WECHAT_BIND_PROVIDER
export type BindingConflictResolution = 'merge' | 'clear'

export interface BindingConflictUserSummary {
  userId: string
  displayName: string | null
  email: string | null
  role: 'user' | 'admin' | 'super_admin'
  membershipPlan: 'basic' | 'pro' | 'elite'
  membershipExpiresAt: string | null
  providers: string[]
  assetCounts: {
    records: number
    resumes: number
    dataSources: number
    aiConversations: number
    jobSites: number
    total: number
  }
}

interface BindingConflictPayload {
  token: string
  targetUserId: string
  sourceUserId: string
  provider: BindingProvider
  providerAccountId: string
  createdAt: string
}

export interface PrepareBindingResultBound {
  status: 'bound' | 'already_bound'
}

export interface PrepareBindingResultNeedsConfirmation {
  status: 'needs_confirmation'
  conflictToken: string
  otherUser: BindingConflictUserSummary
}

export type PrepareBindingResult =
  | PrepareBindingResultBound
  | PrepareBindingResultNeedsConfirmation

function getConflictRedisKey(token: string) {
  return `${ACCOUNT_BIND_CONFLICT_PREFIX}${token}`
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

async function getConflictUserSummary(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<BindingConflictUserSummary | null> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      membershipPlan: true,
      membershipExpiresAt: true,
      accounts: {
        select: {
          provider: true,
        },
      },
      _count: {
        select: {
          records: true,
          resumes: true,
          dataSources: true,
          aiConversations: true,
          jobSites: true,
        },
      },
    },
  })

  if (!user) {
    return null
  }

  const assetCounts = {
    records: user._count.records,
    resumes: user._count.resumes,
    dataSources: user._count.dataSources,
    aiConversations: user._count.aiConversations,
    jobSites: user._count.jobSites,
    total:
      user._count.records +
      user._count.resumes +
      user._count.dataSources +
      user._count.aiConversations +
      user._count.jobSites,
  }

  return {
    userId: user.id,
    displayName: user.name,
    email: user.email,
    role: user.role,
    membershipPlan: user.membershipPlan,
    membershipExpiresAt: toIsoString(user.membershipExpiresAt),
    providers: normalizeAuthProviderIds(
      user.accounts.map(account => account.provider),
      {
        currentEmail: user.email,
        devTestEmail: DEV_TEST_EMAIL,
      },
    ),
    assetCounts,
  }
}

async function saveConflictPayload(payload: BindingConflictPayload) {
  await redis.set(
    getConflictRedisKey(payload.token),
    JSON.stringify(payload),
    'EX',
    ACCOUNT_BIND_CONFLICT_TTL_SECONDS,
  )
}

async function readConflictPayload(token: string) {
  const raw = await redis.get(getConflictRedisKey(token))
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as BindingConflictPayload
  } catch {
    await redis.del(getConflictRedisKey(token))
    return null
  }
}

async function consumeConflictPayload(token: string) {
  const payload = await readConflictPayload(token)
  if (payload) {
    await redis.del(getConflictRedisKey(token))
  }
  return payload
}

function getPreferredRole(targetRole: User['role'], sourceRole: User['role']) {
  return ROLE_PRIORITY[sourceRole] > ROLE_PRIORITY[targetRole] ? sourceRole : targetRole
}

function getPreferredMembershipPlan(
  targetPlan: User['membershipPlan'],
  sourcePlan: User['membershipPlan'],
  targetExpiresAt: Date | null,
  sourceExpiresAt: Date | null,
) {
  const sourceIsPerpetual = sourceExpiresAt == null
  const targetIsPerpetual = targetExpiresAt == null
  const sourceIsActive = sourceIsPerpetual || sourceExpiresAt.getTime() > Date.now()
  const targetIsActive = targetIsPerpetual || targetExpiresAt.getTime() > Date.now()

  if (sourceIsActive && !targetIsActive) {
    return {
      membershipPlan: sourcePlan,
      membershipExpiresAt: sourceExpiresAt,
    }
  }

  if (targetIsActive && !sourceIsActive) {
    return {
      membershipPlan: targetPlan,
      membershipExpiresAt: targetExpiresAt,
    }
  }

  if (MEMBERSHIP_PLAN_PRIORITY[sourcePlan] > MEMBERSHIP_PLAN_PRIORITY[targetPlan]) {
    return {
      membershipPlan: sourcePlan,
      membershipExpiresAt: sourceExpiresAt,
    }
  }

  if (MEMBERSHIP_PLAN_PRIORITY[sourcePlan] < MEMBERSHIP_PLAN_PRIORITY[targetPlan]) {
    return {
      membershipPlan: targetPlan,
      membershipExpiresAt: targetExpiresAt,
    }
  }

  if (targetIsPerpetual || sourceIsPerpetual) {
    return {
      membershipPlan: targetIsPerpetual ? targetPlan : sourcePlan,
      membershipExpiresAt: targetIsPerpetual ? targetExpiresAt : sourceExpiresAt,
    }
  }

  if ((sourceExpiresAt?.getTime() || 0) > (targetExpiresAt?.getTime() || 0)) {
    return {
      membershipPlan: sourcePlan,
      membershipExpiresAt: sourceExpiresAt,
    }
  }

  return {
    membershipPlan: targetPlan,
    membershipExpiresAt: targetExpiresAt,
  }
}

async function mergeUniqueRecordsByUrl(
  tx: Prisma.TransactionClient,
  sourceUserId: string,
  targetUserId: string,
) {
  const sourceRecords = await tx.record.findMany({
    where: { userId: sourceUserId },
    select: { id: true, url: true },
  })

  if (sourceRecords.length === 0) {
    return
  }

  const targetRecords = await tx.record.findMany({
    where: {
      userId: targetUserId,
      url: {
        in: sourceRecords.map(record => record.url),
      },
    },
    select: { url: true },
  })

  const duplicateUrls = new Set(targetRecords.map(record => record.url))
  const duplicateIds = sourceRecords
    .filter(record => duplicateUrls.has(record.url))
    .map(record => record.id)

  if (duplicateIds.length > 0) {
    await tx.record.deleteMany({
      where: {
        id: {
          in: duplicateIds,
        },
      },
    })
  }

  await tx.record.updateMany({
    where: {
      userId: sourceUserId,
    },
    data: {
      userId: targetUserId,
    },
  })
}

async function mergeLegalConsents(
  tx: Prisma.TransactionClient,
  sourceUserId: string,
  targetUserId: string,
) {
  const sourceConsents = await tx.legalConsent.findMany({
    where: { userId: sourceUserId },
    select: {
      id: true,
      termsVersion: true,
      privacyVersion: true,
    },
  })

  if (sourceConsents.length === 0) {
    return
  }

  const duplicateTargets = await tx.legalConsent.findMany({
    where: {
      userId: targetUserId,
      OR: sourceConsents.map(consent => ({
        termsVersion: consent.termsVersion,
        privacyVersion: consent.privacyVersion,
      })),
    },
    select: {
      termsVersion: true,
      privacyVersion: true,
    },
  })

  const duplicateKeys = new Set(
    duplicateTargets.map(consent => `${consent.termsVersion}::${consent.privacyVersion}`),
  )
  const duplicateIds = sourceConsents
    .filter(consent => duplicateKeys.has(`${consent.termsVersion}::${consent.privacyVersion}`))
    .map(consent => consent.id)

  if (duplicateIds.length > 0) {
    await tx.legalConsent.deleteMany({
      where: {
        id: {
          in: duplicateIds,
        },
      },
    })
  }

  await tx.legalConsent.updateMany({
    where: {
      userId: sourceUserId,
    },
    data: {
      userId: targetUserId,
    },
  })
}

async function deleteProductAssets(tx: Prisma.TransactionClient, userId: string) {
  await Promise.all([
    tx.aiConversation.deleteMany({ where: { userId } }),
    tx.resume.deleteMany({ where: { userId } }),
    tx.dataSource.deleteMany({ where: { userId } }),
    tx.record.deleteMany({ where: { userId } }),
    tx.jobSite.deleteMany({ where: { userId } }),
  ])

  await tx.user.update({
    where: { id: userId },
    data: {
      defaultDataSourceId: null,
    },
  })
}

async function moveAllAccounts(
  tx: Prisma.TransactionClient,
  sourceUserId: string,
  targetUserId: string,
) {
  await tx.account.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

async function moveSpecificProviderAccount(
  tx: Prisma.TransactionClient,
  sourceUserId: string,
  targetUserId: string,
  provider: BindingProvider,
  providerAccountId: string,
) {
  await tx.account.updateMany({
    where: {
      userId: sourceUserId,
      provider,
      providerAccountId,
    },
    data: {
      userId: targetUserId,
    },
  })
}

async function deleteOrphanedSourceUserIfNeeded(
  tx: Prisma.TransactionClient,
  sourceUserId: string,
  targetUserId: string,
  options: {
    shouldTransferEntitlements: boolean
  },
) {
  const sourceUser = await tx.user.findUnique({
    where: { id: sourceUserId },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      membershipPlan: true,
      membershipExpiresAt: true,
      defaultDataSourceId: true,
      _count: {
        select: {
          accounts: true,
          dataSources: true,
          resumes: true,
          records: true,
          aiConversations: true,
          jobSites: true,
          legalConsents: true,
        },
      },
    },
  })

  if (!sourceUser) {
    return
  }

  const isOrphaned =
    sourceUser._count.accounts === 0 &&
    sourceUser._count.dataSources === 0 &&
    sourceUser._count.resumes === 0 &&
    sourceUser._count.records === 0 &&
    sourceUser._count.aiConversations === 0 &&
    sourceUser._count.jobSites === 0

  if (!isOrphaned) {
    return
  }

  if (options.shouldTransferEntitlements) {
    const targetUser = await tx.user.findUnique({
      where: { id: targetUserId },
      select: {
        name: true,
        image: true,
        role: true,
        membershipPlan: true,
        membershipExpiresAt: true,
        defaultDataSourceId: true,
      },
    })

    if (targetUser) {
      const preferredMembership = getPreferredMembershipPlan(
        targetUser.membershipPlan,
        sourceUser.membershipPlan,
        targetUser.membershipExpiresAt,
        sourceUser.membershipExpiresAt,
      )

      await tx.user.update({
        where: { id: targetUserId },
        data: {
          name: targetUser.name || sourceUser.name || undefined,
          image: targetUser.image || sourceUser.image || undefined,
          role: getPreferredRole(targetUser.role, sourceUser.role),
          membershipPlan: preferredMembership.membershipPlan,
          membershipExpiresAt: preferredMembership.membershipExpiresAt,
        },
      })
    }
  }

  await tx.session.deleteMany({
    where: { userId: sourceUserId },
  })

  await tx.user.delete({
    where: { id: sourceUserId },
  })
}

async function finalizeDirectEmailBinding(
  tx: Prisma.TransactionClient,
  targetUserId: string,
  normalizedEmail: string,
) {
  await tx.account.create({
    data: {
      userId: targetUserId,
      type: 'email',
      provider: EMAIL_BIND_PROVIDER,
      providerAccountId: normalizedEmail,
    },
  })

  await tx.user.update({
    where: { id: targetUserId },
    data: {
      email: normalizedEmail,
      emailVerified: new Date(),
    },
  })
}

async function finalizeDirectWechatBinding(
  tx: Prisma.TransactionClient,
  targetUserId: string,
  openId: string,
  profile: {
    displayName: string | null
    avatarUrl: string | null
  },
) {
  await tx.account.create({
    data: {
      userId: targetUserId,
      type: 'oauth',
      provider: WECHAT_BIND_PROVIDER,
      providerAccountId: openId,
    },
  })

  const targetUser = await tx.user.findUnique({
    where: { id: targetUserId },
    select: {
      name: true,
      image: true,
    },
  })

  if (targetUser) {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        name: targetUser.name || profile.displayName || undefined,
        image: targetUser.image || profile.avatarUrl || undefined,
      },
    })
  }
}

export async function prepareEmailBinding(
  targetUserId: string,
  normalizedEmail: string,
): Promise<PrepareBindingResult> {
  return prisma.$transaction(async tx => {
    const targetProviderAccount = await tx.account.findFirst({
      where: {
        userId: targetUserId,
        provider: EMAIL_BIND_PROVIDER,
      },
      select: {
        id: true,
        providerAccountId: true,
      },
    })

    if (targetProviderAccount) {
      if (targetProviderAccount.providerAccountId === normalizedEmail) {
        await tx.user.update({
          where: { id: targetUserId },
          data: {
            email: normalizedEmail,
            emailVerified: new Date(),
          },
        })

        return {
          status: 'already_bound',
        }
      }

      throw new Error('当前账号已绑定邮箱，如需更换请先处理现有绑定')
    }

    const existingProviderAccount = await tx.account.findFirst({
      where: {
        provider: EMAIL_BIND_PROVIDER,
        providerAccountId: normalizedEmail,
      },
      select: {
        userId: true,
      },
    })

    if (!existingProviderAccount) {
      await finalizeDirectEmailBinding(tx, targetUserId, normalizedEmail)
      return {
        status: 'bound',
      }
    }

    if (existingProviderAccount.userId === targetUserId) {
      await tx.user.update({
        where: { id: targetUserId },
        data: {
          email: normalizedEmail,
          emailVerified: new Date(),
        },
      })

      return {
        status: 'already_bound',
      }
    }

    const otherUser = await getConflictUserSummary(tx, existingProviderAccount.userId)
    if (!otherUser) {
      throw new Error('目标邮箱关联账号不存在，请稍后重试')
    }

    const token = randomBytes(24).toString('hex')
    await saveConflictPayload({
      token,
      targetUserId,
      sourceUserId: existingProviderAccount.userId,
      provider: EMAIL_BIND_PROVIDER,
      providerAccountId: normalizedEmail,
      createdAt: new Date().toISOString(),
    })

    return {
      status: 'needs_confirmation',
      conflictToken: token,
      otherUser,
    }
  })
}

export async function prepareWechatBinding(
  targetUserId: string,
  openId: string,
  profile: {
    displayName: string | null
    avatarUrl: string | null
  },
): Promise<PrepareBindingResult> {
  return prisma.$transaction(async tx => {
    const targetProviderAccount = await tx.account.findFirst({
      where: {
        userId: targetUserId,
        provider: WECHAT_BIND_PROVIDER,
      },
      select: {
        id: true,
        providerAccountId: true,
      },
    })

    if (targetProviderAccount) {
      if (targetProviderAccount.providerAccountId === openId) {
        const targetUser = await tx.user.findUnique({
          where: { id: targetUserId },
          select: {
            name: true,
            image: true,
          },
        })

        if (targetUser) {
          await tx.user.update({
            where: { id: targetUserId },
            data: {
              name: targetUser.name || profile.displayName || undefined,
              image: targetUser.image || profile.avatarUrl || undefined,
            },
          })
        }

        return {
          status: 'already_bound',
        }
      }

      throw new Error('当前账号已绑定微信，如需更换请先处理现有绑定')
    }

    const existingProviderAccount = await tx.account.findFirst({
      where: {
        provider: WECHAT_BIND_PROVIDER,
        providerAccountId: openId,
      },
      select: {
        userId: true,
      },
    })

    if (!existingProviderAccount) {
      await finalizeDirectWechatBinding(tx, targetUserId, openId, profile)
      return {
        status: 'bound',
      }
    }

    if (existingProviderAccount.userId === targetUserId) {
      return {
        status: 'already_bound',
      }
    }

    const otherUser = await getConflictUserSummary(tx, existingProviderAccount.userId)
    if (!otherUser) {
      throw new Error('目标微信关联账号不存在，请稍后重试')
    }

    const token = randomBytes(24).toString('hex')
    await saveConflictPayload({
      token,
      targetUserId,
      sourceUserId: existingProviderAccount.userId,
      provider: WECHAT_BIND_PROVIDER,
      providerAccountId: openId,
      createdAt: new Date().toISOString(),
    })

    return {
      status: 'needs_confirmation',
      conflictToken: token,
      otherUser,
    }
  })
}

export async function confirmBindingConflict(
  targetUserId: string,
  conflictToken: string,
  resolution: BindingConflictResolution,
) {
  const payload = await consumeConflictPayload(conflictToken)
  if (!payload) {
    throw new Error('绑定确认已过期，请重新验证')
  }

  if (payload.targetUserId !== targetUserId) {
    throw new Error('绑定确认与当前账号不匹配')
  }

  return prisma.$transaction(async tx => {
    const [targetUser, sourceUser] = await Promise.all([
      tx.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          defaultDataSourceId: true,
        },
      }),
      tx.user.findUnique({
        where: { id: payload.sourceUserId },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          defaultDataSourceId: true,
        },
      }),
    ])

    if (!targetUser || !sourceUser) {
      throw new Error('账号信息不存在，请刷新后重试')
    }

    const sourceProviderAccount = await tx.account.findFirst({
      where: {
        userId: sourceUser.id,
        provider: payload.provider,
        providerAccountId: payload.providerAccountId,
      },
      select: {
        id: true,
      },
    })

    if (!sourceProviderAccount) {
      throw new Error('待绑定账号关系已变化，请重新发起绑定')
    }

    if (resolution === 'merge') {
      await mergeUniqueRecordsByUrl(tx, sourceUser.id, targetUser.id)
      await mergeLegalConsents(tx, sourceUser.id, targetUser.id)

      await Promise.all([
        tx.aiConversation.updateMany({
          where: { userId: sourceUser.id },
          data: { userId: targetUser.id },
        }),
        tx.resume.updateMany({
          where: { userId: sourceUser.id },
          data: { userId: targetUser.id },
        }),
        tx.dataSource.updateMany({
          where: { userId: sourceUser.id },
          data: { userId: targetUser.id },
        }),
        tx.jobSite.updateMany({
          where: { userId: sourceUser.id },
          data: { userId: targetUser.id },
        }),
      ])

      if (!targetUser.defaultDataSourceId && sourceUser.defaultDataSourceId) {
        await tx.user.update({
          where: { id: targetUser.id },
          data: {
            defaultDataSourceId: sourceUser.defaultDataSourceId,
          },
        })
      }

      await moveAllAccounts(tx, sourceUser.id, targetUser.id)
      await tx.session.deleteMany({
        where: { userId: sourceUser.id },
      })

      if (payload.provider === EMAIL_BIND_PROVIDER) {
        await tx.user.update({
          where: { id: targetUser.id },
          data: {
            email: payload.providerAccountId,
            emailVerified: new Date(),
          },
        })
      }

      await deleteOrphanedSourceUserIfNeeded(tx, sourceUser.id, targetUser.id, {
        shouldTransferEntitlements: true,
      })

      return {
        status: 'bound' as const,
        resolution,
      }
    }

    await deleteProductAssets(tx, sourceUser.id)
    await moveSpecificProviderAccount(
      tx,
      sourceUser.id,
      targetUser.id,
      payload.provider,
      payload.providerAccountId,
    )

    if (payload.provider === EMAIL_BIND_PROVIDER) {
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          email: payload.providerAccountId,
          emailVerified: new Date(),
        },
      })
    }

    await deleteOrphanedSourceUserIfNeeded(tx, sourceUser.id, targetUser.id, {
      shouldTransferEntitlements: true,
    })

    return {
      status: 'bound' as const,
      resolution,
    }
  })
}

export async function getBoundProviderStatus(userId: string, provider: BindingProvider) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider,
    },
    select: {
      id: true,
      providerAccountId: true,
    },
  })

  return account
}
