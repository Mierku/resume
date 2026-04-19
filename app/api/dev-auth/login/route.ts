import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { createAuthSession, setAuthSessionCookie } from '@/lib/auth-session'
const DEFAULT_TEST_EMAIL = process.env.DEV_TEST_USER_EMAIL || 'dev@immersive.local'
const DEFAULT_TEST_NAME = process.env.DEV_TEST_USER_NAME || '开发测试账号'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const nextPath = sanitizeNextPath(
    typeof body?.next === 'string' ? body.next : request.nextUrl.searchParams.get('next')
  )

  try {
    const userId = await prisma.$transaction(async tx => {
      const user = await tx.user.upsert({
        where: { email: DEFAULT_TEST_EMAIL },
        update: {
          name: DEFAULT_TEST_NAME,
          emailVerified: new Date(),
          onboardingCompleted: true,
        },
        create: {
          email: DEFAULT_TEST_EMAIL,
          name: DEFAULT_TEST_NAME,
          emailVerified: new Date(),
          onboardingCompleted: true,
        },
      })

      return user.id
    })

    const session = await createAuthSession(userId, {
      deleteExistingSessions: true,
    })

    const response = NextResponse.json({
      redirectTo: nextPath,
      user: {
        email: DEFAULT_TEST_EMAIL,
        name: DEFAULT_TEST_NAME,
      },
    })

    setAuthSessionCookie(response, request, session)

    return response
  } catch (error) {
    console.error('Dev auth login error:', error)
    return NextResponse.json({ error: '创建测试账号失败' }, { status: 500 })
  }
}
