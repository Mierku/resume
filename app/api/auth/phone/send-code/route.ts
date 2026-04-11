import { NextResponse } from 'next/server'
import { isPhoneAuthError, sendPhoneLoginCode } from '@/lib/phone-auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const phone = typeof body?.phone === 'string' ? body.phone : ''

  try {
    const result = await sendPhoneLoginCode(phone)
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (isPhoneAuthError(error)) {
      const payload: { error: string; cooldownSeconds?: number } = {
        error: error.message,
      }

      if (typeof error.cooldownSeconds === 'number' && error.cooldownSeconds > 0) {
        payload.cooldownSeconds = error.cooldownSeconds
      }

      return NextResponse.json(payload, { status: error.status })
    }

    console.error('Send phone login code failed:', error)
    return NextResponse.json(
      {
        error: '发送验证码失败，请稍后重试',
      },
      { status: 500 },
    )
  }
}
