import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      onboardingCompleted: boolean
      defaultDataSourceId: string | null
      role: 'user' | 'admin' | 'super_admin'
      planType: 'basic' | 'pro' | 'elite'
      planExpiresAt: string | null
    } & DefaultSession['user']
  }

  interface User {
    onboardingCompleted?: boolean
    defaultDataSourceId?: string | null
    role?: 'user' | 'admin' | 'super_admin'
    membershipPlan?: 'basic' | 'pro' | 'elite'
    membershipExpiresAt?: Date | string | null
  }
}
