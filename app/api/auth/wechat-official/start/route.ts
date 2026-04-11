import { NextRequest, NextResponse } from 'next/server'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import {
  createWechatOfficialLoginAttempt,
  isWechatOfficialLoginConfigured,
} from '@/lib/wechat-official'

export async function POST(request: NextRequest) {
  if (!isWechatOfficialLoginConfigured()) {
    return NextResponse.json(
      { error: '微信服务号登录尚未配置完成' },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => null)
  const nextPath = sanitizeNextPath(
    typeof body?.next === 'string' ? body.next : request.nextUrl.searchParams.get('next'),
  )

  try {
    const result = await createWechatOfficialLoginAttempt(nextPath)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Create WeChat Official Account login attempt failed:', error)
    return NextResponse.json(
      { error: '生成微信登录二维码失败，请稍后重试' },
      { status: 500 },
    )
  }
}
