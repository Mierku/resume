'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchAuthSnapshot, hasAuthSessionHint, invalidateAuthSnapshotCache, type AuthSnapshot } from '@/lib/auth/client'

interface RefreshAuthOptions {
  force?: boolean
}

interface AuthContextValue {
  auth: AuthSnapshot<Record<string, unknown>>
  checked: boolean
  checking: boolean
  refresh: (options?: RefreshAuthOptions) => Promise<AuthSnapshot<Record<string, unknown>>>
  ensureAuthenticated: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  eager?: boolean
}

const UNAUTH_REFRESH_COOLDOWN_MS = 4_000

export function AuthProvider({ children, eager = false }: AuthProviderProps) {
  const mountedRef = useRef(true)
  const inflightRef = useRef<Promise<AuthSnapshot<Record<string, unknown>>> | null>(null)
  const lastCheckedAtRef = useRef(0)
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [auth, setAuth] = useState<AuthSnapshot<Record<string, unknown>>>({
    authenticated: false,
    user: null,
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(async (options: RefreshAuthOptions = {}) => {
    const { force = false } = options

    if (inflightRef.current) {
      return inflightRef.current
    }

    setChecking(true)
    const request = fetchAuthSnapshot<Record<string, unknown>>({ force })
      .then(snapshot => {
        lastCheckedAtRef.current = Date.now()
        if (mountedRef.current) {
          setAuth(snapshot)
          setChecked(true)
        }

        if (!snapshot.authenticated) {
          invalidateAuthSnapshotCache()
        }

        return snapshot
      })
      .finally(() => {
        inflightRef.current = null
        if (mountedRef.current) {
          setChecking(false)
        }
      })

    inflightRef.current = request
    return request
  }, [])

  const ensureAuthenticated = useCallback(async () => {
    if (auth.authenticated) return true
    if (!hasAuthSessionHint()) {
      return false
    }

    const now = Date.now()
    if (checked && now - lastCheckedAtRef.current < UNAUTH_REFRESH_COOLDOWN_MS) {
      return false
    }

    const latest = await refresh({ force: true })
    return latest.authenticated
  }, [auth.authenticated, checked, refresh])

  useEffect(() => {
    if (!eager || checked || checking) return
    void refresh()
  }, [checked, checking, eager, refresh])

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      checked,
      checking,
      refresh,
      ensureAuthenticated,
    }),
    [auth, checked, checking, ensureAuthenticated, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useOptionalAuthContext() {
  return useContext(AuthContext)
}
