'use client'

import './resume-module-theme.css'
import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

export default function ResumeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isEditorRoute = pathname.startsWith('/resume/editor/')

  // Full-screen editor mode
  if (isEditorRoute) {
    return (
      <>
        <div className="resume-module-scope h-[100dvh] overflow-hidden">{children}</div>
      </>
    )
  }

  return (
    <div className="resume-module-scope flex h-[calc(100vh-64px)] overflow-hidden pt-[64px]">
      <div className="flex min-h-0 w-full flex-col">
        <main data-resume-scroll-container="true" className="min-h-0 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
