'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity,
  BriefcaseBusiness,
  ChevronRight,
  CircleDashed,
  Plus,
  RefreshCcw,
  Send,
  SlidersHorizontal,
  Upload,
} from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Modal, AuthRequiredModal } from '@/components/ui/Modal'
import { SearchField } from '@/components/ui/SearchField'
import { Skeleton } from '@/components/ui/Skeleton'
import { RECORD_STATUS_OPTIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { getDashboardSectionHref } from '@/components/dashboard/types'
import styles from './dashboard-workbench.module.css'

type RecordStatus = 'pending' | 'submitted' | 'recorded' | 'abandoned'

interface TrackingRecord {
  id: string
  url: string
  host: string
  title: string
  companyName?: string | null
  location?: string | null
  salaryMin?: string | null
  salaryMax?: string | null
  faviconUrl?: string | null
  status: RecordStatus
  createdAt: string
  updatedAt: string
}

interface StatsPayload {
  total: number
  byStatus: Partial<Record<RecordStatus, number>>
}

interface RecordDraft {
  title: string
  companyName: string
  location: string
  salaryMin: string
  salaryMax: string
  host: string
  url: string
}

const PAGE_SIZE = 12

const STATUS_META: Record<RecordStatus, { label: string; className: string }> = {
  pending: { label: '待投递', className: styles.statusPending },
  submitted: { label: '已投递', className: styles.statusSubmitted },
  recorded: { label: '跟进中', className: styles.statusRecorded },
  abandoned: { label: '已放弃', className: styles.statusAbandoned },
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const rateFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  maximumFractionDigits: 0,
})

const emptyDraft: RecordDraft = {
  title: '',
  companyName: '',
  location: '',
  salaryMin: '',
  salaryMax: '',
  host: '',
  url: '',
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

function formatSalaryRange(record: Pick<TrackingRecord, 'salaryMin' | 'salaryMax'>) {
  if (record.salaryMin && record.salaryMax) {
    return `${record.salaryMin} - ${record.salaryMax}`
  }

  return record.salaryMin || record.salaryMax || '未填写'
}

function getHostFallback(host: string) {
  return host.slice(0, 2).toUpperCase()
}

function createDraftFromRecord(record: TrackingRecord): RecordDraft {
  return {
    title: record.title || '',
    companyName: record.companyName || '',
    location: record.location || '',
    salaryMin: record.salaryMin || '',
    salaryMax: record.salaryMax || '',
    host: record.host || '',
    url: record.url || '',
  }
}

function getStatusFilterLabel(statusFilter: string) {
  return RECORD_STATUS_OPTIONS.find(option => option.value === statusFilter)?.label || '筛选'
}

function normalizeRecordInput(draft: RecordDraft) {
  const trimmedTitle = draft.title.trim()
  const trimmedUrl = draft.url.trim()
  const trimmedHost = draft.host.trim()

  if (!trimmedTitle) {
    throw new Error('请填写岗位名称')
  }

  if (!trimmedUrl) {
    throw new Error('请填写岗位链接')
  }

  let parsedHost = ''
  try {
    parsedHost = new URL(trimmedUrl).host
  } catch {
    throw new Error('请输入有效的岗位链接')
  }

  const host = trimmedHost || parsedHost
  if (!host) {
    throw new Error('请填写站点域名')
  }

  return {
    title: trimmedTitle,
    companyName: draft.companyName.trim(),
    location: draft.location.trim(),
    salaryMin: draft.salaryMin.trim(),
    salaryMax: draft.salaryMax.trim(),
    host,
    url: trimmedUrl,
  }
}

export function TrackingSection({ onRecordsMutated }: { onRecordsMutated: () => void }) {
  const [records, setRecords] = useState<TrackingRecord[]>([])
  const [stats, setStats] = useState<StatsPayload>({ total: 0, byStatus: {} })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<RecordDraft | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createDraft, setCreateDraft] = useState<RecordDraft>(emptyDraft)
  const [creatingRecord, setCreatingRecord] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError('')

      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      params.set('offset', String(page * PAGE_SIZE))
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('query', searchQuery)

      try {
        const [recordsRes, statsRes] = await Promise.all([
          fetch(`/api/records?${params.toString()}`, { cache: 'no-store' }),
          fetch('/api/records/stats', { cache: 'no-store' }),
        ])

        if (recordsRes.status === 401 || statsRes.status === 401) {
          if (cancelled) return
          setShowAuthModal(true)
          setLoadError('登录状态已失效，请重新登录后继续。')
          setRecords([])
          setTotal(0)
          setStats({ total: 0, byStatus: {} })
          return
        }

        if (!recordsRes.ok || !statsRes.ok) {
          throw new Error('求职跟踪数据加载失败')
        }

        const recordsPayload = await recordsRes.json().catch(() => null)
        const statsPayload = await statsRes.json().catch(() => null)

        if (cancelled) return

        setRecords(Array.isArray(recordsPayload?.records) ? (recordsPayload.records as TrackingRecord[]) : [])
        setTotal(typeof recordsPayload?.total === 'number' ? recordsPayload.total : 0)
        setStats({
          total: typeof statsPayload?.total === 'number' ? statsPayload.total : 0,
          byStatus:
            statsPayload && typeof statsPayload === 'object' && statsPayload.byStatus && typeof statsPayload.byStatus === 'object'
              ? (statsPayload.byStatus as Partial<Record<RecordStatus, number>>)
              : {},
        })
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load dashboard tracking data:', error)
        setLoadError(error instanceof Error ? error.message : '求职跟踪数据加载失败')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [page, refreshKey, searchQuery, statusFilter])

  const summaryCards = useMemo(() => {
    const pending = stats.byStatus.pending || 0
    const submitted = stats.byStatus.submitted || 0
    const recorded = stats.byStatus.recorded || 0
    const activeRate = stats.total > 0 ? (submitted + recorded) / stats.total : 0

    return [
      {
        key: 'pending',
        label: '待投递',
        value: String(pending).padStart(2, '0'),
        toneClassName: styles.metricIconBlue,
        icon: CircleDashed,
      },
      {
        key: 'recorded',
        label: '跟进中',
        value: String(recorded).padStart(2, '0'),
        toneClassName: styles.metricIconAmber,
        icon: BriefcaseBusiness,
      },
      {
        key: 'submitted',
        label: '已投递',
        value: String(submitted).padStart(2, '0'),
        toneClassName: styles.metricIconGreen,
        icon: Send,
      },
      {
        key: 'active',
        label: '活跃率',
        value: rateFormatter.format(activeRate),
        toneClassName: styles.metricIconMuted,
        icon: Activity,
      },
    ]
  }, [stats])

  const editingRecord = editingRecordId ? records.find(record => record.id === editingRecordId) || null : null
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageStart = total === 0 ? 0 : page * PAGE_SIZE + 1
  const pageEnd = Math.min(total, page * PAGE_SIZE + records.length)
  const hasFilters = Boolean(searchQuery || statusFilter)

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(0)
    setSearchQuery(searchDraft.trim())
  }

  const handleRefresh = () => {
    setRefreshKey(current => current + 1)
  }

  const handleExport = async () => {
    setExporting(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('query', searchQuery)

      const response = await fetch(`/api/records/export?${params.toString()}`)
      if (response.status === 401) {
        setShowAuthModal(true)
        throw new Error('登录后可导出跟踪数据')
      }

      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = downloadUrl
      anchor.download = `tracking_${new Date().toISOString().split('T')[0]}.csv`
      anchor.click()
      window.URL.revokeObjectURL(downloadUrl)
      toast.success('跟踪数据已导出')
    } catch (error) {
      console.error('Failed to export tracking data:', error)
      toast.error(error instanceof Error ? error.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const handleStatusChange = async (id: string, nextStatus: string) => {
    const previousRecord = records.find(record => record.id === id)
    if (!previousRecord) {
      return
    }

    const normalizedStatus = nextStatus as RecordStatus
    if (previousRecord.status === normalizedStatus) {
      return
    }

    setRecords(current =>
      current.map(record =>
        record.id === id
          ? {
              ...record,
              status: normalizedStatus,
              updatedAt: new Date().toISOString(),
            }
          : record,
      ),
    )

    try {
      const response = await fetch(`/api/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: normalizedStatus }),
      })

      if (response.status === 401) {
        setShowAuthModal(true)
        throw new Error('登录后可更新状态')
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || '状态更新失败')
      }

      setStats(current => ({
        total: current.total,
        byStatus: {
          ...current.byStatus,
          [previousRecord.status]: Math.max(0, (current.byStatus[previousRecord.status] || 0) - 1),
          [normalizedStatus]: (current.byStatus[normalizedStatus] || 0) + 1,
        },
      }))
      toast.success('跟踪状态已更新')
    } catch (error) {
      setRecords(current =>
        current.map(record =>
          record.id === id
            ? {
                ...record,
                status: previousRecord.status,
                updatedAt: previousRecord.updatedAt,
              }
            : record,
        ),
      )
      toast.error(error instanceof Error ? error.message : '状态更新失败')
    }
  }

  const handleEditSave = async () => {
    if (!editingRecord || !editDraft) {
      return
    }

    let normalized: ReturnType<typeof normalizeRecordInput>
    try {
      normalized = normalizeRecordInput(editDraft)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '请检查记录信息')
      return
    }

    setSavingEdit(true)

    try {
      const response = await fetch(`/api/records/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      })

      if (response.status === 401) {
        setShowAuthModal(true)
        throw new Error('登录后可编辑记录')
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || '记录更新失败')
      }

      const payload = await response.json().catch(() => null)
      setRecords(current =>
        current.map(record => (record.id === editingRecord.id ? (payload?.record as TrackingRecord) : record)),
      )
      toast.success('记录已更新')
      setEditingRecordId(null)
      setEditDraft(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '记录更新失败')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleCreateSave = async () => {
    let normalized: ReturnType<typeof normalizeRecordInput>
    try {
      normalized = normalizeRecordInput(createDraft)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '请检查岗位信息')
      return
    }

    setCreatingRecord(true)

    try {
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalized),
      })

      if (response.status === 401) {
        setShowAuthModal(true)
        throw new Error('登录后可创建记录')
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || '创建记录失败')
      }

      setShowCreateModal(false)
      setCreateDraft(emptyDraft)
      setPage(0)
      setSearchDraft('')
      setSearchQuery('')
      setStatusFilter('')
      setRefreshKey(current => current + 1)
      onRecordsMutated()
      toast.success('已创建新的跟踪记录')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建记录失败')
    } finally {
      setCreatingRecord(false)
    }
  }

  return (
    <>
      <div className={styles.sectionShell}>
        <header className={styles.sectionHeader}>
          <div className={styles.sectionHeaderMain}>
            <div className={styles.sectionHeadingRow}>
              <h1 className={styles.sectionTitle}>所有申请</h1>
              <span className={styles.sectionPill}>{stats.total} Total</span>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className={styles.sectionHeaderActions}>
            <SearchField
              type="text"
              placeholder="快速搜索..."
              value={searchDraft}
              onChange={event => setSearchDraft(event.target.value)}
              wrapperClassName={styles.topSearchField}
              className={styles.topSearchInput}
            />
            <button
              type="button"
              className={styles.topCreateButton}
              onClick={() => setShowCreateModal(true)}
            >
              + 新建
            </button>
          </form>
        </header>

        <section className={styles.metricGrid}>
          {summaryCards.map(card => {
            const Icon = card.icon
            return (
              <article key={card.key} className={cn(styles.panel, styles.metricCard)}>
                <div className={styles.metricCardMain}>
                  <p className={styles.metricLabel}>{card.label}</p>
                  <p className={styles.metricValue}>{card.value}</p>
                </div>
                <div className={cn(styles.metricIconBubble, card.toneClassName)}>
                  <Icon className={styles.metricIcon} />
                </div>
              </article>
            )
          })}
        </section>

        <section className={cn(styles.panel, styles.tablePanel)}>
          <div className={styles.panelHeader}>
            <div className={styles.viewTabs}>
              <button type="button" className={cn(styles.viewTab, styles.viewTabActive)}>
                列表视图
              </button>
              <button type="button" className={styles.viewTab} disabled>
                看板视图
              </button>
            </div>

            <div className={styles.panelActions}>
              <label className={styles.filterTrigger}>
                <SlidersHorizontal size={14} />
                <span>{getStatusFilterLabel(statusFilter)}</span>
                <select
                  value={statusFilter}
                  onChange={event => {
                    setStatusFilter(event.target.value)
                    setPage(0)
                  }}
                  className={styles.filterOverlaySelect}
                  aria-label="筛选状态"
                >
                  <option value="">全部状态</option>
                  {RECORD_STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className={styles.toolbarIconButton}
                onClick={handleRefresh}
                aria-label="刷新列表"
                title="刷新列表"
              >
                <RefreshCcw size={14} />
              </button>
              <button
                type="button"
                className={styles.toolbarIconButton}
                onClick={() => void handleExport()}
                disabled={exporting}
                aria-label="导出 CSV"
                title="导出 CSV"
              >
                <Upload size={14} />
              </button>
            </div>
          </div>

          {loadError ? (
            <div className={styles.stateCard}>
              <h3 className={styles.stateTitle}>跟踪数据暂时不可用</h3>
              <p className={styles.stateText}>{loadError}</p>
              <div className={styles.stateActions}>
                <button type="button" className={cn(styles.buttonBase, styles.secondaryButton)} onClick={handleRefresh}>
                  重新加载
                </button>
                <Link href="/install" className={cn(styles.buttonBase, styles.primaryButton)}>
                  查看插件
                </Link>
              </div>
            </div>
          ) : loading && records.length === 0 ? (
            <div className={styles.tableSkeleton}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className={styles.skeletonRow} />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className={styles.stateCard}>
              <h3 className={styles.stateTitle}>还没有跟踪中的申请</h3>
              <p className={styles.stateText}>
                你可以手动创建一条岗位记录，也可以继续使用插件自动同步投递信息到这里。
              </p>
              <div className={styles.stateActions}>
                <button type="button" className={cn(styles.buttonBase, styles.primaryButton)} onClick={() => setShowCreateModal(true)}>
                  <Plus size={16} />
                  新建记录
                </button>
                <Link href="/install" className={cn(styles.buttonBase, styles.secondaryButton)}>
                  安装插件
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>公司 / 岗位</th>
                      <th>状态</th>
                      <th>薪资范围</th>
                      <th>更新时间</th>
                      <th className={styles.alignRight}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(record => {
                      const statusMeta = STATUS_META[record.status]
                      return (
                        <tr key={record.id}>
                          <td>
                            <div className={styles.companyCell}>
                              <div className={styles.companyMark}>
                                {record.faviconUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={record.faviconUrl} alt="" onError={event => { event.currentTarget.style.display = 'none' }} />
                                ) : (
                                  <span>{getHostFallback(record.host)}</span>
                                )}
                              </div>
                              <a href={record.url} target="_blank" rel="noreferrer" className={styles.companyLink}>
                                <p className={styles.companyName}>{record.companyName || record.host}</p>
                                <p className={styles.companyRole}>{record.title}</p>
                              </a>
                            </div>
                          </td>
                          <td>
                            <label className={cn(styles.statusControl, statusMeta.className)}>
                              <span className={styles.statusDot} />
                              <span>{statusMeta.label}</span>
                              <select
                                value={record.status}
                                onChange={event => void handleStatusChange(record.id, event.target.value)}
                                className={styles.statusOverlaySelect}
                                aria-label={`更新 ${record.title} 的状态`}
                              >
                                {RECORD_STATUS_OPTIONS.map(option => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </td>
                          <td>
                            <div className={styles.salaryValue}>{formatSalaryRange(record)}</div>
                          </td>
                          <td>
                            <div className={styles.updatedValue}>{formatDate(record.updatedAt)}</div>
                          </td>
                          <td className={styles.alignRight}>
                            <div className={styles.rowActions}>
                              <button
                                type="button"
                                className={styles.rowChevronButton}
                                onClick={() => {
                                  setEditingRecordId(record.id)
                                  setEditDraft(createDraftFromRecord(record))
                                }}
                                aria-label={`编辑 ${record.title}`}
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.pagination}>
                <div className={styles.paginationMeta}>
                  {hasFilters ? `筛选结果 ${pageStart}-${pageEnd} / ${total}` : `显示 ${pageStart}-${pageEnd} / 共 ${total} 条`}
                </div>
                <div className={styles.paginationActions}>
                  <button
                    type="button"
                    className={cn(styles.buttonBase, styles.secondaryButton)}
                    disabled={page === 0}
                    onClick={() => setPage(current => Math.max(0, current - 1))}
                  >
                    上一页
                  </button>
                  <button
                    type="button"
                    className={cn(styles.buttonBase, styles.secondaryButton)}
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(current => Math.min(totalPages - 1, current + 1))}
                  >
                    下一页
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        open={showCreateModal}
        onClose={() => {
          if (creatingRecord) return
          setShowCreateModal(false)
          setCreateDraft(emptyDraft)
        }}
        title="新建跟踪记录"
        panelClassName={styles.modalPanel}
        titleClassName={styles.modalTitle}
        closeButtonClassName={styles.modalClose}
        contentClassName={styles.modalBody}
        footer={
          <>
            <button
              type="button"
              className={cn(styles.buttonBase, styles.secondaryButton)}
              onClick={() => {
                if (creatingRecord) return
                setShowCreateModal(false)
                setCreateDraft(emptyDraft)
              }}
              disabled={creatingRecord}
            >
              取消
            </button>
            <button type="button" className={cn(styles.buttonBase, styles.primaryButton)} onClick={() => void handleCreateSave()}>
              {creatingRecord ? '创建中...' : '确认创建'}
            </button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>岗位名称</span>
            <Input
              value={createDraft.title}
              onChange={event => setCreateDraft(current => ({ ...current, title: event.target.value }))}
              className={styles.dashboardInput}
              placeholder="例如：Senior Software Engineer"
            />
          </label>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>公司名称</span>
            <Input
              value={createDraft.companyName}
              onChange={event => setCreateDraft(current => ({ ...current, companyName: event.target.value }))}
              className={styles.dashboardInput}
              placeholder="例如：Google"
            />
          </label>
          <label className={cn(styles.fieldGroup, styles.fieldGroupFull)}>
            <span className={styles.fieldLabel}>岗位链接</span>
            <Input
              value={createDraft.url}
              onChange={event => setCreateDraft(current => ({ ...current, url: event.target.value }))}
              className={styles.dashboardInput}
              placeholder="https://company.com/jobs/123"
            />
          </label>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>站点域名</span>
            <Input
              value={createDraft.host}
              onChange={event => setCreateDraft(current => ({ ...current, host: event.target.value }))}
              className={styles.dashboardInput}
              placeholder="company.com"
            />
          </label>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>工作地点</span>
            <Input
              value={createDraft.location}
              onChange={event => setCreateDraft(current => ({ ...current, location: event.target.value }))}
              className={styles.dashboardInput}
              placeholder="上海 / 远程"
            />
          </label>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>最低薪资</span>
            <Input
              value={createDraft.salaryMin}
              onChange={event => setCreateDraft(current => ({ ...current, salaryMin: event.target.value }))}
              className={styles.dashboardInput}
              placeholder="35k"
            />
          </label>
          <label className={styles.fieldGroup}>
            <span className={styles.fieldLabel}>最高薪资</span>
            <Input
              value={createDraft.salaryMax}
              onChange={event => setCreateDraft(current => ({ ...current, salaryMax: event.target.value }))}
              className={styles.dashboardInput}
              placeholder="50k"
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(editingRecord && editDraft)}
        onClose={() => {
          if (savingEdit) return
          setEditingRecordId(null)
          setEditDraft(null)
        }}
        title="编辑跟踪记录"
        panelClassName={styles.modalPanel}
        titleClassName={styles.modalTitle}
        closeButtonClassName={styles.modalClose}
        contentClassName={styles.modalBody}
        footer={
          <>
            <button
              type="button"
              className={cn(styles.buttonBase, styles.secondaryButton)}
              onClick={() => {
                if (savingEdit) return
                setEditingRecordId(null)
                setEditDraft(null)
              }}
              disabled={savingEdit}
            >
              取消
            </button>
            <button type="button" className={cn(styles.buttonBase, styles.primaryButton)} onClick={() => void handleEditSave()}>
              {savingEdit ? '保存中...' : '保存修改'}
            </button>
          </>
        }
      >
        {editDraft ? (
          <div className={styles.formGrid}>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>岗位名称</span>
              <Input
                value={editDraft.title}
                onChange={event => setEditDraft(current => (current ? { ...current, title: event.target.value } : current))}
                className={styles.dashboardInput}
              />
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>公司名称</span>
              <Input
                value={editDraft.companyName}
                onChange={event => setEditDraft(current => (current ? { ...current, companyName: event.target.value } : current))}
                className={styles.dashboardInput}
              />
            </label>
            <label className={cn(styles.fieldGroup, styles.fieldGroupFull)}>
              <span className={styles.fieldLabel}>岗位链接</span>
              <Input
                value={editDraft.url}
                onChange={event => setEditDraft(current => (current ? { ...current, url: event.target.value } : current))}
                className={styles.dashboardInput}
              />
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>站点域名</span>
              <Input
                value={editDraft.host}
                onChange={event => setEditDraft(current => (current ? { ...current, host: event.target.value } : current))}
                className={styles.dashboardInput}
              />
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>工作地点</span>
              <Input
                value={editDraft.location}
                onChange={event => setEditDraft(current => (current ? { ...current, location: event.target.value } : current))}
                className={styles.dashboardInput}
              />
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>最低薪资</span>
              <Input
                value={editDraft.salaryMin}
                onChange={event => setEditDraft(current => (current ? { ...current, salaryMin: event.target.value } : current))}
                className={styles.dashboardInput}
              />
            </label>
            <label className={styles.fieldGroup}>
              <span className={styles.fieldLabel}>最高薪资</span>
              <Input
                value={editDraft.salaryMax}
                onChange={event => setEditDraft(current => (current ? { ...current, salaryMax: event.target.value } : current))}
                className={styles.dashboardInput}
              />
            </label>
          </div>
        ) : null}
      </Modal>

      <AuthRequiredModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath={getDashboardSectionHref('tracking')}
      />
    </>
  )
}
