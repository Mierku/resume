import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { isAdminRole } from '@/lib/user'
import { createVipPackage, listAdminVipPackages, seedDefaultVipPackages } from '@/server/commerce/packages'

const packageSchema = z.object({
  code: z.string().min(1, '套餐编码不能为空'),
  name: z.string().min(1, '套餐名称不能为空'),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  membershipPlan: z.enum(['basic', 'pro', 'elite']),
  durationDays: z.number().int().positive('时长必须大于 0'),
  priceFen: z.number().int().positive('价格必须大于 0'),
  compareAtPriceFen: z.number().int().positive().optional().nullable(),
  status: z.enum(['draft', 'active', 'disabled', 'archived']),
  isFeatured: z.boolean().optional(),
  badge: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  featureList: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    const packages = await listAdminVipPackages()
    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Failed to load admin vip packages:', error)
    return NextResponse.json({ error: '套餐加载失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    const payload = packageSchema.parse(await request.json())
    const vipPackage = await createVipPackage(payload)
    return NextResponse.json({ package: vipPackage }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || '参数错误' }, { status: 400 })
    }
    console.error('Failed to create vip package:', error)
    return NextResponse.json({ error: '套餐创建失败' }, { status: 500 })
  }
}

export async function PUT() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    const packages = await seedDefaultVipPackages()
    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Failed to seed default vip packages:', error)
    return NextResponse.json({ error: '默认套餐初始化失败' }, { status: 500 })
  }
}
