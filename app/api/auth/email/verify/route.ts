import { NextRequest, NextResponse } from 'next/server'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { createAuthSession, setAuthSessionCookie } from '@/lib/auth-session'
import { isEmailAuthError, verifyEmailLoginCode } from '@/lib/email-auth'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email : ''
  const code = typeof body?.code === 'string' ? body.code : ''

  const nextPath = sanitizeNextPath(
    typeof body?.next === 'string' ? body.next : request.nextUrl.searchParams.get('next'),
  )

  try {
    const result = await verifyEmailLoginCode(email, code)

    const session = await createAuthSession(result.userId, {
      deleteExistingSessions: true,
    })

    const response = NextResponse.json(
      {
        redirectTo: nextPath,
        user: {
          email: result.email,
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
    if (isEmailAuthError(error)) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: error.status },
      )
    }

    console.error('Email login verify failed:', error)
    return NextResponse.json(
      {
        error: '邮箱验证码登录失败，请稍后重试',
      },
      { status: 500 },
    )
  }
}
