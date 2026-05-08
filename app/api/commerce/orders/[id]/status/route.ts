import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await context.params
    const order = await prisma.commerceOrder.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paidAt: true,
        fulfilledAt: true,
        manualReviewReason: true,
        qrCodeUrl: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Failed to get order status:', error)
    return NextResponse.json({ error: '订单状态获取失败' }, { status: 500 })
  }
}
