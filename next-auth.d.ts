import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      onboardingCompleted: boolean
      defaultDataSourceId: string | null
    } & DefaultSession['user']
  }

  interface User {
    onboardingCompleted?: boolean
    defaultDataSourceId?: string | null
  }
}
