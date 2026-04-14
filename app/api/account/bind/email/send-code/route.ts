import { NextResponse } from 'next/server'
import { isEmailAuthError, sendEmailLoginCode } from '@/lib/email-auth'
import { getCurrentUser } from '@/lib/session'
import { EMAIL_BIND_PROVIDER, getBoundProviderStatus } from '@/server/account-binding'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const existingBinding = await getBoundProviderStatus(user.id, EMAIL_BIND_PROVIDER)
  if (existingBinding) {
    return NextResponse.json(
      { error: '当前账号已绑定邮箱' },
      { status: 409 },
    )
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email : ''

  try {
    const result = await sendEmailLoginCode(email)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (isEmailAuthError(error)) {
      const payload: { error: string; cooldownSeconds?: number } = {
        error: error.message,
      }

      if (typeof error.cooldownSeconds === 'number' && error.cooldownSeconds > 0) {
        payload.cooldownSeconds = error.cooldownSeconds
      }

      return NextResponse.json(payload, { status: error.status })
    }

    console.error('Send bind email code failed:', error)
    return NextResponse.json(
      {
        error: '发送验证码失败，请稍后重试',
      },
      { status: 500 },
    )
  }
}
