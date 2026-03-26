import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from '@/lib/legal'

const schema = z.object({
  termsVersion: z.string().min(1).max(32),
  privacyVersion: z.string().min(1).max(32),
})

function getRequestIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null
  }

  return request.headers.get('x-real-ip')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const data = schema.parse(body)

    if (data.termsVersion !== LEGAL_TERMS_VERSION || data.privacyVersion !== LEGAL_PRIVACY_VERSION) {
      return NextResponse.json({ error: '协议版本不匹配，请刷新后重试' }, { status: 400 })
    }

    const ipAddress = getRequestIp(request)
    const userAgent = request.headers.get('user-agent')

    const consent = await prisma.legalConsent.upsert({
      where: {
        userId_termsVersion_privacyVersion: {
          userId: user.id,
          termsVersion: data.termsVersion,
          privacyVersion: data.privacyVersion,
        },
      },
      create: {
        userId: user.id,
        termsVersion: data.termsVersion,
        privacyVersion: data.privacyVersion,
        ipAddress,
        userAgent,
      },
      update: {
        acceptedAt: new Date(),
        ipAddress,
        userAgent,
      },
      select: {
        id: true,
        acceptedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      consentId: consent.id,
      acceptedAt: consent.acceptedAt.toISOString(),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || '参数错误' }, { status: 400 })
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      return NextResponse.json({ error: '法律同意记录表未初始化，请先执行数据库迁移' }, { status: 503 })
    }

    console.error('Accept legal consent error:', error)
    return NextResponse.json({ error: '记录同意状态失败' }, { status: 500 })
  }
}
