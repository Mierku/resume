'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AuthRequiredModal, Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { RECORD_STATUS_OPTIONS } from '@/lib/constants'
import { toast } from '@/lib/toast'
import styles from './tracking-page.module.css'

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

interface EditRecordDraft {
  title: string
  companyName: string
  location: string
  salaryMin: string
  salaryMax: string
  host: string
  url: string
}

const PAGE_SIZE = 12
const HEADER_HEIGHT = 56
const TIMELINE_STEPS: ReadonlyArray<{ value: RecordStatus; label: string }> = [
  { value: 'pending', label: '未投递' },
  { value: 'submitted', label: '已投递' },
  { value: 'recorded', label: '跟进中' },
  { value: 'abandoned', label: '已放弃' },
]
const LINEAR_STATUS_FLOW: RecordStatus[] = ['pending', 'submitted', 'recorded']

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(dateString: string) {
  return dateFormatter.format(new Date(dateString))
}

function formatSalaryRange(record: TrackingRecord) {
  if (record.salaryMin && record.salaryMax) {
    return `${record.salaryMin} - ${record.salaryMax}`
  }

  return record.salaryMin || record.salaryMax || ''
}

function createEditDraft(record: TrackingRecord): EditRecordDraft {
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

function getTimelineStepState(currentStatus: RecordStatus, step: RecordStatus) {
  if (currentStatus === 'abandoned') {
    return step === 'abandoned' ? 'active' : 'upcoming'
  }

  if (step === 'abandoned') {
    return 'upcoming'
  }

  const currentIndex = LINEAR_STATUS_FLOW.indexOf(currentStatus)
  const stepIndex = LINEAR_STATUS_FLOW.indexOf(step)

  if (stepIndex < currentIndex) {
    return 'complete'
  }

  if (stepIndex === currentIndex) {
    return 'active'
  }

  return 'upcoming'
}

function getTimelineConnectorState(currentStatus: RecordStatus, nextStep: RecordStatus) {
  if (currentStatus === 'abandoned' || nextStep === 'abandoned') {
    return 'upcoming'
  }

  return LINEAR_STATUS_FLOW.indexOf(nextStep) <= LINEAR_STATUS_FLOW.indexOf(currentStatus)
    ? 'complete'
    : 'upcoming'
}

function getHostFallback(host: string) {
  return host.slice(0, 2).toUpperCase()
}

export default function TrackingPageClient() {
  return <TrackingDeck />
}

function TrackingDeck() {
  const [records, setRecords] = useState<TrackingRecord[]>([])
  const [stats, setStats] = useState<StatsPayload>({ total: 0, byStatus: {} })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isToolbarStuck, setIsToolbarStuck] = useState(false)
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditRecordDraft | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const toolbarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.documentElement.dataset.page = 'tracking'
    document.body.dataset.page = 'tracking'
    document.documentElement.dataset.trackingToolbarStuck = 'false'

    return () => {
      if (document.documentElement.dataset.page === 'tracking') {
        delete document.documentElement.dataset.page
      }

      if (document.documentElement.dataset.trackingToolbarStuck) {
        delete document.documentElement.dataset.trackingToolbarStuck
      }

      document.documentElement.style.removeProperty('--tracking-toolbar-bleed-height')

      if (document.body.dataset.page === 'tracking') {
        delete document.body.dataset.page
      }
    }
  }, [])

  useEffect(() => {
    const toolbar = toolbarRef.current
    if (!toolbar) {
      return
    }

    const syncToolbarHeight = () => {
      document.documentElement.style.setProperty(
        '--tracking-toolbar-bleed-height',
        `${Math.ceil(toolbar.getBoundingClientRect().height)}px`
      )
    }

    syncToolbarHeight()

    const resizeObserver = new ResizeObserver(() => {
      syncToolbarHeight()
    })

    resizeObserver.observe(toolbar)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

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
          fetch(`/api/records?${params}`),
          fetch('/api/records/stats'),
        ])

        if (recordsRes.status === 401) {
          if (cancelled) {
            return
          }

          setRequiresLogin(true)
          setRecords([])
          setTotal(0)
          setStats({ total: 0, byStatus: {} })
          return
        }

        if (!recordsRes.ok) {
          throw new Error('跟踪数据加载失败')
        }

        const recordsPayload = await recordsRes.json()
        const statsPayload = statsRes.ok
          ? ((await statsRes.json()) as StatsPayload)
          : { total: 0, byStatus: {} as Partial<Record<RecordStatus, number>> }

        if (cancelled) {
          return
        }

        setRequiresLogin(false)
        setRecords(recordsPayload.records || [])
        setTotal(recordsPayload.total || 0)
        setStats({
          total: statsPayload.total || 0,
          byStatus: statsPayload.byStatus || {},
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        console.error('Failed to load tracking data:', error)
        setLoadError(error instanceof Error ? error.message : '跟踪数据加载失败')
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

  useEffect(() => {
    let frame = 0

    const updateToolbarState = () => {
      frame = 0

      const toolbar = toolbarRef.current
      if (!toolbar) {
        return
      }

      const nextIsStuck = toolbar.getBoundingClientRect().top <= HEADER_HEIGHT + 1
      setIsToolbarStuck((current) => (current === nextIsStuck ? current : nextIsStuck))
    }

    const requestUpdate = () => {
      if (frame) {
        return
      }

      frame = window.requestAnimationFrame(updateToolbarState)
    }

    updateToolbarState()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame)
      }

      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.trackingToolbarStuck = isToolbarStuck ? 'true' : 'false'
  }, [isToolbarStuck])

  const summaryCards = useMemo(() => {
    const submitted = stats.byStatus.submitted || 0
    const recorded = stats.byStatus.recorded || 0
    const pending = stats.byStatus.pending || 0
    const abandoned = stats.byStatus.abandoned || 0

    return [
      { key: 'total', label: '累计跟踪', value: stats.total || 0 },
      { key: 'submitted', label: '已投递', value: submitted },
      { key: 'recorded', label: '跟进中', value: recorded },
      { key: 'pending', label: '未投递', value: pending },
      { key: 'abandoned', label: '已放弃', value: abandoned },
    ]
  }, [stats])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = Boolean(searchQuery || statusFilter)
  const editingRecord = editingRecordId ? records.find(record => record.id === editingRecordId) || null : null

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPage(0)
    setSearchQuery(searchDraft.trim())
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPage(0)
  }

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1)
  }

  const openEditModal = (record: TrackingRecord) => {
    if (requiresLogin) {
      setShowAuthModal(true)
      toast.message('登录后可编辑跟踪记录')
      return
    }

    setEditingRecordId(record.id)
    setEditDraft(createEditDraft(record))
  }

  const closeEditModal = () => {
    if (savingEdit) {
      return
    }

    setEditingRecordId(null)
    setEditDraft(null)
  }

  const handleClearFilters = () => {
    setSearchDraft('')
    setSearchQuery('')
    setStatusFilter('')
    setPage(0)
  }

  const handleExport = async () => {
    setExporting(true)

    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('query', searchQuery)

      const response = await fetch(`/api/records/export?${params}`)
      if (response.status === 401) {
        setRequiresLogin(true)
        setShowAuthModal(true)
        toast.message('登录后可导出跟踪数据')
        return
      }
      if (!response.ok) {
        throw new Error('导出失败')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `tracking_${new Date().toISOString().split('T')[0]}.csv`
      anchor.click()
      window.URL.revokeObjectURL(url)
      toast.success('跟踪数据已导出')
    } catch (error) {
      console.error('Failed to export records:', error)
      toast.error(error instanceof Error ? error.message : '导出失败')
    } finally {
      setExporting(false)
    }
  }

  const handleRecordStatusChange = async (id: string, nextStatus: string) => {
    const previousRecord = records.find((record) => record.id === id)
    if (!previousRecord) {
      return
    }

    const previousStatus = previousRecord.status
    const normalizedStatus = nextStatus as RecordStatus

    if (previousStatus === normalizedStatus) {
      return
    }

    setRecords((current) =>
      current.map((record) =>
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
        setRequiresLogin(true)
        setShowAuthModal(true)
        throw new Error('登录后可更新状态')
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || '状态更新失败')
      }

      setStats((current) => ({
        total: current.total,
        byStatus: {
          ...current.byStatus,
          [previousStatus]: Math.max(0, (current.byStatus[previousStatus] || 0) - 1),
          [normalizedStatus]: (current.byStatus[normalizedStatus] || 0) + 1,
        },
      }))
      toast.success('跟踪状态已更新')
    } catch (error) {
      setRecords((current) =>
        current.map((record) =>
          record.id === id
            ? {
                ...record,
                status: previousStatus,
                updatedAt: previousRecord.updatedAt,
              }
            : record,
        ),
      )
      toast.error(error instanceof Error ? error.message : '状态更新失败')
    }
  }

  const handleEditDraftChange = (field: keyof EditRecordDraft, value: string) => {
    setEditDraft(current => (current ? { ...current, [field]: value } : current))
  }

  const handleEditSave = async () => {
    if (!editingRecord || !editDraft) {
      return
    }

    const trimmedTitle = editDraft.title.trim()
    const trimmedUrl = editDraft.url.trim()

    if (!trimmedTitle) {
      toast.error('请填写岗位名称')
      return
    }

    if (!trimmedUrl) {
      toast.error('请填写岗位链接')
      return
    }

    let normalizedHost = editDraft.host.trim()

    try {
      const parsedUrl = new URL(trimmedUrl)
      if (!normalizedHost) {
        normalizedHost = parsedUrl.host
      }
    } catch {
      toast.error('请输入有效的岗位链接')
      return
    }

    setSavingEdit(true)

    try {
      const response = await fetch(`/api/records/${editingRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trimmedTitle,
          companyName: editDraft.companyName.trim(),
          location: editDraft.location.trim(),
          salaryMin: editDraft.salaryMin.trim(),
          salaryMax: editDraft.salaryMax.trim(),
          host: normalizedHost,
          url: trimmedUrl,
        }),
      })

      if (response.status === 401) {
        setRequiresLogin(true)
        setShowAuthModal(true)
        throw new Error('登录后可编辑记录')
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || '记录更新失败')
      }

      const payload = await response.json()

      setRecords(current =>
        current.map(record => (record.id === editingRecord.id ? payload.record : record))
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

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroMain}>
              <div className={styles.heroCopy}>
                <span className={styles.eyebrow}>Job Tracking</span>
                <h1 className={styles.title}>求职跟踪页</h1>
                <p className={styles.description}>
                  统一查看公司、岗位、状态和链接，把求职跟踪集中收口到一个稳定、可维护的面板里。
                </p>
              </div>

              <div className={styles.heroActions}>
                <Link href="/job-sites" className={styles.primaryLink}>
                  管理招聘网站
                </Link>
                <Link href="/install" className={styles.secondaryLink}>
                  安装插件
                </Link>
                <Button type="button" onClick={handleExport} loading={exporting} className={styles.actionButton}>
                  导出跟踪 CSV
                </Button>
              </div>
            </div>

            <div className={styles.heroMeta}>
              <span className={styles.metaPill}>当前页 {records.length} 条</span>
              <span className={styles.metaPill}>按最近更新时间排序</span>
            </div>

            <div className={styles.metrics}>
              {summaryCards.map((card) => (
                <div key={card.key} className={styles.metricCard}>
                  <div className={styles.metricLabel}>{card.label}</div>
                  <div className={styles.metricValue}>{card.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={toolbarRef} className={styles.toolbar} data-stuck={isToolbarStuck ? 'true' : 'false'}>
          <div className={styles.toolbarInner}>
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <Input
                placeholder="搜索公司、岗位、域名或投递链接"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                className={styles.searchInput}
              />
              <Button type="submit" variant="outline" className={styles.searchButton}>
                搜索
              </Button>
            </form>

            <div className={styles.toolbarActions}>
              <Select
                value={statusFilter}
                onChange={(event) => handleStatusFilterChange(event.target.value)}
                options={[
                  { value: '', label: '全部状态' },
                  ...RECORD_STATUS_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label,
                  })),
                ]}
                className={styles.toolbarSelect}
              />
              <Button type="button" variant="outline" onClick={handleRefresh} className={styles.toolbarRefresh}>
                刷新
              </Button>
            </div>
          </div>
        </section>

        {requiresLogin ? (
          <section className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>登录后查看你的求职跟踪数据</h2>
            <p className={styles.emptyText}>
              跟踪页支持未登录访问，但记录详情、状态更新、编辑和导出需要先登录。
            </p>
            <div className={styles.emptyActions}>
              <Button type="button" onClick={() => setShowAuthModal(true)}>
                去登录
              </Button>
              <Link href="/install" className={styles.primaryLink}>
                先安装插件
              </Link>
            </div>
          </section>
        ) : loadError ? (
          <section className={styles.errorCard}>
            <h2 className={styles.errorTitle}>跟踪数据暂时不可用</h2>
            <p className={styles.errorText}>{loadError}</p>
            <div className={styles.emptyActions}>
              <Button type="button" onClick={handleRefresh}>
                重新加载
              </Button>
            </div>
          </section>
        ) : loading && records.length === 0 ? (
          <section className={styles.board}>
            <div className={styles.loadingGrid}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className={styles.skeletonCard} />
              ))}
            </div>
          </section>
        ) : records.length > 0 ? (
          <section className={styles.board}>
            <div className={styles.boardHeader}>
              <div>
                <div className={styles.boardTitle}>本页跟踪岗位</div>
                <div className={styles.boardCaption}>
                  {hasFilters ? '当前为筛选结果。' : '按最近更新时间展示。'}
                </div>
              </div>
              <div className={styles.boardCaption}>共 {total} 条记录</div>
            </div>

            {records.map((record, index) => {
              const salaryRange = formatSalaryRange(record)
              const companyName = record.companyName || record.host

              return (
                <article key={record.id} className={styles.entry} data-status={record.status}>
                  <div className={styles.entryFavicon}>
                    {record.faviconUrl ? (
                      <Image
                        src={record.faviconUrl}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span>{getHostFallback(record.host)}</span>
                    )}
                  </div>

                  <div className={styles.entryBody}>
                    <div className={styles.entryHeader}>
                      <div className={styles.entryTitleWrap}>
                        <div className={styles.entryTitleLine}>
                          <a
                            href={record.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.entryTitleLink}
                          >
                            <span className={styles.entryTitle}>{record.title}</span>
                          </a>
                          <div className={styles.entryIndex}>
                            #{String(page * PAGE_SIZE + index + 1).padStart(3, '0')}
                          </div>
                        </div>
                        <div className={styles.entryCompany}>{companyName}</div>
                      </div>

                      <div className={styles.entryStatusColumn}>
                        <div className={styles.entryTimeline} aria-label="投递状态时间线">
                          {TIMELINE_STEPS.map((step, stepIndex) => (
                            <div key={step.value} className={styles.entryTimelineItem}>
                              <button
                                type="button"
                                className={styles.entryTimelineStep}
                                data-state={getTimelineStepState(record.status, step.value)}
                                onClick={() => handleRecordStatusChange(record.id, step.value)}
                                aria-pressed={record.status === step.value}
                              >
                                <span className={styles.entryTimelineDot} />
                                <span className={styles.entryTimelineLabel}>{step.label}</span>
                              </button>
                              {stepIndex < TIMELINE_STEPS.length - 1 ? (
                                <span
                                  className={styles.entryTimelineConnector}
                                  data-state={getTimelineConnectorState(record.status, TIMELINE_STEPS[stepIndex + 1].value)}
                                  aria-hidden="true"
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                        <div className={styles.entryActionRow}>
                          <div className={styles.entryId}>ID: {record.id.slice(0, 8)}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={styles.entryEditButton}
                            onClick={() => openEditModal(record)}
                          >
                            编辑
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className={styles.entryMeta}>
                      {record.location ? <span>{record.location}</span> : null}
                      {salaryRange ? <span>{salaryRange}</span> : null}
                      <span>{record.host}</span>
                    </div>

                    <div className={styles.entryDivider} />

                    <div className={styles.entryFooter}>
                      <a
                        href={record.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.entryMetaLink}
                        title={record.url}
                      >
                        {record.url}
                      </a>
                      <div className={styles.entryTimestamps}>
                        <span>创建: {formatDate(record.createdAt)}</span>
                        <span>更新: {formatDate(record.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>
        ) : (
          <section className={styles.emptyState}>
            <h2 className={styles.emptyTitle}>
              {hasFilters ? '没有命中当前筛选条件' : '还没有任何求职跟踪'}
            </h2>
            <p className={styles.emptyText}>
              {hasFilters
                ? '清空搜索词或状态筛选后再试一次。'
                : '安装浏览器插件后，在岗位页打开求职跟踪 tab，确认预填信息后保存，新的记录会直接进入这里。'}
            </p>
            <div className={styles.emptyActions}>
              {hasFilters ? (
                <Button type="button" onClick={handleClearFilters}>
                  清空筛选
                </Button>
              ) : (
                <Link href="/install" className={styles.primaryLink}>
                  去安装插件
                </Link>
              )}
            </div>
          </section>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button type="button" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
              上一页
            </Button>
            <span className={styles.pageIndicator}>第 {page + 1} / {totalPages} 页</span>
            <Button
              type="button"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </div>
        )}

        <Modal
          open={Boolean(editingRecord && editDraft)}
          onClose={closeEditModal}
          title="编辑跟踪记录"
          footer={
            <>
              <Button type="button" variant="ghost" onClick={closeEditModal} disabled={savingEdit}>
                取消
              </Button>
              <Button type="button" onClick={handleEditSave} loading={savingEdit}>
                保存修改
              </Button>
            </>
          }
        >
          {editDraft ? (
            <div className={styles.editForm}>
              <label className={styles.editField}>
                <span className={styles.editLabel}>岗位名称</span>
                <Input
                  value={editDraft.title}
                  onChange={event => handleEditDraftChange('title', event.target.value)}
                  placeholder="请输入岗位名称"
                />
              </label>
              <label className={styles.editField}>
                <span className={styles.editLabel}>公司名称</span>
                <Input
                  value={editDraft.companyName}
                  onChange={event => handleEditDraftChange('companyName', event.target.value)}
                  placeholder="请输入公司名称"
                />
              </label>
              <div className={styles.editGrid}>
                <label className={styles.editField}>
                  <span className={styles.editLabel}>工作地点</span>
                  <Input
                    value={editDraft.location}
                    onChange={event => handleEditDraftChange('location', event.target.value)}
                    placeholder="请输入地点"
                  />
                </label>
                <label className={styles.editField}>
                  <span className={styles.editLabel}>域名</span>
                  <Input
                    value={editDraft.host}
                    onChange={event => handleEditDraftChange('host', event.target.value)}
                    placeholder="例如 jobs.example.com"
                  />
                </label>
              </div>
              <div className={styles.editGrid}>
                <label className={styles.editField}>
                  <span className={styles.editLabel}>最低薪资</span>
                  <Input
                    value={editDraft.salaryMin}
                    onChange={event => handleEditDraftChange('salaryMin', event.target.value)}
                    placeholder="例如 15K"
                  />
                </label>
                <label className={styles.editField}>
                  <span className={styles.editLabel}>最高薪资</span>
                  <Input
                    value={editDraft.salaryMax}
                    onChange={event => handleEditDraftChange('salaryMax', event.target.value)}
                    placeholder="例如 20K"
                  />
                </label>
              </div>
              <label className={styles.editField}>
                <span className={styles.editLabel}>岗位链接</span>
                <Input
                  value={editDraft.url}
                  onChange={event => handleEditDraftChange('url', event.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>
          ) : null}
        </Modal>
        <AuthRequiredModal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          redirectPath="/tracking"
        />
      </div>
    </div>
  )
}
