import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { isAdminRole } from '@/lib/user'
import { getAdminUsersDashboardData } from '@/server/admin'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 })
    }

    const rawQuery = request.nextUrl.searchParams.get('q') || undefined
    const data = await getAdminUsersDashboardData(rawQuery)
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to load admin dashboard data:', error)
    return NextResponse.json({ error: '管理后台数据加载失败' }, { status: 500 })
  }
}
