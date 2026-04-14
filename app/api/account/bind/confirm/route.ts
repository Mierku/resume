import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { confirmBindingConflict } from '@/server/account-binding'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const conflictToken = typeof body?.conflictToken === 'string' ? body.conflictToken.trim() : ''
  const resolution = body?.clearOtherUserAssets ? 'clear' : 'merge'

  if (!conflictToken) {
    return NextResponse.json({ error: '缺少绑定确认信息' }, { status: 400 })
  }

  try {
    const result = await confirmBindingConflict(user.id, conflictToken, resolution)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Confirm account binding conflict failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '绑定确认失败，请稍后重试',
      },
      { status: 400 },
    )
  }
}
