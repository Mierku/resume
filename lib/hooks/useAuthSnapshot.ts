'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchAuthSnapshot, hasAuthSessionHint, type AuthSnapshot } from '@/lib/auth/client'
import { useOptionalAuthContext } from '@/lib/auth/context'

interface UseAuthSnapshotOptions {
  eager?: boolean
}

interface UseAuthSnapshotResult<TUser> {
  auth: AuthSnapshot<TUser>
  checked: boolean
  checking: boolean
  refresh: () => Promise<AuthSnapshot<TUser>>
  ensureAuthenticated: () => Promise<boolean>
}

export function useAuthSnapshot<TUser = Record<string, unknown>>(
  options: UseAuthSnapshotOptions = {},
): UseAuthSnapshotResult<TUser> {
  const { eager = true } = options
  const context = useOptionalAuthContext()
  useEffect(() => {
    if (!context || !eager || context.checked || context.checking) return
    void context.refresh()
  }, [context, eager])

  const mountedRef = useRef(true)
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  const [auth, setAuth] = useState<AuthSnapshot<TUser>>({
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
    setChecking(true)
    const snapshot = await fetchAuthSnapshot<TUser>()

    if (!mountedRef.current) {
      return snapshot
    }

    setAuth(snapshot)
    setChecked(true)
    setChecking(false)
    return snapshot
  }, [])

  const ensureAuthenticated = useCallback(async () => {
    if (auth.authenticated) return true
    if (!hasAuthSessionHint()) return false

    const latest = await refresh()
    return latest.authenticated
  }, [auth.authenticated, refresh])

  useEffect(() => {
    if (context || !eager) return
    void refresh()
  }, [context, eager, refresh])

  const localResult = useMemo(
    () => ({
      auth,
      checked,
      checking,
      refresh,
      ensureAuthenticated,
    }),
    [auth, checked, checking, ensureAuthenticated, refresh],
  )

  const contextResult = useMemo<UseAuthSnapshotResult<TUser> | null>(() => {
    if (!context) return null
    return {
      auth: context.auth as AuthSnapshot<TUser>,
      checked: context.checked,
      checking: context.checking,
      refresh: () => context.refresh() as Promise<AuthSnapshot<TUser>>,
      ensureAuthenticated: context.ensureAuthenticated,
    }
  }, [context])

  return contextResult || localResult
}
