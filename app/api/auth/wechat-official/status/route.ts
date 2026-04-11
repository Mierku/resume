import { NextRequest, NextResponse } from 'next/server'
import { setAuthSessionCookie } from '@/lib/auth-session'
import { getWechatOfficialPollStatus } from '@/lib/wechat-official'

export async function GET(request: NextRequest) {
  const attemptId = request.nextUrl.searchParams.get('attemptId')?.trim()
  const pollToken = request.nextUrl.searchParams.get('pollToken')?.trim()

  if (!attemptId || !pollToken) {
    return NextResponse.json(
      { error: '缺少登录状态参数' },
      { status: 400 },
    )
  }

  try {
    const status = await getWechatOfficialPollStatus(attemptId, pollToken)

    if (status.status === 'invalid') {
      return NextResponse.json(
        { error: status.message || '登录状态校验失败' },
        { status: 403 },
      )
    }

    const response = NextResponse.json(
      {
        status: status.status,
        expiresAt: status.expiresAt,
        redirectTo: status.redirectTo,
        message: status.message,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )

    if (status.status === 'authenticated' && status.session) {
      setAuthSessionCookie(response, request, status.session)
    }

    return response
  } catch (error) {
    console.error('Poll WeChat Official Account login status failed:', error)
    return NextResponse.json(
      { error: '获取微信登录状态失败' },
      { status: 500 },
    )
  }
}
