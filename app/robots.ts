import type { MetadataRoute } from 'next'
import { siteOrigin } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/faq', '/install'],
        disallow: ['/api/', '/resume/', '/dashboard', '/onboarding', '/tracking', '/records', '/job-sites', '/data-sources'],
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  }
}
