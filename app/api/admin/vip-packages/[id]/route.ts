import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { isAdminRole } from '@/lib/user'
import { getVipPackageById, updateVipPackage } from '@/server/commerce/packages'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const packageUpdateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  membershipPlan: z.enum(['basic', 'pro', 'elite']).optional(),
  durationDays: z.number().int().positive().optional(),
  priceFen: z.number().int().positive().optional(),
  compareAtPriceFen: z.number().int().positive().optional().nullable(),
  status: z.enum(['draft', 'active', 'disabled', 'archived']).optional(),
  isFeatured: z.boolean().optional(),
  badge: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  featureList: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    const { id } = await context.params
    const vipPackage = await getVipPackageById(id)
    if (!vipPackage) {
      return NextResponse.json({ error: '套餐不存在' }, { status: 404 })
    }
    return NextResponse.json({ package: vipPackage })
  } catch (error) {
    console.error('Failed to load vip package:', error)
    return NextResponse.json({ error: '套餐加载失败' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    const { id } = await context.params
    const payload = packageUpdateSchema.parse(await request.json())
    const vipPackage = await updateVipPackage(id, payload)
    return NextResponse.json({ package: vipPackage })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || '参数错误' }, { status: 400 })
    }
    console.error('Failed to update vip package:', error)
    return NextResponse.json({ error: '套餐更新失败' }, { status: 500 })
  }
}
