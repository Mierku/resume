import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { isAdminRole } from '@/lib/user'
import { listAdminOrders } from '@/server/commerce/orders'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    const orders = await listAdminOrders()
    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Failed to load admin orders:', error)
    return NextResponse.json({ error: '订单加载失败' }, { status: 500 })
  }
}
