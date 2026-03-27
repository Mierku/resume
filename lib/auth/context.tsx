'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fetchAuthSnapshot, type AuthSnapshot } from '@/lib/auth/client'

interface AuthContextValue {
  auth: AuthSnapshot<Record<string, unknown>>
  checked: boolean
  checking: boolean
  refresh: () => Promise<AuthSnapshot<Record<string, unknown>>>
  ensureAuthenticated: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
  eager?: boolean
}

export function AuthProvider({ children, eager = false }: AuthProviderProps) {
  const mountedRef = useRef(true)
  const inflightRef = useRef<Promise<AuthSnapshot<Record<string, unknown>>> | null>(null)
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

  const refresh = useCallback(async () => {
    if (inflightRef.current) {
      return inflightRef.current
    }

    setChecking(true)
    const request = fetchAuthSnapshot<Record<string, unknown>>()
      .then(snapshot => {
        if (mountedRef.current) {
          setAuth(snapshot)
          setChecked(true)
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
    const latest = await refresh()
    return latest.authenticated
  }, [auth.authenticated, refresh])

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
