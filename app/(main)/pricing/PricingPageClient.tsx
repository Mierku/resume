'use client'

import { Check, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LoginPanel } from '@/components/auth/LoginPanel'
import { Modal } from '@/components/ui/Modal'
import { Message } from '@/components/ui/radix-adapter'
import { Select } from '@/components/ui/Select'
import { QrCodeSvg } from '@/components/ui/QrCodeSvg'
import { invalidateAuthSnapshotCache } from '@/lib/auth/client'
import { useAuthSnapshot } from '@/lib/hooks/useAuthSnapshot'
import styles from './pricing.module.scss'

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
  priceFen: number
  period: string
  note: string
  cta: string
  tone: 'normal' | 'featured' | 'soft'
  features: PricingFeature[]
  badge?: string
  strikePrice?: string
}

interface PackageRecord {
  id: string
  code: string
  name: string
  subtitle: string | null
  membershipPlan: 'basic' | 'pro' | 'elite'
  durationDays: number
  priceFen: number
  compareAtPriceFen: number | null
  isFeatured: boolean
  badge: string | null
  note: string | null
  featureList: string[] | null
}

interface CheckoutState {
  orderId: string
  orderNumber: string
  codeUrl: string
  status: string
}

interface CheckoutCouponOption {
  id: string
  code: string
  name: string
  discountAmountFen: number
  payableAmountFen: number
}

function formatMoney(fen: number) {
  return `¥${(fen / 100).toFixed(2)}`
}

function formatCheckoutStatus(status: string) {
  switch (status) {
    case 'pending':
    case 'awaiting_payment':
      return '等待支付'
    case 'manual_review':
      return '等待支付确认'
    case 'callback_error':
      return '等待支付确认'
    case 'paid':
      return '支付处理中'
    case 'fulfilled':
      return '已开通成功'
    case 'closed':
      return '订单已关闭'
    default:
      return status
  }
}

function buildPlan(packageRecord: PackageRecord): PricingPlan {
  const features = Array.isArray(packageRecord.featureList)
    ? packageRecord.featureList.map(feature => ({
        text: feature,
        enabled: true,
        accent: packageRecord.membershipPlan !== 'basic',
      }))
    : []

  return {
    id: packageRecord.id,
    name: packageRecord.name,
    subtitle: packageRecord.subtitle || '按时长开通全部能力',
    price: formatMoney(packageRecord.priceFen),
    priceFen: packageRecord.priceFen,
    period: `/ ${packageRecord.durationDays} 天`,
    note: packageRecord.note || '',
    cta: packageRecord.membershipPlan === 'basic' ? '立即体验' : '立即开通',
    tone: packageRecord.isFeatured ? 'featured' : packageRecord.membershipPlan === 'elite' ? 'soft' : 'normal',
    features,
    badge: packageRecord.badge || undefined,
    strikePrice: packageRecord.compareAtPriceFen ? formatMoney(packageRecord.compareAtPriceFen) : undefined,
  }
}

const TRUST_BADGES = ['NATIVE PAY', 'ADMIN CONFIG', 'COUPON READY']

const EMPTY_STATE_PLAN: PricingPlan = {
  id: 'migration-pending',
  name: '支付系统初始化中',
  subtitle: '数据库迁移完成后，这里会展示后台配置的真实套餐',
  price: '即将上线',
  priceFen: 0,
  period: '',
  note: '先执行 Prisma migration，再到后台创建套餐',
  cta: '等待初始化',
  tone: 'normal',
  features: [
    { text: '后台可配置套餐价格与时长', enabled: true, accent: true },
    { text: '支持微信 Native 扫码支付', enabled: true, accent: true },
    { text: '支持优惠券与订单审计', enabled: true, accent: true },
  ],
}

export function PricingPageClient({
  initialPackages,
}: {
  initialPackages: PackageRecord[]
}) {
  const router = useRouter()
  const { auth, refresh: refreshAuth, ensureAuthenticated } = useAuthSnapshot({ eager: true })
  const [packages, setPackages] = useState(initialPackages)
  const [couponOptionsByPackageId, setCouponOptionsByPackageId] = useState<Record<string, CheckoutCouponOption[]>>({})
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [selectedCouponCode, setSelectedCouponCode] = useState('')
  const [checkoutState, setCheckoutState] = useState<CheckoutState | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [pollingStatus, setPollingStatus] = useState(false)
  const [appliedCouponCode, setAppliedCouponCode] = useState('')
  const [couponOptionsLoading, setCouponOptionsLoading] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [pendingPackageId, setPendingPackageId] = useState<string | null>(null)
  const checkoutRequestRef = useRef(0)
  const packageRefreshAttemptedRef = useRef(false)
  const couponRequestRef = useRef(0)
  const plans = useMemo(() => packages.map(buildPlan), [packages])
  const resolvedPlans = plans.length > 0 ? plans : [EMPTY_STATE_PLAN]

  const selectedPlan = plans.find(plan => plan.id === selectedPackageId) || null
  const selectedCouponOptions = selectedPackageId ? couponOptionsByPackageId[selectedPackageId] || [] : []
  const appliedCoupon = selectedCouponOptions.find(option => option.code === appliedCouponCode) || null
  const activePriceFen = appliedCoupon?.payableAmountFen ?? selectedPlan?.priceFen ?? 0
  const activeDiscountFen = appliedCoupon?.discountAmountFen ?? 0

  useEffect(() => {
    setPackages(initialPackages)
  }, [initialPackages])

  useEffect(() => {
    if (initialPackages.length > 0 || packageRefreshAttemptedRef.current) {
      return
    }

    packageRefreshAttemptedRef.current = true
    let cancelled = false

    void (async () => {
      try {
        const response = await fetch('/api/commerce/packages', {
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload?.packages || cancelled) {
          return
        }

        setPackages(payload.packages)
      } catch {
        // keep the static fallback state when runtime data is temporarily unavailable
      }
    })()

    return () => {
      cancelled = true
    }
  }, [initialPackages])

  useEffect(() => {
    if (!selectedPackageId || couponOptionsByPackageId[selectedPackageId] !== undefined) {
      return
    }

    const requestId = ++couponRequestRef.current
    const params = new URLSearchParams({
      vipPackageId: selectedPackageId,
    })

    let cancelled = false
    setCouponOptionsLoading(true)

    void (async () => {
      try {
        const response = await fetch(`/api/commerce/coupons/eligible?${params.toString()}`, {
          cache: 'no-store',
        })

        if (cancelled || requestId !== couponRequestRef.current) {
          return
        }

        if (response.status === 401) {
          setCouponOptionsByPackageId(current => ({
            ...current,
            [selectedPackageId]: [],
          }))
          return
        }

        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload?.coupons) {
          setCouponOptionsByPackageId(current => ({
            ...current,
            [selectedPackageId]: [],
          }))
          return
        }

        setCouponOptionsByPackageId(current => ({
          ...current,
          [selectedPackageId]: payload.coupons,
        }))
      } catch {
        if (cancelled || requestId !== couponRequestRef.current) {
          return
        }

        setCouponOptionsByPackageId(current => ({
          ...current,
          [selectedPackageId]: [],
        }))
      } finally {
        if (!cancelled && requestId === couponRequestRef.current) {
          setCouponOptionsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [couponOptionsByPackageId, selectedPackageId])

  useEffect(() => {
    if (!checkoutState?.orderId) {
      return
    }

    let cancelled = false
    const interval = window.setInterval(async () => {
      try {
        setPollingStatus(true)
        const response = await fetch(`/api/commerce/orders/${checkoutState.orderId}/status`, {
          cache: 'no-store',
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload?.order) {
          return
        }

        if (cancelled) {
          return
        }

        setCheckoutState(current =>
          current
            ? {
                ...current,
                status: payload.order.status,
              }
            : current,
        )

        if (payload.order.status === 'fulfilled') {
          setCheckoutError('')
          window.clearInterval(interval)
          invalidateAuthSnapshotCache()
          void refreshAuth()
          router.refresh()
          Message.success('支付成功，会员权益已开通')
          closeCheckoutModal()
        }
      } catch {
        // ignore transient polling failures
      } finally {
        if (!cancelled) {
          setPollingStatus(false)
        }
      }
    }, 2500)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [checkoutState?.orderId, refreshAuth, router])

  async function requestCheckout(packageId: string, coupon?: string) {
    const requestId = ++checkoutRequestRef.current
    setCheckingOut(true)
    setCheckoutError('')
    setCheckoutState(null)

    try {
      const response = await fetch('/api/commerce/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vipPackageId: packageId,
          couponCode: coupon,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.payment?.codeUrl) {
        throw new Error(payload?.error || '创建支付订单失败')
      }

      if (requestId !== checkoutRequestRef.current) {
        return
      }

      setCheckoutState({
        orderId: payload.order.id,
        orderNumber: payload.order.orderNumber,
        status: payload.order.status,
        codeUrl: payload.payment.codeUrl,
      })
      setAppliedCouponCode(coupon || '')
    } catch (error) {
      if (requestId !== checkoutRequestRef.current) {
        return
      }

      setCheckoutError(error instanceof Error ? error.message : '创建支付订单失败')
    } finally {
      if (requestId === checkoutRequestRef.current) {
        setCheckingOut(false)
      }
    }
  }

  function closeCheckoutModal() {
    checkoutRequestRef.current += 1
    setSelectedPackageId(null)
    setCheckoutState(null)
    setCheckoutError('')
    setSelectedCouponCode('')
    setAppliedCouponCode('')
    setCouponOptionsLoading(false)
    setCheckingOut(false)
    setPollingStatus(false)
  }

  function beginCheckout(packageId: string) {
    setCouponOptionsByPackageId(current => {
      if (!(packageId in current)) {
        return current
      }

      const next = { ...current }
      delete next[packageId]
      return next
    })
    setSelectedPackageId(packageId)
    setCheckoutState(null)
    setCheckoutError('')
    setSelectedCouponCode('')
    setAppliedCouponCode('')
    void requestCheckout(packageId)
  }

  async function openCheckout(packageId: string) {
    if (!auth.authenticated) {
      const authed = await ensureAuthenticated()
      if (authed) {
        beginCheckout(packageId)
        return
      }

      setPendingPackageId(packageId)
      setLoginModalOpen(true)
      return
    }

    beginCheckout(packageId)
  }

  async function handleLoginSuccess() {
    invalidateAuthSnapshotCache()
    const latestAuth = await refreshAuth()
    router.refresh()
    setLoginModalOpen(false)

    if (latestAuth.authenticated && pendingPackageId) {
      const packageId = pendingPackageId
      setPendingPackageId(null)
      beginCheckout(packageId)
      return
    }

    setPendingPackageId(null)
  }

  function refreshCheckoutQrCode(nextCouponCode?: string) {
    if (!selectedPackageId || checkingOut) {
      return
    }

    void requestCheckout(selectedPackageId, nextCouponCode || undefined)
  }

  const showQrPlaceholder = checkingOut || Boolean(checkoutState)
  const qrDisplayValue = checkoutState?.codeUrl || 'WECHAT-PAY-QR-PLACEHOLDER'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Pricing &amp; Plans</p>
          <h1 className={styles.title}>
            选择最适合你的<span className={styles.titleAccent}>职场加速方案</span>
          </h1>
          <p className={styles.subtitle}>首版已切到真实套餐配置和微信 Native 支付，后续价格与时长可直接在后台维护。</p>
        </div>

        <div className={styles.cardsGrid}>
          {resolvedPlans.map(plan => (
            <article
              key={plan.id}
              className={[
                styles.card,
                plan.tone === 'featured' ? styles.cardFeatured : '',
                plan.tone === 'soft' ? styles.cardSoft : '',
              ].join(' ')}
            >
              {plan.badge ? <span className={styles.badge}>{plan.badge}</span> : null}

              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{plan.name}</h2>
                <p className={styles.cardHint}>{plan.subtitle}</p>
              </div>

              {plan.strikePrice ? <p className={styles.strikePrice}>{plan.strikePrice}</p> : null}

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
                onClick={() => {
                  if (plan.id === EMPTY_STATE_PLAN.id) {
                    return
                  }
                  void openCheckout(plan.id)
                }}
                disabled={plan.id === EMPTY_STATE_PLAN.id}
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
            这版开始，套餐、优惠券、订单、回调发放都已经独立成后台能力。你看到的是面向真实支付闭环的首版界面，不再是静态占位文案。
          </p>
        </section>
      </div>

      <Modal
        open={Boolean(selectedPlan)}
        onClose={closeCheckoutModal}
        title={selectedPlan ? `开通 ${selectedPlan.name}` : '开通会员'}
        panelClassName={styles.checkoutModalPanel}
        contentClassName={styles.checkoutModalBody}
      >
        {selectedPlan ? (
          <div className={styles.checkoutBody}>
            <div className={styles.checkoutInfoColumn}>
              <div className={styles.checkoutSummary}>
                <div className={styles.checkoutSummaryTop}>
                  <div>
                    <p className={styles.checkoutSummaryEyebrow}>会员卡</p>
                    <p className={styles.checkoutTitle}>{selectedPlan.name}</p>
                  </div>
                  {selectedPlan.badge ? <span className={styles.checkoutSummaryMark}>{selectedPlan.badge}</span> : null}
                </div>

                <div className={styles.checkoutSummaryBottom}>
                  <div className={styles.checkoutSummaryPriceBlock}>
                    {appliedCoupon ? <p className={styles.checkoutPriceMeta}>原价 {selectedPlan.price}</p> : null}
                    <div className={styles.checkoutPriceRow}>
                      <span className={styles.checkoutPrice}>{formatMoney(activePriceFen)}</span>
                      <span className={styles.checkoutPeriod}>{selectedPlan.period}</span>
                    </div>
                  </div>
                  {appliedCoupon ? <p className={styles.checkoutDiscountBadge}>- {formatMoney(activeDiscountFen)}</p> : null}
                </div>
                <p className={styles.checkoutSubtitle}>{selectedPlan.subtitle}</p>
              </div>

              {selectedPlan.features.length > 0 ? (
                <div className={styles.checkoutBenefitRow}>
                    {selectedPlan.features.slice(0, 3).map(feature => (
                      <div key={feature.text} className={styles.checkoutBenefitItem}>
                        <Check size={15} className={styles.checkoutBenefitIcon} />
                        <span>{feature.text}</span>
                      </div>
                    ))}
                </div>
              ) : null}

              <div className={styles.checkoutCouponCard}>
                <div className={styles.checkoutCouponHeader}>
                  <p className={styles.checkoutSectionTitle}>优惠码</p>
                  <Select
                    className={styles.checkoutCouponSelect}
                    value={selectedCouponCode}
                    onChange={event => {
                      const nextCouponCode = event.target.value
                      setSelectedCouponCode(nextCouponCode)
                      setAppliedCouponCode(nextCouponCode)
                      refreshCheckoutQrCode(nextCouponCode)
                    }}
                    disabled={checkingOut || couponOptionsLoading || selectedCouponOptions.length === 0}
                    options={[
                      {
                        value: '',
                        label: couponOptionsLoading ? '优惠券加载中' : selectedCouponOptions.length > 0 ? '无代金券' : '暂无代金券',
                      },
                      ...selectedCouponOptions.map(option => ({
                        value: option.code,
                        label: `${option.name} · -${formatMoney(option.discountAmountFen)}`,
                      })),
                    ]}
                  />
                </div>

                {checkoutError ? <p className={styles.checkoutError}>{checkoutError}</p> : null}
              </div>
            </div>

            <div className={styles.checkoutPaymentColumn}>
              <p className={styles.checkoutSectionEyebrow}>微信 Native 支付</p>

              <div className={styles.checkoutQrFrame}>
                {showQrPlaceholder ? (
                  <>
                    <QrCodeSvg
                      value={qrDisplayValue}
                      size={252}
                      className={styles.checkoutQrImage}
                    />
                    {checkingOut && !checkoutState ? (
                      <div className={styles.checkoutQrMask}>
                        <LoaderCircle size={24} className={styles.spin} />
                        <span>生成中</span>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className={styles.checkoutQrPlaceholder}>
                    <span>二维码</span>
                  </div>
                )}
              </div>

              <div className={styles.checkoutQrText}>
                <p className={styles.checkoutQrHeadline}>微信扫码支付</p>
                <p className={styles.checkoutQrAmount}>{formatMoney(activePriceFen)}</p>
                {checkoutState?.orderNumber ? (
                  <p className={styles.checkoutQrDescription}>订单号：{checkoutState.orderNumber}</p>
                ) : null}
                <p className={styles.checkoutQrStatus}>
                  状态：
                  {checkingOut && !checkoutState
                    ? '等待支付'
                    : checkoutState
                      ? formatCheckoutStatus(checkoutState.status)
                      : '等待支付'}
                </p>
                {pollingStatus ? <p className={styles.checkoutPolling}>等待支付结果…</p> : null}
                {checkoutError ? (
                  <button
                    type="button"
                    className={styles.checkoutInlineAction}
                    onClick={() => refreshCheckoutQrCode(selectedCouponCode)}
                    disabled={!selectedPackageId}
                  >
                    重新生成二维码
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={loginModalOpen}
        onClose={() => {
          setLoginModalOpen(false)
          setPendingPackageId(null)
        }}
        title="登录后开通"
        panelClassName={styles.loginModalPanel}
        contentClassName={styles.loginModalContent}
      >
        <LoginPanel
          mode="modal"
          nextPath="/pricing"
          onSuccess={() => handleLoginSuccess()}
        />
      </Modal>
    </div>
  )
}
