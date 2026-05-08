import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { isAdminRole } from '@/lib/user'
import { getCouponById, updateCoupon } from '@/server/commerce/coupons'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const couponUpdateSchema = z.object({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['draft', 'active', 'disabled', 'archived']).optional(),
  type: z.enum(['fixed_amount', 'percentage', 'threshold_discount']).optional(),
  audience: z.enum(['all', 'new_user', 'existing_user', 'active_vip', 'inactive_vip']).optional(),
  stackingRule: z.enum(['single_only', 'future_stackable']).optional(),
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
    const coupon = await getCouponById(id)
    if (!coupon) {
      return NextResponse.json({ error: '优惠券不存在' }, { status: 404 })
    }
    return NextResponse.json({ coupon })
  } catch (error) {
    console.error('Failed to load coupon:', error)
    return NextResponse.json({ error: '优惠券加载失败' }, { status: 500 })
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
    const payload = couponUpdateSchema.parse(await request.json())
    const coupon = await updateCoupon(id, {
      ...payload,
      startsAt: payload.startsAt === undefined ? undefined : payload.startsAt ? new Date(payload.startsAt) : null,
      endsAt: payload.endsAt === undefined ? undefined : payload.endsAt ? new Date(payload.endsAt) : null,
    })
    return NextResponse.json({ coupon })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || '参数错误' }, { status: 400 })
    }
    console.error('Failed to update coupon:', error)
    return NextResponse.json({ error: '优惠券更新失败' }, { status: 500 })
  }
}
