import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const AUTH_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export interface CreatedAuthSession {
  sessionToken: string
  expires: Date
}

interface CreateAuthSessionOptions {
  deleteExistingSessions?: boolean
}

export async function createAuthSession(
  userId: string,
  options: CreateAuthSessionOptions = {},
): Promise<CreatedAuthSession> {
  const expires = new Date(Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000)
  const sessionToken = randomBytes(32).toString('hex')

  await prisma.$transaction(async tx => {
    if (options.deleteExistingSessions) {
      await tx.session.deleteMany({
        where: { userId },
      })
    }

    await tx.session.create({
      data: {
        userId,
        sessionToken,
        expires,
      },
    })
  })

  return {
    sessionToken,
    expires,
  }
}

export function shouldUseSecureCookies(request: Pick<NextRequest, 'headers' | 'nextUrl'>) {
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedProto) {
    return forwardedProto.split(',')[0]?.trim() === 'https'
  }

  return request.nextUrl.protocol === 'https:'
}

export function setAuthSessionCookie(
  response: NextResponse,
  request: Pick<NextRequest, 'headers' | 'nextUrl'>,
  session: CreatedAuthSession,
) {
  const secure = shouldUseSecureCookies(request)
  const cookieName = `${secure ? '__Secure-' : ''}authjs.session-token`

  response.cookies.set(cookieName, session.sessionToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: session.expires,
  })
}
