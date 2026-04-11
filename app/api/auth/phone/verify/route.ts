import { NextRequest, NextResponse } from 'next/server'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { createAuthSession, setAuthSessionCookie } from '@/lib/auth-session'
import { isPhoneAuthError, verifyPhoneLoginCode } from '@/lib/phone-auth'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const phone = typeof body?.phone === 'string' ? body.phone : ''
  const code = typeof body?.code === 'string' ? body.code : ''

  const nextPath = sanitizeNextPath(
    typeof body?.next === 'string' ? body.next : request.nextUrl.searchParams.get('next'),
  )

  try {
    const result = await verifyPhoneLoginCode(phone, code)

    const session = await createAuthSession(result.userId, {
      deleteExistingSessions: true,
    })

    const response = NextResponse.json(
      {
        redirectTo: nextPath,
        user: {
          phone: result.phone,
          isNewUser: result.isNewUser,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )

    setAuthSessionCookie(response, request, session)

    return response
  } catch (error) {
    if (isPhoneAuthError(error)) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status },
      )
    }

    console.error('Phone login verify failed:', error)
    return NextResponse.json(
      {
        error: '手机验证码登录失败，请稍后重试',
      },
      { status: 500 },
    )
  }
}
