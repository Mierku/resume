import type { MetadataRoute } from 'next'
import { publicSeoRoutes, siteOrigin } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return publicSeoRoutes.map(path => ({
    url: `${siteOrigin}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.8,
  }))
}
