import type { Metadata } from 'next'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { buildMetadata } from '@/lib/seo'
import { LEGAL_EFFECTIVE_DATE, LEGAL_TERMS_VERSION, termsSections } from '@/lib/legal'

export const metadata: Metadata = buildMetadata({
  title: '用户服务协议',
  description: '沉浸式网申用户服务协议，包含账号、服务范围、责任说明与协议更新机制。',
  path: '/terms',
  keywords: ['用户服务协议', '服务条款', '沉浸式网申'],
})

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="用户服务协议"
      subtitle="Terms of Service"
      version={LEGAL_TERMS_VERSION}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={termsSections}
    />
  )
}
