import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { getRecordStats } from '@/server/records'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const stats = await getRecordStats(user.id)
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Get record stats error:', error)
    return NextResponse.json({ error: '获取统计失败' }, { status: 500 })
  }
}
