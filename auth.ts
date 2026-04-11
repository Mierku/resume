import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { sanitizeNextPath } from '@/lib/auth-redirect'

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
  providers: [],
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
