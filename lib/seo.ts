import type { Metadata } from 'next'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/constants'

const DEFAULT_SITE_ORIGIN = 'http://localhost:3000'

export const siteOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || process.env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/$/, '')

export const publicSeoRoutes = ['/', '/pricing', '/faq', '/terms', '/privacy'] as const

export function buildMetadata({
  title,
  description,
  path = '/',
  keywords,
}: {
  title: string
  description?: string
  path?: string
  keywords?: string[]
}): Metadata {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const canonical = `${siteOrigin}${normalizedPath}`
  const metaDescription = description || SITE_DESCRIPTION

  return {
    title,
    description: metaDescription,
    alternates: {
      canonical,
    },
    keywords,
    openGraph: {
      type: 'website',
      title,
      description: metaDescription,
      siteName: SITE_NAME,
      url: canonical,
      locale: 'zh_CN',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: metaDescription,
    },
  }
}

export function buildSoftwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, Chrome Extension, Edge Extension',
    description: SITE_DESCRIPTION,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
    },
    url: siteOrigin,
  }
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteOrigin,
    description: SITE_DESCRIPTION,
    inLanguage: 'zh-CN',
  }
}
