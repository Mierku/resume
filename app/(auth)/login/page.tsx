'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { sanitizeNextPath } from '@/lib/auth-redirect'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const nextPath = sanitizeNextPath(searchParams.get('next'))
  const error = searchParams.get('error')

  return (
    <LoginPanel
      nextPath={nextPath}
      error={error}
      mode="page"
      onSuccess={({ redirectTo }) => {
        window.location.href = redirectTo
      }}
    />
  )
}
