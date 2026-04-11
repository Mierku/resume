import { NextResponse } from 'next/server'
import { isEmailAuthError, sendEmailLoginCode } from '@/lib/email-auth'

export async function POST(request: Request) {
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

    console.error('Send email login code failed:', error)
    return NextResponse.json(
      {
        error: '发送验证码失败，请稍后重试',
      },
      { status: 500 },
    )
  }
}
