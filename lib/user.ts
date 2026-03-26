export interface SessionUser {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  onboardingCompleted: boolean
  defaultDataSourceId?: string | null
  providers?: string[]
  planType?: string | null
  planExpiresAt?: string | null
}

export function getUserDisplayName(user: Pick<SessionUser, 'displayName' | 'email'>): string {
  if (user.displayName?.trim()) {
    return user.displayName.trim()
  }

  if (user.email?.trim()) {
    return user.email.split('@')[0]
  }

  return '已登录用户'
}
