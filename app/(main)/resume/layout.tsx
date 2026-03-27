'use client'

import './resume-module-theme.css'
import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Database, FileText, LayoutTemplate, type LucideIcon } from 'lucide-react'
import { AuthRequiredModal } from '@/components/ui/Modal'
import { useAuthSnapshot } from '@/lib/hooks/useAuthSnapshot'

const sidebarLinks: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/resume/templates', label: '模版', icon: LayoutTemplate },
  { href: '/resume/my-resumes', label: '我的简历', icon: FileText },
  { href: '/resume/data-source', label: '数据源', icon: Database },
]

export default function ResumeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const isEditorRoute = pathname.startsWith('/resume/editor/')
  const { auth, checked, refresh } = useAuthSnapshot({ eager: !isEditorRoute })
  const isTemplatesRoute = pathname === '/resume' || pathname.startsWith('/resume/templates')

  // Full-screen editor mode
  if (isEditorRoute) {
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

  const showResumeNav = !isTemplatesRoute || (checked && auth.authenticated)

  return (
    <>
      <div className="resume-module-scope flex h-[calc(100vh-64px)] overflow-hidden pt-[64px]">
        <div className="flex min-h-0 w-full flex-col">
          {showResumeNav ? (
            <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <nav className="mx-auto flex w-full max-w-[1440px] gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-10">
                {sidebarLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors
                      ${isActive(link.href)
                        ? 'border-border bg-muted/65 text-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/35 hover:text-foreground'
                      }
                    `}
                    onClick={async event => {
                      if (link.href !== '/resume/my-resumes') return
                      if (auth.authenticated) return

                      event.preventDefault()

                      const authed = checked ? auth.authenticated : (await refresh()).authenticated
                      if (authed) {
                        router.push(link.href)
                        return
                      }

                      setShowAuthModal(true)
                    }}
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}

          <main data-resume-scroll-container="true" className="min-h-0 flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <AuthRequiredModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath="/resume/my-resumes"
      />
    </>
  )
}
