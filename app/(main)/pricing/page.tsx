import { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { listActiveVipPackages } from '@/server/commerce/packages'
import { PricingPageClient } from './PricingPageClient'

export const revalidate = 3600

export const metadata: Metadata = {
  ...buildMetadata({
    title: '定价与方案',
    path: '/pricing',
    description: '选择适合你的职场加速方案，从尝鲜版到 Pro 与深度咨询版，按阶段解锁更高效的投递体验。',
    keywords: ['定价', '订阅方案', '简历优化', '求职平台', '职场加速'],
  }),
}

export default async function PricingPage() {
  const packages = await listActiveVipPackages()

  return <PricingPageClient initialPackages={packages as never[]} />
}
