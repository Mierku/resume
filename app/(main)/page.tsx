import type { Metadata } from 'next'
import { Suspense } from 'react'
import { HomePageClient } from './_components/HomePageClient'
import { buildMetadata } from '@/lib/seo'

export const revalidate = 3600

export const metadata: Metadata = buildMetadata({
  title: '沉浸式网申 | 简历投递自动化助手 ｜免费简历制作 ',
  path: '/',
  description:
    '沉浸式网申 是极简主义风格的简历一键填充插件，支持多平台浏览器自动化投递，让每一份细节都能精准触达。',
  keywords: ['沉浸式网申', '简历投递自动化', '浏览器自动化', '一键填充插件', '多平台投递', '免费简历', '简历模板'],
})

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageClient />
    </Suspense>
  )
}
