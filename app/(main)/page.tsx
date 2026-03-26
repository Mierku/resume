import type { Metadata } from 'next'
import { HomePageClient } from './_components/HomePageClient'
import { buildMetadata, buildSoftwareApplicationJsonLd, buildWebSiteJsonLd } from '@/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = buildMetadata({
  title: 'Aura Resume | 简历投递自动化助手',
  path: '/',
  description:
    'Aura Resume 是极简主义风格的简历一键填充插件，支持多平台浏览器自动化投递，让每一份细节都能精准触达。',
  keywords: ['Aura Resume', '简历投递自动化', '浏览器自动化', '一键填充插件', '多平台投递'],
})

export default function HomePage() {
  const webSite = buildWebSiteJsonLd()
  const software = buildSoftwareApplicationJsonLd()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([webSite, software]),
        }}
      />
      <HomePageClient />
    </>
  )
}
