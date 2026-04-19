export interface SessionUser {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
  onboardingCompleted: boolean
  providers?: string[]
  role?: 'user' | 'admin' | 'super_admin'
  isAdmin?: boolean
  planType?: string | null
  planExpiresAt?: string | null
}

export const DEFAULT_USER_AVATAR_URL = '/avatar/default.jpg'

export function getUserDisplayName(user: Pick<SessionUser, 'displayName' | 'email'>): string {
  if (user.displayName?.trim()) {
    return user.displayName.trim()
  }

  if (user.email?.trim()) {
    return user.email.split('@')[0]
  }

  return '已登录用户'
}

export function getUserAvatarUrl(user: Pick<SessionUser, 'avatarUrl'>): string {
  const rawAvatarUrl = user.avatarUrl?.trim()
  return rawAvatarUrl || DEFAULT_USER_AVATAR_URL
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin'
}
