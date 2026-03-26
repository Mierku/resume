'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

function buildCleanUrl(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function LegalConsentSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const processingRef = useRef(false)

  useEffect(() => {
    const acknowledged = searchParams.get('legal_ack')
    const termsVersion = searchParams.get('terms_v')
    const privacyVersion = searchParams.get('privacy_v')

    if (acknowledged !== '1' || !termsVersion || !privacyVersion) {
      return
    }
    if (processingRef.current) {
      return
    }

    processingRef.current = true

    const cleanedParams = new URLSearchParams(searchParams.toString())
    cleanedParams.delete('legal_ack')
    cleanedParams.delete('terms_v')
    cleanedParams.delete('privacy_v')
    const cleanedUrl = buildCleanUrl(pathname, cleanedParams)

    void fetch('/api/legal/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        termsVersion,
        privacyVersion,
      }),
    }).finally(() => {
      router.replace(cleanedUrl, { scroll: false })
      processingRef.current = false
    })
  }, [pathname, router, searchParams])

  return null
}
