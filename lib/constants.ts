import { toAssetUrl } from '@/lib/assets'

const SITE_ORIGIN = process.env.SITE_ORIGIN || 'http://localhost:3000'

export const SITE_NAME = '沉浸式网申'
const SITE_NAME_EN = 'Immersive Apply'
export const SITE_DESCRIPTION = '免费简历制作｜自动化网申'

const PROTECTED_ROUTES = [
  '/dashboard',
  '/resume',
  '/job-sites',
  '/tracking',
  '/records',
  '/data-sources',
  '/resumes',
  '/onboarding',
]

function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some(route =>
    path === route || path.startsWith(`${route}/`)
  )
}

export const BUILT_IN_JOB_SITES = [
  {
    name: 'Boss直聘',
    url: 'https://www.zhipin.com',
    description: '找工作，上BOSS直聘',
    region: '全国',
  },
  {
    name: '拉勾网',
    url: 'https://www.lagou.com',
    description: '互联网招聘平台',
    region: '全国',
  },
  {
    name: '前程无忧',
    url: 'https://www.51job.com',
    description: '综合招聘平台',
    region: '全国',
  },
  {
    name: '智联招聘',
    url: 'https://www.zhaopin.com',
    description: '综合招聘平台',
    region: '全国',
  },
  {
    name: '猎聘网',
    url: 'https://www.liepin.com',
    description: '中高端人才招聘',
    region: '全国',
  },
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs',
    description: '全球职业社交平台',
    region: '海外',
  },
]

export const RESUME_TEMPLATES = [
  {
    id: 'template-1',
    name: '铜版网格',
    description: '卡片化区块 + 可测量文本流 + 调试友好',
    preview: toAssetUrl('/templates/numbered/template.png'),
    defaultPrimaryColor: '#c45528',
  },
  {
    id: 'template-2',
    name: '雪纹简章',
    description: '线性分节 + 雅致头图 + 可测量文本流',
    preview: toAssetUrl('/templates/numbered/template.png'),
    defaultPrimaryColor: '#394760',
  },
  {
    id: 'template-3',
    name: '绯红签条',
    description: '红色顶栏 + 签条分节 + 可测量文本流',
    preview: toAssetUrl('/templates/numbered/template.png'),
    defaultPrimaryColor: '#b80138',
  },
  {
    id: 'template-4',
    name: '浅紫书页',
    description: '浅灰底纹 + 紫色线条分节 + 可测量文本流',
    preview: toAssetUrl('/templates/numbered/template.png'),
    defaultPrimaryColor: '#8b5ad7',
  },
  {
    id: 'template-5',
    name: '双栏分区',
    description: '头部模块化 + 左右双栏信息编排',
    preview: toAssetUrl('/templates/numbered/template.png'),
    defaultPrimaryColor: '#2f4c72',
  },
]

export function getTemplateDefaultPrimaryColor(templateId: string): string {
  return (
    RESUME_TEMPLATES.find(template => template.id === templateId)?.defaultPrimaryColor ||
    RESUME_TEMPLATES[0].defaultPrimaryColor
  )
}

export const RECORD_STATUS_OPTIONS = [
  { value: 'pending', label: '未投递', color: 'text-muted-foreground' },
  { value: 'submitted', label: '已投递', color: 'text-primary' },
  { value: 'recorded', label: '跟进中', color: 'text-primary' },
  { value: 'abandoned', label: '已放弃', color: 'text-red-500' },
]

const PRICING_PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    features: [
      '1 个数据源',
      '3 份简历',
      '基础填报功能',
      '手动求职跟踪',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    recommended: true,
    features: [
      '无限数据源',
      '无限简历',
      '智能填报',
      '自动同步求职跟踪',
      'AI 润色',
      '数据导出',
    ],
  },
  {
    id: 'team',
    name: '团队版',
    price: 99,
    features: [
      'Pro 全部功能',
      '团队协作',
      '统计分析',
      '优先支持',
    ],
  },
]

export const FAQ_ITEMS = [
  {
    question: '什么是沉浸式投递？',
    answer: '沉浸式投递是一款帮助求职者高效投递简历的工具。通过浏览器插件，您可以一键填报各大招聘网站的表单，并同步求职跟踪记录，让求职过程更加轻松高效。',
  },
  {
    question: '如何安装浏览器插件？',
    answer: '您可以从 Chrome 网上应用店或 Edge 扩展商店下载安装。安装后，在任意招聘网站点击插件图标或使用精灵球按钮即可开始使用。',
  },
  {
    question: '我的数据安全吗？',
    answer: '我们非常重视您的数据安全。所有数据都存储在加密的服务器上，仅供您个人使用。我们不会将您的信息分享给第三方。',
  },
  {
    question: '支持哪些招聘网站？',
    answer: '目前支持 Boss直聘、拉勾网、前程无忧、智联招聘、猎聘网等主流招聘平台。我们持续更新支持更多网站。',
  },
  {
    question: '免费版和 Pro 版有什么区别？',
    answer: '免费版支持基础的填报和求职跟踪功能。Pro 版提供无限数据源、AI 润色、智能匹配等高级功能，让您的求职效率更上一层楼。',
  },
  {
    question: '如何联系客服？',
    answer: '您可以通过网站底部的联系方式或发送邮件到 support@immersive-delivery.com 联系我们。我们会在 24 小时内回复。',
  },
]
