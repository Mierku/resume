'use client'

import { useEffect, useState, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthRequiredModal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { type SessionUser } from '@/lib/user'

interface AuthGuardProps {
  children: ReactNode
  requireAuth?: boolean
  unauthBehavior?: 'modal' | 'redirect'
  loginPath?: string
}

function buildLoginHref(pathname: string, loginPath: string) {
  const normalizedPath = pathname || '/'
  const separator = loginPath.includes('?') ? '&' : '?'
  return `${loginPath}${separator}next=${encodeURIComponent(normalizedPath)}`
}

export function AuthGuard({
  children,
  requireAuth = true,
  unauthBehavior = 'modal',
  loginPath = '/login',
}: AuthGuardProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      let didRedirect = false

      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else if (requireAuth) {
          if (unauthBehavior === 'redirect') {
            didRedirect = true
            setRedirecting(true)
            router.replace(buildLoginHref(pathname || '/', loginPath))
            return
          }
          setShowModal(true)
        }
      } catch {
        if (requireAuth) {
          if (unauthBehavior === 'redirect') {
            didRedirect = true
            setRedirecting(true)
            router.replace(buildLoginHref(pathname || '/', loginPath))
            return
          }
          setShowModal(true)
        }
      } finally {
        if (!didRedirect) {
          setLoading(false)
        }
      }
    }

    void checkAuth()
  }, [loginPath, pathname, requireAuth, router, unauthBehavior])

  if (loading || redirecting) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-8 w-1/2 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    )
  }

  if (requireAuth && !user) {
    if (unauthBehavior === 'redirect') {
      return null
    }

    return (
      <>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p>需要登录才能访问此页面</p>
          </div>
        </div>
        <AuthRequiredModal 
          open={showModal} 
          onClose={() => setShowModal(false)}
          redirectPath={pathname}
        />
      </>
    )
  }

  return <>{children}</>
}

// Hook to get current user
export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      }
    } catch {
      // Not logged in
    } finally {
      setLoading(false)
    }
  }

  const refresh = () => {
    setLoading(true)
    fetchUser()
  }

  return { user, loading, refresh }
}
