import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { LangMode } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import devTestDataSourceFixture from '@/lib/dev-test-data-source.json'

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60
const DEFAULT_TEST_EMAIL = process.env.DEV_TEST_USER_EMAIL || 'dev@immersive.local'
const DEFAULT_TEST_NAME = process.env.DEV_TEST_USER_NAME || '开发测试账号'

function getFixtureLangMode(mode: unknown): LangMode {
  return mode === 'en' ? 'en' : 'zh'
}

function buildDevTestDataSource(email: string) {
  return {
    ...devTestDataSourceFixture,
    langMode: getFixtureLangMode(devTestDataSourceFixture.langMode),
    basics: {
      ...devTestDataSourceFixture.basics,
      email,
    },
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const nextPath = sanitizeNextPath(
    typeof body?.next === 'string' ? body.next : request.nextUrl.searchParams.get('next')
  )
  const expires = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
  const sessionToken = randomBytes(32).toString('hex')

  try {
    await prisma.$transaction(async tx => {
      const testDataSource = buildDevTestDataSource(DEFAULT_TEST_EMAIL)
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

      const existingDataSource = await tx.dataSource.findFirst({
        where: {
          userId: user.id,
          name: testDataSource.name,
        },
      })

      const dataSource = existingDataSource
        ? await tx.dataSource.update({
            where: { id: existingDataSource.id },
            data: {
              name: testDataSource.name,
              langMode: testDataSource.langMode,
              basics: testDataSource.basics,
              intention: testDataSource.intention,
              education: testDataSource.education,
              work: testDataSource.work,
              projects: testDataSource.projects,
              skills: testDataSource.skills,
              summaryZh: testDataSource.summaryZh,
              summaryEn: testDataSource.summaryEn,
            },
          })
        : await tx.dataSource.create({
            data: {
              userId: user.id,
              name: testDataSource.name,
              langMode: testDataSource.langMode,
              basics: testDataSource.basics,
              intention: testDataSource.intention,
              education: testDataSource.education,
              work: testDataSource.work,
              projects: testDataSource.projects,
              skills: testDataSource.skills,
              summaryZh: testDataSource.summaryZh,
              summaryEn: testDataSource.summaryEn,
            },
          })

      await tx.user.update({
        where: { id: user.id },
        data: {
          defaultDataSourceId: dataSource.id,
          onboardingCompleted: true,
        },
      })

      await tx.session.deleteMany({
        where: { userId: user.id },
      })

      await tx.session.create({
        data: {
          userId: user.id,
          sessionToken,
          expires,
        },
      })
    })

    const useSecureCookies = request.nextUrl.protocol === 'https:'
    const response = NextResponse.json({
      redirectTo: nextPath,
      user: {
        email: DEFAULT_TEST_EMAIL,
        name: DEFAULT_TEST_NAME,
      },
    })

    response.cookies.set(`${useSecureCookies ? '__Secure-' : ''}authjs.session-token`, sessionToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: 'lax',
      path: '/',
      expires,
    })

    return response
  } catch (error) {
    console.error('Dev auth login error:', error)
    return NextResponse.json({ error: '创建测试账号失败' }, { status: 500 })
  }
}
