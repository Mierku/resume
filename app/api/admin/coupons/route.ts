import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { isAdminRole } from '@/lib/user'
import { createCoupon, listAdminCoupons } from '@/server/commerce/coupons'

const couponSchema = z.object({
  code: z.string().min(1, '优惠码不能为空'),
  name: z.string().min(1, '优惠券名称不能为空'),
  description: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'disabled', 'archived']),
  type: z.enum(['fixed_amount', 'percentage', 'threshold_discount']),
  audience: z.enum(['all', 'new_user', 'existing_user', 'active_vip', 'inactive_vip']),
  stackingRule: z.enum(['single_only', 'future_stackable']),
  channel: z.string().optional().nullable(),
  amountFen: z.number().int().optional().nullable(),
  percentOff: z.number().int().min(0).max(100).optional().nullable(),
  thresholdFen: z.number().int().min(0).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  maxRedemptions: z.number().int().positive().optional().nullable(),
  perUserLimit: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
  vipPackageIds: z.array(z.string()).optional(),
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

    const coupons = await listAdminCoupons()
    return NextResponse.json({ coupons })
  } catch (error) {
    console.error('Failed to load coupons:', error)
    return NextResponse.json({ error: '优惠券加载失败' }, { status: 500 })
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

    const payload = couponSchema.parse(await request.json())
    const coupon = await createCoupon({
      ...payload,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
    })
    return NextResponse.json({ coupon }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || '参数错误' }, { status: 400 })
    }
    console.error('Failed to create coupon:', error)
    return NextResponse.json({ error: '优惠券创建失败' }, { status: 500 })
  }
}
