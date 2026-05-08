'use client'

import { useEffect, useMemo, useState } from 'react'
import { BadgeDollarSign, Pencil, Plus, Receipt, TicketPercent } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import styles from './dashboard-workbench.module.scss'
import adminStyles from './admin-users-section.module.scss'

type CommerceTab = 'packages' | 'coupons' | 'orders'

interface VipPackageRow {
  id: string
  code: string
  name: string
  subtitle?: string | null
  membershipPlan: 'basic' | 'pro' | 'elite'
  durationDays: number
  priceFen: number
  compareAtPriceFen?: number | null
  status: string
  isFeatured?: boolean
  badge?: string | null
  note?: string | null
  featureList?: string[] | null
  sortOrder?: number
}

interface CouponRow {
  id: string
  code: string
  name: string
  type: string
  status: string
  audience?: string
  amountFen?: number | null
  percentOff?: number | null
  thresholdFen?: number | null
  maxRedemptions?: number | null
  perUserLimit?: number | null
  startsAt?: string | null
  endsAt?: string | null
  vipPackageIds?: string[]
}

interface OrderRow {
  id: string
  orderNumber: string
  status: string
  packageNameSnapshot: string
  payableAmountFen: number
  createdAt: string
  manualReviewReason?: string | null
}

const COMMERCE_TABS: Array<{ key: CommerceTab; label: string; icon: typeof BadgeDollarSign }> = [
  { key: 'packages', label: '套餐', icon: BadgeDollarSign },
  { key: 'coupons', label: '优惠券', icon: TicketPercent },
  { key: 'orders', label: '订单', icon: Receipt },
]

function formatMoney(value: number) {
  return `¥${(value / 100).toFixed(2)}`
}

function fenToYuanInput(value: number | null | undefined) {
  if (!value) {
    return ''
  }

  return (value / 100).toFixed(2)
}

function yuanInputToFen(value: string) {
  const normalized = value.trim()
  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed * 100)
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '暂无'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function formatDateInput(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return parsed.toISOString().slice(0, 16)
}

function toIsoDateTime(value: string) {
  if (!value.trim()) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export function AdminCommerceSection() {
  const [activeTab, setActiveTab] = useState<CommerceTab>('packages')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [packages, setPackages] = useState<VipPackageRow[]>([])
  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [packageModalOpen, setPackageModalOpen] = useState(false)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<VipPackageRow | null>(null)
  const [selectedCoupon, setSelectedCoupon] = useState<CouponRow | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [packageDraft, setPackageDraft] = useState({
    code: '',
    name: '',
    subtitle: '',
    membershipPlan: 'pro',
    durationDays: '30',
    priceYuan: '25.00',
    compareAtPriceYuan: '',
    status: 'draft',
    note: '',
    featureList: '',
  })
  const [couponDraft, setCouponDraft] = useState({
    code: '',
    name: '',
    type: 'fixed_amount',
    status: 'draft',
    audience: 'all',
    amountFen: '',
    percentOff: '',
    thresholdFen: '',
    perUserLimit: '',
    maxRedemptions: '',
    startsAt: '',
    endsAt: '',
  })
  const [orderReason, setOrderReason] = useState('')
  const [bootstrappingDefaults, setBootstrappingDefaults] = useState(false)

  async function load() {
    setLoading(true)
    setError('')

    try {
      const [packageResponse, couponResponse, orderResponse] = await Promise.all([
        fetch('/api/admin/vip-packages', { cache: 'no-store' }),
        fetch('/api/admin/coupons', { cache: 'no-store' }),
        fetch('/api/admin/orders', { cache: 'no-store' }),
      ])

      if (!packageResponse.ok || !couponResponse.ok || !orderResponse.ok) {
        throw new Error('电商后台数据加载失败')
      }

      const [packagePayload, couponPayload, orderPayload] = await Promise.all([
        packageResponse.json(),
        couponResponse.json(),
        orderResponse.json(),
      ])

      setPackages((packagePayload.packages || []) as VipPackageRow[])
      setCoupons((couponPayload.coupons || []) as CouponRow[])
      setOrders((orderPayload.orders || []) as OrderRow[])
    } catch (loadError) {
      console.error('Failed to load admin commerce section:', loadError)
      setError(loadError instanceof Error ? loadError.message : '电商后台加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    void (async () => {
      await load()
      if (cancelled) return
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(
    () => ({
      packages: packages.length,
      coupons: coupons.length,
      orders: orders.length,
    }),
    [coupons.length, orders.length, packages.length],
  )

  function openCreatePackageModal() {
    setSelectedPackage(null)
    setPackageDraft({
      code: '',
      name: '',
      subtitle: '',
      membershipPlan: 'pro',
      durationDays: '30',
      priceYuan: '25.00',
      compareAtPriceYuan: '',
      status: 'draft',
      note: '',
      featureList: '',
    })
    setPackageModalOpen(true)
  }

  function openEditPackageModal(item: VipPackageRow) {
    setSelectedPackage(item)
    setPackageDraft({
      code: item.code,
      name: item.name,
      subtitle: item.subtitle || '',
      membershipPlan: item.membershipPlan,
      durationDays: String(item.durationDays),
      priceYuan: fenToYuanInput(item.priceFen),
      compareAtPriceYuan: fenToYuanInput(item.compareAtPriceFen),
      status: item.status,
      note: item.note || '',
      featureList: Array.isArray(item.featureList) ? item.featureList.join('\n') : '',
    })
    setPackageModalOpen(true)
  }

  function openCreateCouponModal() {
    setSelectedCoupon(null)
    setCouponDraft({
      code: '',
      name: '',
      type: 'fixed_amount',
      status: 'draft',
      audience: 'all',
      amountFen: '',
      percentOff: '',
      thresholdFen: '',
      perUserLimit: '',
      maxRedemptions: '',
      startsAt: '',
      endsAt: '',
    })
    setCouponModalOpen(true)
  }

  function openEditCouponModal(item: CouponRow) {
    setSelectedCoupon(item)
    setCouponDraft({
      code: item.code,
      name: item.name,
      type: item.type,
      status: item.status,
      audience: item.audience || 'all',
      amountFen: item.amountFen ? String(item.amountFen) : '',
      percentOff: item.percentOff ? String(item.percentOff) : '',
      thresholdFen: item.thresholdFen ? String(item.thresholdFen) : '',
      perUserLimit: item.perUserLimit ? String(item.perUserLimit) : '',
      maxRedemptions: item.maxRedemptions ? String(item.maxRedemptions) : '',
      startsAt: formatDateInput(item.startsAt),
      endsAt: formatDateInput(item.endsAt),
    })
    setCouponModalOpen(true)
  }

  function openOrderActionModal(item: OrderRow) {
    setSelectedOrder(item)
    setOrderReason(item.manualReviewReason || '')
    setOrderModalOpen(true)
  }

  async function handleSavePackage() {
    setSaving(true)
    setError('')

    try {
      const priceFen = yuanInputToFen(packageDraft.priceYuan)
      const compareAtPriceFen = yuanInputToFen(packageDraft.compareAtPriceYuan)

      if (!priceFen || priceFen <= 0) {
        throw new Error('请输入有效售价（元）')
      }

      const payload = {
        code: packageDraft.code.trim(),
        name: packageDraft.name.trim(),
        subtitle: packageDraft.subtitle.trim() || null,
        membershipPlan: packageDraft.membershipPlan,
        durationDays: Number(packageDraft.durationDays),
        priceFen,
        compareAtPriceFen,
        status: packageDraft.status,
        note: packageDraft.note.trim() || null,
        featureList: packageDraft.featureList
          .split(/\n+/)
          .map(item => item.trim())
          .filter(Boolean),
      }

      const url = selectedPackage
        ? `/api/admin/vip-packages/${selectedPackage.id}`
        : '/api/admin/vip-packages'
      const method = selectedPackage ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || '套餐保存失败')
      }

      setPackageModalOpen(false)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '套餐保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCoupon() {
    setSaving(true)
    setError('')

    try {
      const payload = {
        code: couponDraft.code.trim(),
        name: couponDraft.name.trim(),
        type: couponDraft.type,
        status: couponDraft.status,
        audience: couponDraft.audience,
        stackingRule: 'single_only',
        amountFen: couponDraft.amountFen.trim() ? Number(couponDraft.amountFen) : null,
        percentOff: couponDraft.percentOff.trim() ? Number(couponDraft.percentOff) : null,
        thresholdFen: couponDraft.thresholdFen.trim() ? Number(couponDraft.thresholdFen) : null,
        perUserLimit: couponDraft.perUserLimit.trim() ? Number(couponDraft.perUserLimit) : null,
        maxRedemptions: couponDraft.maxRedemptions.trim() ? Number(couponDraft.maxRedemptions) : null,
        startsAt: toIsoDateTime(couponDraft.startsAt),
        endsAt: toIsoDateTime(couponDraft.endsAt),
      }

      const url = selectedCoupon ? `/api/admin/coupons/${selectedCoupon.id}` : '/api/admin/coupons'
      const method = selectedCoupon ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || '优惠券保存失败')
      }

      setCouponModalOpen(false)
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '优惠券保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleOrderAction(action: 'close_unpaid' | 'mark_manual_review') {
    if (!selectedOrder) {
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          reason: orderReason.trim() || undefined,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || '订单操作失败')
      }

      setOrderModalOpen(false)
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : '订单操作失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleBootstrapDefaults() {
    setBootstrappingDefaults(true)
    setError('')

    try {
      const response = await fetch('/api/admin/vip-packages', {
        method: 'PUT',
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(result?.error || '默认套餐初始化失败')
      }
      await load()
    } catch (bootstrapError) {
      setError(bootstrapError instanceof Error ? bootstrapError.message : '默认套餐初始化失败')
    } finally {
      setBootstrappingDefaults(false)
    }
  }

  return (
    <section className={cn(styles.panel, styles.tablePanel)}>
      <div className={styles.panelHeader}>
        <div className={styles.viewTabs}>
          {COMMERCE_TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                type="button"
                className={cn(styles.viewTab, activeTab === tab.key && styles.viewTabActive)}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={14} />
                {tab.label}
                <span className={adminStyles.resultsCount}>{counts[tab.key]}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.panelActions}>
          {activeTab === 'packages' ? (
            <>
              <Button
                variant="outline"
                onClick={() => void handleBootstrapDefaults()}
                disabled={bootstrappingDefaults}
              >
                {bootstrappingDefaults ? '初始化中...' : '初始化默认套餐'}
              </Button>
              <Button onClick={openCreatePackageModal}>
                <Plus size={14} />
                新建套餐
              </Button>
            </>
          ) : null}
          {activeTab === 'coupons' ? (
            <Button onClick={openCreateCouponModal}>
              <Plus size={14} />
              新建优惠券
            </Button>
          ) : null}
        </div>
      </div>

      <div className={adminStyles.resultsMeta}>
        <span>订阅/价格配置位置：工作台 → 电商后台 → 套餐</span>
        <span>如果列表为空，先点“初始化默认套餐”；订单对网关拥有的状态只读</span>
      </div>

      {loading ? (
        <div className={styles.tableSkeleton}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.skeletonRow} />
          ))}
        </div>
      ) : error ? (
        <div className={cn(styles.stateCard, adminStyles.emptyState)}>
          <h3 className={styles.stateTitle}>电商后台暂时不可用</h3>
          <p className={styles.stateText}>{error}</p>
        </div>
      ) : activeTab === 'packages' ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>套餐</th>
                <th>权益</th>
                <th>价格</th>
                <th>状态</th>
                <th className={styles.alignRight}>操作</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className={adminStyles.userIdentity}>
                      <p className={styles.companyName}>{item.name}</p>
                      <p className={styles.companyRole}>{item.code}</p>
                    </div>
                  </td>
                  <td>
                    <p className={adminStyles.metaText}>
                      {item.membershipPlan.toUpperCase()} / {item.durationDays} 天
                    </p>
                  </td>
                  <td>
                    <div className={styles.updatedValue}>{formatMoney(item.priceFen)}</div>
                  </td>
                  <td>
                    <span className={cn(styles.inlineTag, adminStyles.planTag)}>{item.status}</span>
                  </td>
                  <td className={styles.alignRight}>
                    <button
                      type="button"
                      className={styles.toolbarIconButton}
                      onClick={() => openEditPackageModal(item)}
                      aria-label={`编辑套餐 ${item.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeTab === 'coupons' ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>优惠券</th>
                <th>类型</th>
                <th>状态</th>
                <th className={styles.alignRight}>操作</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className={adminStyles.userIdentity}>
                      <p className={styles.companyName}>{item.name}</p>
                      <p className={styles.companyRole}>{item.code}</p>
                    </div>
                  </td>
                  <td>
                    <div className={styles.updatedValue}>{item.type}</div>
                  </td>
                  <td>
                    <span className={cn(styles.inlineTag, adminStyles.roleTag)}>{item.status}</span>
                  </td>
                  <td className={styles.alignRight}>
                    <button
                      type="button"
                      className={styles.toolbarIconButton}
                      onClick={() => openEditCouponModal(item)}
                      aria-label={`编辑优惠券 ${item.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>订单号</th>
                <th>套餐</th>
                <th>金额</th>
                <th>状态</th>
                <th>创建时间</th>
                <th className={styles.alignRight}>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(item => (
                <tr key={item.id}>
                  <td>
                    <div className={styles.updatedValue}>{item.orderNumber}</div>
                  </td>
                  <td>
                    <p className={styles.companyName}>{item.packageNameSnapshot}</p>
                  </td>
                  <td>
                    <div className={styles.updatedValue}>{formatMoney(item.payableAmountFen)}</div>
                  </td>
                  <td>
                    <span className={cn(styles.inlineTag, adminStyles.planTag)}>{item.status}</span>
                  </td>
                  <td>
                    <div className={styles.updatedValue}>{formatDate(item.createdAt)}</div>
                  </td>
                  <td className={styles.alignRight}>
                    <button
                      type="button"
                      className={styles.toolbarIconButton}
                      onClick={() => openOrderActionModal(item)}
                      aria-label={`处理订单 ${item.orderNumber}`}
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={packageModalOpen}
        onClose={() => {
          if (saving) return
          setPackageModalOpen(false)
        }}
        title={selectedPackage ? '编辑套餐' : '新建套餐'}
        panelClassName={styles.modalPanel}
        titleClassName={styles.modalTitle}
        closeButtonClassName={styles.modalClose}
        contentClassName={styles.modalBody}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setPackageModalOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button onClick={() => void handleSavePackage()} disabled={saving}>
              {saving ? '保存中...' : '保存套餐'}
            </Button>
          </>
        }
      >
        <div className={styles.commerceFormGrid}>
          <label className={styles.commerceField}>
            <span className={styles.commerceFieldLabel}>套餐编码</span>
            <Input value={packageDraft.code} onChange={event => setPackageDraft(current => ({ ...current, code: event.target.value }))} placeholder="如 pro-30d" />
          </label>
          <label className={styles.commerceField}>
            <span className={styles.commerceFieldLabel}>套餐名称</span>
            <Input value={packageDraft.name} onChange={event => setPackageDraft(current => ({ ...current, name: event.target.value }))} placeholder="如 Pro 月卡" />
          </label>
          <label className={styles.commerceField}>
            <span className={styles.commerceFieldLabel}>副标题</span>
            <Input value={packageDraft.subtitle} onChange={event => setPackageDraft(current => ({ ...current, subtitle: event.target.value }))} placeholder="适合高频投递阶段" />
          </label>
          <div className={styles.viewTabs}>
            <select value={packageDraft.membershipPlan} onChange={event => setPackageDraft(current => ({ ...current, membershipPlan: event.target.value as 'basic' | 'pro' | 'elite' }))} className={styles.topSearchInput}>
              <option value="basic">basic</option>
              <option value="pro">pro</option>
              <option value="elite">elite</option>
            </select>
            <Input value={packageDraft.durationDays} onChange={event => setPackageDraft(current => ({ ...current, durationDays: event.target.value }))} placeholder="时长天数" />
          </div>
          <div className={styles.viewTabs}>
            <Input value={packageDraft.priceYuan} onChange={event => setPackageDraft(current => ({ ...current, priceYuan: event.target.value }))} placeholder="售价（元）" />
            <Input value={packageDraft.compareAtPriceYuan} onChange={event => setPackageDraft(current => ({ ...current, compareAtPriceYuan: event.target.value }))} placeholder="划线价（元）" />
          </div>
          <select value={packageDraft.status} onChange={event => setPackageDraft(current => ({ ...current, status: event.target.value }))} className={styles.topSearchInput}>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="disabled">disabled</option>
            <option value="archived">archived</option>
          </select>
          <textarea value={packageDraft.featureList} onChange={event => setPackageDraft(current => ({ ...current, featureList: event.target.value }))} className={styles.topSearchInput} placeholder="权益列表，每行一项" rows={6} />
          {error ? <p className={adminStyles.inlineError}>{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={couponModalOpen}
        onClose={() => {
          if (saving) return
          setCouponModalOpen(false)
        }}
        title={selectedCoupon ? '编辑优惠券' : '新建优惠券'}
        panelClassName={styles.modalPanel}
        titleClassName={styles.modalTitle}
        closeButtonClassName={styles.modalClose}
        contentClassName={styles.modalBody}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setCouponModalOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button onClick={() => void handleSaveCoupon()} disabled={saving}>
              {saving ? '保存中...' : '保存优惠券'}
            </Button>
          </>
        }
      >
        <div className={styles.commerceFormGrid}>
          <label className={styles.commerceField}>
            <span className={styles.commerceFieldLabel}>优惠码</span>
            <Input value={couponDraft.code} onChange={event => setCouponDraft(current => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="如 NEWUSER100" />
          </label>
          <label className={styles.commerceField}>
            <span className={styles.commerceFieldLabel}>优惠券名称</span>
            <Input value={couponDraft.name} onChange={event => setCouponDraft(current => ({ ...current, name: event.target.value }))} placeholder="新用户立减券" />
          </label>
          <div className={styles.viewTabs}>
            <select value={couponDraft.type} onChange={event => setCouponDraft(current => ({ ...current, type: event.target.value }))} className={styles.topSearchInput}>
              <option value="fixed_amount">fixed_amount</option>
              <option value="percentage">percentage</option>
              <option value="threshold_discount">threshold_discount</option>
            </select>
            <select value={couponDraft.status} onChange={event => setCouponDraft(current => ({ ...current, status: event.target.value }))} className={styles.topSearchInput}>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="disabled">disabled</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <div className={styles.viewTabs}>
            <Input value={couponDraft.amountFen} onChange={event => setCouponDraft(current => ({ ...current, amountFen: event.target.value }))} placeholder="减免金额（分）" />
            <input value={couponDraft.percentOff} onChange={event => setCouponDraft(current => ({ ...current, percentOff: event.target.value }))} className={styles.topSearchInput} placeholder="折扣百分比" />
            <Input value={couponDraft.thresholdFen} onChange={event => setCouponDraft(current => ({ ...current, thresholdFen: event.target.value }))} placeholder="门槛金额（分）" />
          </div>
          <div className={styles.viewTabs}>
            <input type="datetime-local" value={couponDraft.startsAt} onChange={event => setCouponDraft(current => ({ ...current, startsAt: event.target.value }))} className={styles.topSearchInput} />
            <input type="datetime-local" value={couponDraft.endsAt} onChange={event => setCouponDraft(current => ({ ...current, endsAt: event.target.value }))} className={styles.topSearchInput} />
          </div>
          <div className={styles.viewTabs}>
            <Input value={couponDraft.perUserLimit} onChange={event => setCouponDraft(current => ({ ...current, perUserLimit: event.target.value }))} placeholder="每人上限" />
            <Input value={couponDraft.maxRedemptions} onChange={event => setCouponDraft(current => ({ ...current, maxRedemptions: event.target.value }))} placeholder="总库存" />
          </div>
          {error ? <p className={adminStyles.inlineError}>{error}</p> : null}
        </div>
      </Modal>

      <Modal
        open={orderModalOpen}
        onClose={() => {
          if (saving) return
          setOrderModalOpen(false)
        }}
        title={selectedOrder ? `订单处理 · ${selectedOrder.orderNumber}` : '订单处理'}
        panelClassName={styles.modalPanel}
        titleClassName={styles.modalTitle}
        closeButtonClassName={styles.modalClose}
        contentClassName={styles.modalBody}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setOrderModalOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleOrderAction('mark_manual_review')}
              disabled={saving}
            >
              标记人工复核
            </Button>
            <Button
              onClick={() => void handleOrderAction('close_unpaid')}
              disabled={saving}
            >
              关闭未支付订单
            </Button>
          </>
        }
      >
        <div className={styles.commerceFormGrid}>
          <p className={adminStyles.metaText}>订单状态：{selectedOrder?.status || '未知'}</p>
          <p className={adminStyles.metaText}>套餐：{selectedOrder?.packageNameSnapshot || '未知'}</p>
          <textarea value={orderReason} onChange={event => setOrderReason(event.target.value)} className={styles.topSearchInput} placeholder="操作原因 / 复核备注" rows={5} />
          {error ? <p className={adminStyles.inlineError}>{error}</p> : null}
        </div>
      </Modal>
    </section>
  )
}
