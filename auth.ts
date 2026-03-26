import NextAuth from 'next-auth'
import WeChat from 'next-auth/providers/wechat'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { sanitizeNextPath } from '@/lib/auth-redirect'

function buildProviders() {
  const providers = []

  if (process.env.WECHAT_OPEN_APP_ID && process.env.WECHAT_OPEN_APP_SECRET) {
    providers.push(
      WeChat({
        clientId: process.env.WECHAT_OPEN_APP_ID,
        clientSecret: process.env.WECHAT_OPEN_APP_SECRET,
        platformType: 'WebsiteApp',
        profile(profile) {
          return {
            id: String(profile.unionid || profile.openid),
            name: typeof profile.nickname === 'string' ? profile.nickname : '微信用户',
            email: null,
            image: typeof profile.headimgurl === 'string' ? profile.headimgurl : null,
          }
        },
      })
    )
  }

  return providers
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.AUTH_SECRET ?? process.env.SESSION_SECRET,
  trustHost: true,
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/login',
    error: '/login',
    newUser: '/onboarding',
  },
  providers: buildProviders(),
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
        session.user.onboardingCompleted = Boolean(user.onboardingCompleted)
        session.user.defaultDataSourceId =
          typeof user.defaultDataSourceId === 'string' ? user.defaultDataSourceId : null
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return new URL(sanitizeNextPath(url), baseUrl).toString()
      }

      try {
        const parsed = new URL(url)
        if (parsed.origin !== baseUrl) {
          return new URL('/dashboard', baseUrl).toString()
        }

        const nextPath = `${parsed.pathname}${parsed.search}${parsed.hash}`
        return new URL(sanitizeNextPath(nextPath), baseUrl).toString()
      } catch {
        return new URL('/dashboard', baseUrl).toString()
      }
    },
  },
})

export function getProviderAvailability() {
  return {
    wechat: Boolean(process.env.WECHAT_OPEN_APP_ID && process.env.WECHAT_OPEN_APP_SECRET),
  }
}
