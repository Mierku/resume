import { Metadata } from 'next'
import { Accordion } from '@/components/ui/Accordion'
import { FAQ_ITEMS } from '@/lib/constants'
import { buildMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...buildMetadata({
    title: '常见问题',
    path: '/faq',
    description: '查看沉浸式投递的常见问题，包含插件安装、数据安全、简历导出与平台支持范围。',
    keywords: ['FAQ', '常见问题', '插件安装', '简历导出'],
  }),
}

export default function FAQPage() {
  const items = FAQ_ITEMS.map((item, index) => ({
    id: `faq-${index}`,
    title: item.question,
    content: <p>{item.answer}</p>,
  }))

  return (
    <div className="container py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-2">常见问题</h1>
        <p className="text-muted-foreground mb-8">
          找到您关心的问题答案
        </p>

        <Accordion items={items} />

        <div className="mt-12 p-6 bg-muted rounded-sm text-center">
          <h3 className="font-medium text-foreground mb-2">还有其他问题？</h3>
          <p className="text-sm text-muted-foreground mb-4">
            我们随时为您提供帮助
          </p>
          <a 
            href="mailto:support@immersive-delivery.com"
            className="text-primary hover:underline text-sm"
          >
            support@immersive-delivery.com
          </a>
        </div>
      </div>
    </div>
  )
}
