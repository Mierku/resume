import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { getWechatOfficialBindingPollStatus } from '@/lib/wechat-official'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const attemptId = request.nextUrl.searchParams.get('attemptId')?.trim()
  const pollToken = request.nextUrl.searchParams.get('pollToken')?.trim()

  if (!attemptId || !pollToken) {
    return NextResponse.json(
      { error: '缺少绑定状态参数' },
      { status: 400 },
    )
  }

  try {
    const status = await getWechatOfficialBindingPollStatus(user.id, attemptId, pollToken)
    return NextResponse.json(status, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Poll WeChat binding status failed:', error)
    return NextResponse.json(
      { error: '获取微信绑定状态失败' },
      { status: 500 },
    )
  }
}
