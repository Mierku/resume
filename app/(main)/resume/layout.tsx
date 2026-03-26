'use client'

import './resume-module-theme.css'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AuthRequiredModal } from '@/components/ui/Modal'

const sidebarLinks = [
  { href: '/resume/templates', label: '模版', icon: 'i-lucide-layout-template' },
  { href: '/resume/my-resumes', label: '我的简历', icon: 'i-lucide-file-text' },
  { href: '/resume/data-source', label: '数据源', icon: 'i-lucide-database' },
]

export default function ResumeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [authChecked, setAuthChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      const authed = res.ok
      setAuthenticated(authed)
      setAuthChecked(true)
      return authed
    } catch {
      setAuthenticated(false)
      setAuthChecked(true)
      return false
    }
  }, [])

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  // Full-screen editor mode
  if (pathname.startsWith('/resume/editor/')) {
    return (
      <>
        <div className="resume-module-scope h-[100dvh] overflow-hidden">{children}</div>
      </>
    )
  }

  const isActive = (href: string) => {
    if (href === '/resume/templates') {
      return pathname === '/resume' || pathname === '/resume/templates'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      <div className="resume-module-scope flex h-[calc(100vh-64px)] overflow-hidden pt-[64px]">
        {/* Sidebar */}
        <aside className="w-56 border-r border-border bg-background hidden md:block">
          <nav className="p-4 space-y-1">
            {sidebarLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors
                  ${isActive(link.href)
                    ? 'text-foreground bg-muted/55 border border-border/70'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }
                `}
                onClick={async event => {
                  if (link.href !== '/resume/my-resumes') return
                  if (authenticated) return

                  event.preventDefault()

                  const authed = authChecked ? authenticated : await checkAuth()
                  if (authed) {
                    window.location.href = link.href
                    return
                  }

                  setShowAuthModal(true)
                }}
              >
                <span className={`${link.icon} w-4 h-4`} />
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-30">
          <nav className="flex">
            {sidebarLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors rounded-none
                  ${isActive(link.href)
                    ? 'text-foreground bg-muted/55'
                    : 'text-muted-foreground hover:bg-muted/35'
                  }
                `}
                onClick={async event => {
                  if (link.href !== '/resume/my-resumes') return
                  if (authenticated) return

                  event.preventDefault()

                  const authed = authChecked ? authenticated : await checkAuth()
                  if (authed) {
                    window.location.href = link.href
                    return
                  }

                  setShowAuthModal(true)
                }}
              >
                <span className={`${link.icon} w-5 h-5`} />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Content */}
        <main data-resume-scroll-container="true" className="min-h-0 flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <AuthRequiredModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath="/resume/my-resumes"
      />
    </>
  )
}
