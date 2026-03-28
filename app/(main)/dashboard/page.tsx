'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthedPageData } from '@/lib/hooks/useAuthedPageData'
import { getUserDisplayName, type SessionUser } from '@/lib/user'
import styles from './dashboard.module.css'

type RecordStatus = 'pending' | 'submitted' | 'recorded' | 'abandoned'

interface DataSource {
  id: string
  name: string
  updatedAt: string
}

interface TrackingRecord {
  id: string
  title: string
  companyName?: string | null
  host: string
  status: RecordStatus
  url?: string
  createdAt: string
  updatedAt: string
}

const STATUS_META: Record<RecordStatus, { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }> = {
  pending: { label: '草稿', tone: 'muted' },
  submitted: { label: '已投递', tone: 'ok' },
  recorded: { label: '面试中', tone: 'ok' },
  abandoned: { label: '已归档', tone: 'danger' },
}

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const planExpireFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function formatTime(value: string) {
  return timeFormatter.format(new Date(value))
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function toDestination(record: TrackingRecord) {
  if (record.url && /^https?:\/\//i.test(record.url)) {
    return record.url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
  }
  return record.host
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoadingFallback />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardLoadingFallback() {
  return (
    <div className={styles.loadingPage}>
      <div className={styles.loadingGrid}>
        <Skeleton className={styles.loadingCardTall} />
        <Skeleton className={styles.loadingCardTall} />
        <Skeleton className={styles.loadingCardTall} />
        <Skeleton className={styles.loadingTable} />
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [diagnosing, setDiagnosing] = useState(false)
  const [diagnosisLines, setDiagnosisLines] = useState<string[]>([])

  const nextPath = useMemo(() => {
    const query = searchParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  const loadDashboardData = useCallback(
    async ({ signal, auth }: { signal: AbortSignal; auth: { authenticated: boolean; user: SessionUser | null } }) => {
      if (!auth.authenticated) {
        return {
          defaultDataSource: null as DataSource | null,
          recentRecords: [] as TrackingRecord[],
        }
      }

      const [dsRes, recordsRes] = await Promise.all([
        fetch('/api/data-sources', { cache: 'no-store', signal }),
        fetch('/api/records?limit=6', { cache: 'no-store', signal }),
      ])

      if (dsRes.status === 401 || recordsRes.status === 401) {
        return {
          defaultDataSource: null as DataSource | null,
          recentRecords: [] as TrackingRecord[],
        }
      }

      if (!dsRes.ok || !recordsRes.ok) {
        throw new Error('加载个人工作台数据失败')
      }

      const defaultDataSourceId = auth.user?.defaultDataSourceId || null
      const dsPayload = await dsRes.json().catch(() => null)
      const sources = Array.isArray((dsPayload as { dataSources?: unknown[] } | null)?.dataSources)
        ? (((dsPayload as { dataSources?: unknown[] }).dataSources || []) as DataSource[])
        : []
      const pickedDefaultDataSource = sources.find(item => item.id === defaultDataSourceId) || sources[0] || null

      const recordsPayload = await recordsRes.json().catch(() => null)
      const records = Array.isArray((recordsPayload as { records?: unknown[] } | null)?.records)
        ? (((recordsPayload as { records?: unknown[] }).records || []) as TrackingRecord[])
        : []

      return {
        defaultDataSource: pickedDefaultDataSource,
        recentRecords: records,
      }
    },
    [],
  )

  const {
    data: dashboardData,
    loading,
    error,
    auth,
    reload,
  } = useAuthedPageData<
    { defaultDataSource: DataSource | null; recentRecords: TrackingRecord[] },
    SessionUser
  >({
    initialData: {
      defaultDataSource: null,
      recentRecords: [],
    },
    load: loadDashboardData,
    onError: loadError => {
      console.error('加载个人工作台数据失败:', loadError)
    },
  })

  const user = auth.user
  const authenticated = auth.authenticated
  const defaultDataSource = dashboardData.defaultDataSource
  const recentRecords = dashboardData.recentRecords

  useEffect(() => {
    if (loading) return
    if (authenticated) return
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`)
  }, [authenticated, loading, nextPath, router])

  const completionScore = useMemo(() => {
    let score = 42
    if (user?.onboardingCompleted) score += 16
    if (defaultDataSource) score += 18
    score += Math.min(recentRecords.length * 6, 22)
    score += Math.min(recentRecords.filter(item => item.companyName && item.title).length * 3, 12)
    return clamp(score, 18, 96)
  }, [defaultDataSource, recentRecords, user?.onboardingCompleted])

  const insightItems = useMemo(() => {
    const items: string[] = []

    if (!user?.onboardingCompleted) {
      items.push('新手引导未完成，关键字段映射仍存在空洞。')
    }
    if (!defaultDataSource) {
      items.push('未绑定默认数据源，建议先建立基础档案模板。')
    }

    const pendingCount = recentRecords.filter(item => item.status === 'pending').length
    if (pendingCount > 1) {
      items.push(`当前有 ${pendingCount} 条记录处于待投递状态，可优先清理。`)
    }

    if (recentRecords.length > 0) {
      items.push('建议针对高频岗位建立专用简历变体，提高首轮通过率。')
    }

    if (items.length === 0) {
      items.push('资料完整度较高，可转向提升岗位定制化内容。')
    }

    return items.slice(0, 3)
  }, [defaultDataSource, recentRecords, user?.onboardingCompleted])

  const liveInsights = useMemo(() => {
    if (recentRecords.length === 0) {
      return [
        {
          id: 'idle',
          level: 'notice' as const,
          time: formatTime(new Date().toISOString()),
          message: '暂无跟踪数据，等待首条投递信号。',
        },
      ]
    }

    return recentRecords.slice(0, 4).map(item => ({
      id: item.id,
      level: item.status === 'submitted' ? ('success' as const) : item.status === 'abandoned' ? ('warn' as const) : ('notice' as const),
      time: formatTime(item.updatedAt),
      message: `${STATUS_META[item.status].label}: ${item.title || item.host} (${item.companyName || item.host})`,
    }))
  }, [recentRecords])

  const renderStatusClassName = (tone: 'ok' | 'warn' | 'danger' | 'muted') => {
    if (tone === 'ok') return styles.statusOk
    if (tone === 'warn') return styles.statusWarn
    if (tone === 'danger') return styles.statusDanger
    return styles.statusMuted
  }

  const runDiagnosis = async () => {
    if (diagnosing) return
    setDiagnosing(true)
    setDiagnosisLines([])

    await new Promise(resolve => window.setTimeout(resolve, 900))

    const next: string[] = []

    if (!user?.onboardingCompleted) {
      next.push('引导阶段尚未完成，建议先跑通基础配置。')
    } else {
      next.push('基础身份与投递上下文字段已完成校验。')
    }

    if (defaultDataSource) {
      next.push(`默认数据源「${defaultDataSource.name}」可直接参与自动填报。`)
    } else {
      next.push('缺少默认数据源，批量投递能力受限。')
    }

    const pendingCount = recentRecords.filter(item => item.status === 'pending').length
    if (pendingCount > 0) {
      next.push(`检测到 ${pendingCount} 条待投递记录，建议按优先级批量推进。`)
    } else {
      next.push('当前追踪记录无积压，节奏稳定。')
    }

    setDiagnosisLines(next.slice(0, 3))
    setDiagnosing(false)
  }

  const providerLabel = user?.providers && user.providers.length > 0
    ? user.providers.map(item => item.toUpperCase()).join(' / ')
    : '未识别'

  const rawPlan = String(user?.planType || 'basic').toLowerCase()
  const membershipPlan: 'basic' | 'pro' | 'elite' =
    rawPlan === 'pro' || rawPlan === 'elite' ? rawPlan : 'basic'
  const membershipLabel = membershipPlan === 'pro' ? 'PRO 用户' : membershipPlan === 'elite' ? '畅享用户' : '基础用户'
  const membershipPaid = membershipPlan !== 'basic'
  const membershipExpireText = (() => {
    if (!membershipPaid) return null
    if (!user?.planExpiresAt) return '长期有效'
    const parsed = new Date(user.planExpiresAt)
    if (Number.isNaN(parsed.getTime())) return '长期有效'
    return planExpireFormatter.format(parsed)
  })()

  if (loading || !authenticated) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingGrid}>
          <Skeleton className={styles.loadingCardTall} />
          <Skeleton className={styles.loadingCardTall} />
          <Skeleton className={styles.loadingCardTall} />
          <Skeleton className={styles.loadingTable} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingGrid}>
          <article className={`${styles.glassCard} ${styles.analysisCard}`}>
            <div className={styles.sectionTitle}>
              <span>加载失败</span>
            </div>
            <p className={styles.scoreDesc}>{error}</p>
            <button type="button" className={styles.reportButton} onClick={reload}>
              重试加载
            </button>
          </article>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.gridBg} aria-hidden />

      <div className={styles.shell}>
        <main className={styles.workbench}>
          <section className={styles.metricsGrid}>
            <article className={`${styles.glassCard} ${styles.profileCard}`}>
              <div className={styles.sectionTitle}>
                <span>个人信息</span>
                <Link href="/resume/data-source" className={styles.sectionAction}>
                  管理资料
                </Link>
              </div>

              <div className={styles.profileBody}>
                <div className={styles.profileIdentity}>
                  <div className={styles.profileAvatar}>
                    {(user ? getUserDisplayName(user) : '用户').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className={styles.profileName}>{user ? getUserDisplayName(user) : '已登录用户'}</p>
                    <p className={styles.profileEmail}>{user?.email || '未绑定邮箱'}</p>
                  </div>
                </div>

                <dl className={styles.profileMeta}>
                  <div>
                    <dt>会员等级</dt>
                    <dd>{membershipLabel}</dd>
                  </div>
                  {membershipPaid ? (
                    <div>
                      <dt>会员有效期</dt>
                      <dd>{membershipExpireText}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>默认数据源</dt>
                    <dd>{defaultDataSource?.name || '未设置'}</dd>
                  </div>
                  <div>
                    <dt>账号状态</dt>
                    <dd>{user?.onboardingCompleted ? '资料完整' : '待完善'}</dd>
                  </div>
                  <div>
                    <dt>投递记录</dt>
                    <dd>{recentRecords.length} 条</dd>
                  </div>
                  <div>
                    <dt>登录方式</dt>
                    <dd>{providerLabel}</dd>
                  </div>
                </dl>

                <div className={styles.profileActions}>
                  <Link href="/resume/my-resumes" className={styles.profileAction}>
                    我的简历
                  </Link>
                  <Link href="/resume/data-source" className={styles.profileAction}>
                    数据源
                  </Link>
                </div>
              </div>
            </article>

            <article className={`${styles.glassCard} ${styles.resumeCard}`}>
              <div className={styles.sectionTitle}>
                <span>简历矩阵</span>
                <Link href="/resume/data-source" className={styles.sectionAction}>
                  编辑列表
                </Link>
              </div>

              <div className={styles.resumeList}>
                {defaultDataSource ? (
                  <Link href={`/resume/data-source/${defaultDataSource.id}`} className={styles.resumeItem}>
                    <div>
                      <p>{defaultDataSource.name}.json</p>
                      <span>最近同步：{formatDate(defaultDataSource.updatedAt)}</span>
                    </div>
                    <em className={styles.badgeActive}>已启用</em>
                  </Link>
                ) : (
                  <Link href="/resume/data-source" className={styles.resumeItem}>
                    <div>
                      <p>创建默认数据源</p>
                      <span>最近同步：未初始化</span>
                    </div>
                    <em>初始化</em>
                  </Link>
                )}

                <Link href="/resume/templates" className={styles.resumeItem}>
                  <div>
                    <p>岗位定制简历.pdf</p>
                    <span>最近同步：{recentRecords[0] ? formatDate(recentRecords[0].updatedAt) : '待同步'}</span>
                  </div>
                  <em>{recentRecords.length > 0 ? '备份' : '待处理'}</em>
                </Link>
              </div>
            </article>

            <article className={`${styles.glassCard} ${styles.liveCard}`}>
              <div className={styles.sectionTitle}>
                <span>实时洞察</span>
                <span className={styles.liveBadge}>实时</span>
              </div>

              <div className={styles.liveFeed}>
                {liveInsights.map(item => (
                  <div key={item.id} className={styles.liveItem}>
                    <span className={styles.liveTime}>{item.time}</span>
                    <p className={`${styles.liveText} ${item.level === 'success' ? styles.statusOk : item.level === 'warn' ? styles.statusWarn : styles.statusMuted}`}>
                      {item.message}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className={styles.workspaceSplit}>
            <article className={`${styles.glassCard} ${styles.analysisCard}`}>
              <div className={styles.sectionTitle}>
                <span>分析概览</span>
                <span className={styles.liveDot}>●</span>
              </div>

              <div className={styles.scoreArea}>
                <div className={styles.scoreNum}>
                  {completionScore}
                  <span>%</span>
                </div>
                <div className={styles.divider} />
                <p className={styles.scoreDesc}>{insightItems[0] || '简历完整度极高，核心技能与当前招聘趋势重合度保持在高位。'}</p>
              </div>

              <div className={styles.diagnosisList}>
                {(diagnosisLines.length > 0 ? diagnosisLines : insightItems.slice(1)).map((line, index) => (
                  <p key={`${line}-${index}`}>{line}</p>
                ))}
              </div>

              <button
                type="button"
                className={styles.reportButton}
                onClick={() => void runDiagnosis()}
                disabled={diagnosing}
              >
                {diagnosing ? '诊断中...' : '生成诊断报告'}
              </button>
            </article>

            <section className={`${styles.glassCard} ${styles.trackingCard}`}>
              <div className={styles.sectionTitle}>
                <span>求职跟踪</span>
                <div className={styles.filterTabs}>
                  <span className={styles.filterActive}>全部</span>
                  <span>面试中</span>
                  <span>已归档</span>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>职位与公司</th>
                      <th>目标地址</th>
                      <th className={styles.alignCenter}>当前状态</th>
                      <th className={styles.alignRight}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.length > 0 ? (
                      recentRecords.map(record => {
                        const meta = STATUS_META[record.status] || STATUS_META.pending
                        const isExternal = Boolean(record.url && /^https?:\/\//i.test(record.url))

                        return (
                          <tr key={record.id}>
                            <td>
                              <div className={styles.positionCell}>
                                <p>{record.title || '未命名职位'}</p>
                                <span>{record.companyName || record.host}</span>
                              </div>
                            </td>
                            <td>
                              <span className={styles.destination}>{toDestination(record)}</span>
                            </td>
                            <td className={styles.alignCenter}>
                              <span className={`${styles.statusBadge} ${renderStatusClassName(meta.tone)}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td className={styles.alignRight}>
                              {isExternal ? (
                                <a className={styles.manageLink} href={record.url} target="_blank" rel="noreferrer">
                                  管理
                                </a>
                              ) : (
                                <Link className={styles.manageLink} href="/tracking">
                                  管理
                                </Link>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className={styles.emptyCell}>
                          暂无投递记录，前往 <Link href="/tracking">跟踪页</Link> 创建首条任务。
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        </main>
      </div>

      <button type="button" className={styles.aiFab} aria-label="打开 AI 助手">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
      </button>
    </div>
  )
}
