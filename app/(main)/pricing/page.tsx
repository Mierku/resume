import { Metadata } from 'next'
import { Check } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import styles from './pricing.module.scss'

export const metadata: Metadata = {
  ...buildMetadata({
    title: '定价与方案',
    path: '/pricing',
    description: '选择适合你的职场加速方案，从尝鲜版到 Pro 与深度咨询版，按阶段解锁更高效的投递体验。',
    keywords: ['定价', '订阅方案', '简历优化', '求职平台', '职场加速'],
  }),
}

interface PricingFeature {
  text: string
  enabled: boolean
  accent: boolean
}

interface PricingPlan {
  id: string
  name: string
  subtitle: string
  price: string
  period: string
  note: string
  cta: string
  tone: 'normal' | 'featured' | 'soft'
  features: PricingFeature[]
  badge?: string
  strikePrice?: string
}

const PRICING_COPY: PricingPlan[] = [
  {
    id: 'free',
    name: '基础版',
    subtitle: '适合刚开始建立投递流程的用户',
    price: '¥0',
    period: '/ 永久免费',
    note: '',
    cta: '开始使用',
    tone: 'normal' as const,
    features: [
      { text: '简历/数据源存储 1 份', enabled: true, accent: false },
      { text: '解锁多端同步功能', enabled: true, accent: false },
      { text: '每月自动填写简历 5 次', enabled: true, accent: false },
      { text: '无限制下载', enabled: true, accent: false },
      { text: '支持 PDF/图片下载', enabled: true, accent: false },
      { text: '网申跟踪', enabled: true, accent: false },
      { text: '解锁第三方网页修改简历回填', enabled: true, accent: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro 方案',
    subtitle: '适合高频投递与批量优化阶段',
    price: '¥25',
    period: '/ 月',
    note: '月卡方案',
    cta: '立即开通',
    tone: 'featured' as const,
    badge: 'Most Popular',
    features: [
      { text: '包含基础版全部功能', enabled: true, accent: true },
      { text: '简历/数据源存储 10 份', enabled: true, accent: true },
      { text: '自动 AI 填简历 500 份', enabled: true, accent: true },
      { text: 'AI 润色 100 次', enabled: true, accent: true },
      { text: 'AI 翻译 100 次', enabled: true, accent: true },
    ],
  },
  {
    id: 'elite',
    name: '畅享版',
    subtitle: '适合长期使用，全部能力无上限',
    price: '无限制',
    period: '',
    note: '季卡享 8 折',
    cta: '开通畅享版',
    tone: 'soft' as const,
    features: [
      { text: '所有功能与额度无限制', enabled: true, accent: true },
      { text: '自动 AI 填简历不限量', enabled: true, accent: true },
      { text: 'AI 润色不限量', enabled: true, accent: true },
      { text: 'AI 翻译不限量', enabled: true, accent: true },
      { text: '季卡自动享受 8 折', enabled: true, accent: true },
    ],
  },
]

const TRUST_BADGES = ['FAST COMPANY', 'PRODUCT HUNT', 'TECH CRUNCH']

export default function PricingPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Pricing &amp; Plans</p>
          <h1 className={styles.title}>
            选择最适合你的<span className={styles.titleAccent}>职场加速方案</span>
          </h1>
          <p className={styles.subtitle}>不是为了付费而付费，是为了让你的每一分钟投递都更有价值。</p>
        </div>

        <div className={styles.cardsGrid}>
          {PRICING_COPY.map(plan => (
            <article
              key={plan.id}
              className={[
                styles.card,
                plan.tone === 'featured' ? styles.cardFeatured : '',
                plan.tone === 'soft' ? styles.cardSoft : '',
              ].join(' ')}
            >
              {'badge' in plan && plan.badge ? <span className={styles.badge}>{plan.badge}</span> : null}

              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{plan.name}</h2>
                <p className={styles.cardHint}>{plan.subtitle}</p>
              </div>

              {'strikePrice' in plan && plan.strikePrice ? <p className={styles.strikePrice}>{plan.strikePrice}</p> : null}

              <div className={styles.priceRow}>
                <span className={styles.price}>{plan.price}</span>
                <span className={styles.period}>{plan.period}</span>
              </div>

              {plan.note ? <p className={styles.planNote}>{plan.note}</p> : null}

              <ul className={styles.featureList}>
                {plan.features.map(feature => (
                  <li
                    key={feature.text}
                    className={[
                      styles.featureItem,
                      !feature.enabled ? styles.featureDisabled : '',
                      feature.accent ? styles.featureAccent : '',
                    ].join(' ')}
                  >
                    {feature.enabled ? <Check size={16} className={styles.featureIcon} /> : <span className={styles.featureDot}>•</span>}
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={[
                  styles.ctaButton,
                  plan.tone === 'featured' ? styles.ctaButtonPrimary : '',
                  plan.tone === 'soft' ? styles.ctaButtonOutlineBold : styles.ctaButtonOutline,
                ].join(' ')}
              >
                {plan.cta}
              </button>
            </article>
          ))}
        </div>

        <div className={styles.trustWall}>
          {TRUST_BADGES.map(item => (
            <span key={item} className={styles.trustItem}>
              {item}
            </span>
          ))}
        </div>

        <section className={styles.faqCard}>
          <h2 className={styles.faqTitle}>
            <span className={styles.faqMark}>?</span>
            为什么要付费？
          </h2>
          <p className={styles.faqText}>
            我们理解大家对工具付费的谨慎。Aura 的 AI 模型调用需要极高的计算成本。比起通过广告骚扰用户或贩卖简历隐私，我们更希望通过极低的价格（每月不到一只麦当劳汉堡的价格）换取纯净、高效的体验。
          </p>
        </section>
      </div>
    </div>
  )
}
