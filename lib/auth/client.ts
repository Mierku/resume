export type AuthSnapshot<TUser = Record<string, unknown>> = {
  authenticated: boolean
  user: TUser | null
}

interface FetchAuthSnapshotOptions {
  signal?: AbortSignal
  force?: boolean
  maxAgeMs?: number
}

const DEFAULT_AUTH_CACHE_AGE_MS = 15_000
const AUTH_HINT_STORAGE_KEY = 'auth:session-hint'
const AUTH_HINT_AUTHENTICATED = '1'
const AUTH_HINT_UNAUTHENTICATED = '0'

let cachedAuthenticatedSnapshot: AuthSnapshot<Record<string, unknown>> | null = null
let cachedAt = 0
let inflightRequest: Promise<AuthSnapshot<Record<string, unknown>>> | null = null

function parseAuthPayload<TUser>(payload: unknown): TUser | null {
  if (!payload || typeof payload !== 'object') return null
  const user = (payload as Record<string, unknown>).user
  if (!user || typeof user !== 'object') return null
  return user as TUser
}

function castSnapshot<TUser>(snapshot: AuthSnapshot<Record<string, unknown>>): AuthSnapshot<TUser> {
  return snapshot as AuthSnapshot<TUser>
}

function isAuthenticatedCacheFresh(maxAgeMs: number) {
  if (!cachedAuthenticatedSnapshot || !cachedAuthenticatedSnapshot.authenticated) {
    return false
  }

  return Date.now() - cachedAt < maxAgeMs
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readAuthHint() {
  if (!canUseStorage()) return AUTH_HINT_AUTHENTICATED

  try {
    return window.localStorage.getItem(AUTH_HINT_STORAGE_KEY)
  } catch {
    return AUTH_HINT_AUTHENTICATED
  }
}

export function hasAuthSessionHint() {
  return readAuthHint() === AUTH_HINT_AUTHENTICATED
}

export function markAuthSessionHintAuthenticated() {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(AUTH_HINT_STORAGE_KEY, AUTH_HINT_AUTHENTICATED)
  } catch {
    // noop
  }
}

export function clearAuthSessionHint() {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(AUTH_HINT_STORAGE_KEY, AUTH_HINT_UNAUTHENTICATED)
  } catch {
    // noop
  }
}

async function requestAuthSnapshot<TUser>(signal?: AbortSignal): Promise<AuthSnapshot<TUser>> {
  try {
    const response = await fetch('/api/auth/me', { cache: 'no-store', signal })
    if (!response.ok) {
      return { authenticated: false, user: null }
    }

    const payload = await response.json().catch(() => null)
    return {
      authenticated: true,
      user: parseAuthPayload<TUser>(payload),
    }
  } catch {
    return { authenticated: false, user: null }
  }
}

export function invalidateAuthSnapshotCache() {
  cachedAuthenticatedSnapshot = null
  cachedAt = 0
}

function createUnauthenticatedSnapshot<TUser>(): AuthSnapshot<TUser> {
  return { authenticated: false, user: null }
}

export async function fetchAuthSnapshot<TUser>(
  options: FetchAuthSnapshotOptions = {},
): Promise<AuthSnapshot<TUser>> {
  const { signal, force = false, maxAgeMs = DEFAULT_AUTH_CACHE_AGE_MS } = options

  if (!force && isAuthenticatedCacheFresh(maxAgeMs) && cachedAuthenticatedSnapshot) {
    return castSnapshot<TUser>(cachedAuthenticatedSnapshot)
  }

  // No session hint means "known unauthenticated" on client.
  // In that case we skip probing /api/auth/me to avoid redundant requests.
  if (!hasAuthSessionHint()) {
    return createUnauthenticatedSnapshot<TUser>()
  }

  if (!force && !signal && inflightRequest) {
    const snapshot = await inflightRequest
    return castSnapshot<TUser>(snapshot)
  }

  const execute = async () => {
    const snapshot = await requestAuthSnapshot<Record<string, unknown>>(signal)
    if (snapshot.authenticated) {
      cachedAuthenticatedSnapshot = snapshot
      cachedAt = Date.now()
      markAuthSessionHintAuthenticated()
    } else {
      clearAuthSessionHint()
      invalidateAuthSnapshotCache()
    }

    return snapshot
  }

  if (signal) {
    const snapshot = await execute()
    return castSnapshot<TUser>(snapshot)
  }

  inflightRequest = execute()
  try {
    const snapshot = await inflightRequest
    return castSnapshot<TUser>(snapshot)
  } finally {
    inflightRequest = null
  }
}
