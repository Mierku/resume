import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { isEmailAuthError, verifyEmailCode } from '@/lib/email-auth'
import {
  EMAIL_BIND_PROVIDER,
  getBoundProviderStatus,
  prepareEmailBinding,
} from '@/server/account-binding'

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
  const code = typeof body?.code === 'string' ? body.code : ''

  try {
    const verified = await verifyEmailCode(email, code)
    const result = await prepareEmailBinding(user.id, verified.email)

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (isEmailAuthError(error)) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status },
      )
    }

    console.error('Verify bind email failed:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '邮箱绑定失败，请稍后重试',
      },
      { status: 400 },
    )
  }
}
