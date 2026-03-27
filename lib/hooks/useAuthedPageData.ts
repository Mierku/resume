'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { type AuthSnapshot } from '@/lib/auth/client'
import { useAuthSnapshot } from '@/lib/hooks/useAuthSnapshot'

type PageLoadContext<TUser> = {
  signal: AbortSignal
  auth: AuthSnapshot<TUser>
}

interface UseAuthedPageDataOptions<TData, TUser> {
  initialData: TData
  deps?: ReadonlyArray<unknown>
  load: (context: PageLoadContext<TUser>) => Promise<TData>
  onError?: (error: Error) => void
}

interface UseAuthedPageDataResult<TData, TUser> {
  data: TData
  setData: Dispatch<SetStateAction<TData>>
  loading: boolean
  error: string
  auth: AuthSnapshot<TUser>
  reload: () => void
  refreshAuth: () => Promise<AuthSnapshot<TUser>>
  ensureAuthenticated: () => Promise<boolean>
}

function toError(error: unknown, fallback = '加载失败，请稍后重试') {
  if (error instanceof Error) return error
  return new Error(fallback)
}

export function useAuthedPageData<TData, TUser = Record<string, unknown>>(
  options: UseAuthedPageDataOptions<TData, TUser>,
): UseAuthedPageDataResult<TData, TUser> {
  const { initialData, load, onError } = options
  const deps = options.deps || []

  const [data, setData] = useState<TData>(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const onErrorRef = useRef(onError)
  const { auth, checked, refresh, ensureAuthenticated } = useAuthSnapshot<TUser>({ eager: false })
  const authStateRef = useRef<{ auth: AuthSnapshot<TUser>; checked: boolean }>({ auth, checked })

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  useEffect(() => {
    authStateRef.current = { auth, checked }
  }, [auth, checked])

  const refreshAuth = useCallback(async () => {
    return refresh()
  }, [refresh])

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setError('')

      try {
        const authSnapshot = authStateRef.current.checked
          ? authStateRef.current.auth
          : await refreshAuth()
        if (cancelled || controller.signal.aborted) return

        const nextData = await load({
          signal: controller.signal,
          auth: authSnapshot,
        })

        if (cancelled || controller.signal.aborted) return
        setData(nextData)
      } catch (error) {
        if (cancelled || controller.signal.aborted) return
        const normalizedError = toError(error)
        setError(normalizedError.message)
        onErrorRef.current?.(normalizedError)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [load, refreshAuth, reloadKey, ...deps])

  const reload = useCallback(() => {
    setReloadKey(value => value + 1)
  }, [])

  return useMemo(
    () => ({
      data,
      setData,
      loading,
      error,
      auth,
      reload,
      refreshAuth,
      ensureAuthenticated,
    }),
    [auth, data, ensureAuthenticated, error, loading, refreshAuth, reload],
  )
}
