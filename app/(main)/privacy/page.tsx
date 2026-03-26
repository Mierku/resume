import type { Metadata } from 'next'
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage'
import { buildMetadata } from '@/lib/seo'
import { LEGAL_EFFECTIVE_DATE, LEGAL_PRIVACY_VERSION, privacySections } from '@/lib/legal'

export const metadata: Metadata = buildMetadata({
  title: '隐私政策',
  description: '沉浸式网申隐私政策，说明个人信息收集、使用、存储、安全与用户权利。',
  path: '/privacy',
  keywords: ['隐私政策', '个人信息保护', '沉浸式网申'],
})

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="隐私政策"
      subtitle="Privacy Policy"
      version={LEGAL_PRIVACY_VERSION}
      effectiveDate={LEGAL_EFFECTIVE_DATE}
      sections={privacySections}
    />
  )
}
