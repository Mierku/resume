import { VipPackageStatus, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const adminPackageSelect = {
  id: true,
  code: true,
  name: true,
  subtitle: true,
  description: true,
  membershipPlan: true,
  durationDays: true,
  priceFen: true,
  compareAtPriceFen: true,
  status: true,
  isFeatured: true,
  badge: true,
  note: true,
  featureList: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VipPackageSelect

export async function listActiveVipPackages() {
  try {
    return await prisma.vipPackage.findMany({
      where: { status: VipPackageStatus.active },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: adminPackageSelect,
    })
  } catch (error) {
    if (isMissingCommerceTableError(error)) {
      return []
    }
    throw error
  }
}

export async function listAdminVipPackages() {
  try {
    return await prisma.vipPackage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: adminPackageSelect,
    })
  } catch (error) {
    if (isMissingCommerceTableError(error)) {
      return []
    }
    throw error
  }
}

export async function getVipPackageById(id: string) {
  return prisma.vipPackage.findUnique({
    where: { id },
    select: adminPackageSelect,
  })
}

export async function getVipPackageByCode(code: string) {
  return prisma.vipPackage.findUnique({
    where: { code },
    select: adminPackageSelect,
  })
}

interface UpsertVipPackageInput {
  code: string
  name: string
  subtitle?: string | null
  description?: string | null
  membershipPlan: 'basic' | 'pro' | 'elite'
  durationDays: number
  priceFen: number
  compareAtPriceFen?: number | null
  status: VipPackageStatus
  isFeatured?: boolean
  badge?: string | null
  note?: string | null
  featureList?: unknown
  sortOrder?: number
}

export async function createVipPackage(input: UpsertVipPackageInput) {
  return prisma.vipPackage.create({
    data: {
      ...input,
      featureList: input.featureList as Prisma.InputJsonValue | undefined,
    },
    select: adminPackageSelect,
  })
}

export async function seedDefaultVipPackages() {
  const defaults: UpsertVipPackageInput[] = [
    {
      code: 'pro-30d',
      name: 'Pro 月卡',
      subtitle: '适合高频投递与批量优化阶段',
      membershipPlan: 'pro',
      durationDays: 30,
      priceFen: 2500,
      compareAtPriceFen: 2900,
      status: VipPackageStatus.active,
      isFeatured: true,
      badge: '推荐',
      note: '默认月卡方案',
      featureList: [
        '全部核心功能可用',
        '简历保存与导出不限量',
        'AI 使用暂不限量',
      ],
      sortOrder: 10,
    },
    {
      code: 'elite-90d',
      name: '畅享季卡',
      subtitle: '适合长期连续使用',
      membershipPlan: 'elite',
      durationDays: 90,
      priceFen: 6800,
      compareAtPriceFen: 7500,
      status: VipPackageStatus.active,
      isFeatured: false,
      badge: '长效',
      note: '默认季卡方案',
      featureList: [
        '全部核心功能可用',
        '简历保存与导出不限量',
        'AI 使用暂不限量',
      ],
      sortOrder: 20,
    },
  ]

  const result = []

  for (const item of defaults) {
    const existing = await prisma.vipPackage.findUnique({
      where: { code: item.code },
      select: { id: true },
    })

    if (existing) {
      result.push(
        await prisma.vipPackage.update({
          where: { id: existing.id },
          data: {
            ...item,
            featureList: item.featureList as Prisma.InputJsonValue,
          },
          select: adminPackageSelect,
        }),
      )
      continue
    }

    result.push(await createVipPackage(item))
  }

  return result
}

export async function updateVipPackage(id: string, input: Partial<UpsertVipPackageInput>) {
  return prisma.vipPackage.update({
    where: { id },
    data: {
      ...input,
      featureList:
        input.featureList === undefined ? undefined : (input.featureList as Prisma.InputJsonValue),
    },
    select: adminPackageSelect,
  })
}

function isMissingCommerceTableError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2021'
  )
}
