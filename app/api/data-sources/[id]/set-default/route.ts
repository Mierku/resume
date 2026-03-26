import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { setDefaultDataSource } from '@/server/dataSources'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    await setDefaultDataSource(id, user.id)
    return NextResponse.json({ message: '已设为默认' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Data source not found') {
      return NextResponse.json({ error: '数据源不存在' }, { status: 404 })
    }
    console.error('Set default error:', error)
    return NextResponse.json({ error: '设置失败' }, { status: 500 })
  }
}
