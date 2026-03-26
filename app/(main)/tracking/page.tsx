import type { Metadata } from 'next'
import TrackingPageClient from '@/components/tracking/TrackingPageClient'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...buildMetadata({
    title: '投递跟踪页',
    path: '/tracking',
    description: '统一查看投递状态、更新时间与站点来源的私有跟踪页。',
    keywords: ['投递跟踪', '求职进度', '投递记录'],
  }),
  robots: {
    index: false,
    follow: false,
  },
}

export default function TrackingPage() {
  return <TrackingPageClient />
}
