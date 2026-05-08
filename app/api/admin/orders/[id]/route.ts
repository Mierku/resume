import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { isAdminRole } from '@/lib/user'
import { isCommerceError } from '@/server/commerce/errors'
import { applyAdminOrderAction, getAdminOrderById } from '@/server/commerce/orders'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const orderActionSchema = z.object({
  action: z.enum(['close_unpaid', 'mark_manual_review']),
  reason: z.string().trim().optional(),
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
    const order = await getAdminOrderById(id)
    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }
    return NextResponse.json({ order })
  } catch (error) {
    console.error('Failed to load order:', error)
    return NextResponse.json({ error: '订单加载失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    const { id } = await context.params
    const payload = orderActionSchema.parse(await request.json())
    await applyAdminOrderAction({
      orderId: id,
      actorUserId: user.id,
      action: payload.action,
      reason: payload.reason,
    })

    const order = await getAdminOrderById(id)
    return NextResponse.json({ order })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || '参数错误' }, { status: 400 })
    }
    if (isCommerceError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to apply order action:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : '订单操作失败' }, { status: 500 })
  }
}
