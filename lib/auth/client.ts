export type AuthSnapshot<TUser = Record<string, unknown>> = {
  authenticated: boolean
  user: TUser | null
}

export type AuthSnapshotResult<TUser = Record<string, unknown>> = AuthSnapshot<TUser> & {
  status: number | null
}

function parseAuthPayload<TUser>(payload: unknown): TUser | null {
  if (!payload || typeof payload !== 'object') return null
  const user = (payload as Record<string, unknown>).user
  if (!user || typeof user !== 'object') return null
  return user as TUser
}

export async function fetchAuthSnapshotWithStatus<TUser>(signal?: AbortSignal): Promise<AuthSnapshotResult<TUser>> {
  try {
    const response = await fetch('/api/auth/me', { cache: 'no-store', signal })
    if (!response.ok) {
      return { authenticated: false, user: null, status: response.status }
    }

    const payload = await response.json().catch(() => null)
    return {
      authenticated: true,
      user: parseAuthPayload<TUser>(payload),
      status: response.status,
    }
  } catch {
    return { authenticated: false, user: null, status: null }
  }
}

export async function fetchAuthSnapshot<TUser>(signal?: AbortSignal): Promise<AuthSnapshot<TUser>> {
  const result = await fetchAuthSnapshotWithStatus<TUser>(signal)
  return {
    authenticated: result.authenticated,
    user: result.user,
  }
}
