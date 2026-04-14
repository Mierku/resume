import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import {
  WECHAT_BIND_PROVIDER,
  getBoundProviderStatus,
} from '@/server/account-binding'
import {
  createWechatOfficialBindingAttempt,
  isWechatOfficialLoginConfigured,
} from '@/lib/wechat-official'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  if (!isWechatOfficialLoginConfigured()) {
    return NextResponse.json(
      { error: '微信服务号登录尚未配置完成' },
      { status: 503 },
    )
  }

  const existingBinding = await getBoundProviderStatus(user.id, WECHAT_BIND_PROVIDER)
  if (existingBinding) {
    return NextResponse.json(
      { error: '当前账号已绑定微信' },
      { status: 409 },
    )
  }

  try {
    const result = await createWechatOfficialBindingAttempt(user.id)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Create WeChat binding attempt failed:', error)
    return NextResponse.json(
      { error: '生成微信绑定二维码失败，请稍后重试' },
      { status: 500 },
    )
  }
}
