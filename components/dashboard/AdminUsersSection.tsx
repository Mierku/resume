'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Activity,
  RefreshCcw,
  Search,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react'
import { SearchField } from '@/components/ui/SearchField'
import { Skeleton } from '@/components/ui/Skeleton'
import { getUserDisplayName, isAdminRole } from '@/lib/user'
import { formatAuthProviderLabels } from '@/lib/auth-provider-labels'
import { cn } from '@/lib/utils'
import styles from './dashboard-workbench.module.scss'
import adminStyles from './admin-users-section.module.scss'

interface AdminUserSummary {
  totalUsers: number
  adminUsers: number
  activeMembers: number
  resumesTotal: number
  recordsTotal: number
  recentSignups: number
}

interface AdminUserUsageRow {
  id: string
  displayName: string | null
  email: string | null
  image: string | null
  role: 'user' | 'admin' | 'super_admin'
  membershipPlan: 'basic' | 'pro' | 'elite'
  membershipExpiresAt: string | null
  onboardingCompleted: boolean
  providers: string[]
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
  metrics: {
    recordsTotal: number
    resumesTotal: number
    dataSourcesTotal: number
    aiConversationsTotal: number
    jobSitesTotal: number
    sessionsTotal: number
  }
}

interface AdminUsersDashboardData {
  query: string
  summary: AdminUserSummary
  users: AdminUserUsageRow[]
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value: string | null) {
  if (!value) {
    return '暂无'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '暂无'
  }

  return dateTimeFormatter.format(parsed)
}

function getRoleLabel(role: AdminUserUsageRow['role']) {
  if (role === 'super_admin') return '超级管理员'
  if (role === 'admin') return '管理员'
  return '普通用户'
}

function getMembershipLabel(plan: AdminUserUsageRow['membershipPlan'], role: AdminUserUsageRow['role']) {
  if (isAdminRole(role)) return '无限制'
  if (plan === 'elite') return '畅享会员'
  if (plan === 'pro') return 'PRO 会员'
  return '基础用户'
}

function getMembershipExpiresLabel(value: string | null, role: AdminUserUsageRow['role']) {
  if (isAdminRole(role)) {
    return '不受限制'
  }

  return formatDate(value)
}

export function AdminUsersSection() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdminSectionActive = searchParams.get('section') === 'admin-users'
  const activeQuery = searchParams.get('q')?.trim() || ''
  const [searchDraft, setSearchDraft] = useState(activeQuery)
  const [data, setData] = useState<AdminUsersDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setSearchDraft(activeQuery)
  }, [activeQuery])

  useEffect(() => {
    if (!isAdminSectionActive) {
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError('')

      try {
        const params = new URLSearchParams()
        if (activeQuery) {
          params.set('q', activeQuery)
        }

        const response = await fetch(`/api/admin/users-dashboard?${params.toString()}`, {
          cache: 'no-store',
        })

        if (response.status === 401) {
          throw new Error('登录状态已失效，请重新登录后继续。')
        }

        if (response.status === 403) {
          throw new Error('只有管理员可以访问这部分内容。')
        }

        if (!response.ok) {
          throw new Error('管理后台数据加载失败')
        }

        const payload = await response.json().catch(() => null)
        if (cancelled) return

        setData(payload as AdminUsersDashboardData)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load admin dashboard data:', error)
        setLoadError(error instanceof Error ? error.message : '管理后台数据加载失败')
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
  }, [activeQuery, isAdminSectionActive, refreshKey])

  const summaryCards = useMemo(() => {
    if (!data) {
      return []
    }

    return [
      {
        key: 'users',
        label: '用户总数',
        value: String(data.summary.totalUsers),
        subtext: `最近 7 天新增 ${data.summary.recentSignups}`,
        icon: Users,
        iconClassName: styles.metricIconBlue,
      },
      {
        key: 'admins',
        label: '管理员',
        value: String(data.summary.adminUsers),
        subtext: '含 admin / super_admin',
        icon: Shield,
        iconClassName: adminStyles.metricIconPurple,
      },
      {
        key: 'members',
        label: '活跃会员',
        value: String(data.summary.activeMembers),
        subtext: '有效的 PRO / 畅享用户',
        icon: Sparkles,
        iconClassName: styles.metricIconAmber,
      },
      {
        key: 'usage',
        label: '全站使用量',
        value: String(data.summary.recordsTotal),
        subtext: `投递记录，简历 ${data.summary.resumesTotal}`,
        icon: Activity,
        iconClassName: styles.metricIconGreen,
      },
    ]
  }, [data])

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextQuery = searchDraft.trim()
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('section', 'admin-users')

    if (nextQuery) {
      nextParams.set('q', nextQuery)
    } else {
      nextParams.delete('q')
    }

    router.replace(`/dashboard?${nextParams.toString()}`, { scroll: false })
  }

  return (
    <div className={styles.sectionShell}>
      <header className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.sectionEyebrow}>Admin Console</span>
          <div className={styles.sectionHeadingRow}>
            <h1 className={styles.sectionTitle}>管理后台</h1>
            <span className={styles.sectionPill}>仅管理员可见</span>
          </div>
          <p className={styles.sectionDescription}>
            现在后台已经收口到个人工作台里，方便你直接在同一套侧边栏里查看用户规模、会员状态和站内使用情况。
          </p>
        </div>

        <div className={styles.sectionHeaderActions}>
          <div className={adminStyles.adminBadge}>
            <Shield size={14} />
            admin / super_admin
          </div>
          <button
            type="button"
            className={cn(styles.buttonBase, styles.secondaryButton)}
            onClick={() => setRefreshKey(current => current + 1)}
          >
            <RefreshCcw size={14} />
            刷新
          </button>
        </div>
      </header>

      {loading && !data ? (
        <>
          <section className={styles.metricGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className={styles.loadingPanel} />
            ))}
          </section>
          <section className={styles.tableSkeleton}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className={styles.skeletonRow} />
            ))}
          </section>
        </>
      ) : loadError && !data ? (
        <section className={cn(styles.panel, styles.stateCard)}>
          <h2 className={styles.stateTitle}>管理后台暂时不可用</h2>
          <p className={styles.stateText}>{loadError}</p>
          <div className={styles.stateActions}>
            <button
              type="button"
              className={cn(styles.buttonBase, styles.secondaryButton)}
              onClick={() => setRefreshKey(current => current + 1)}
            >
              重新加载
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.metricGrid}>
            {summaryCards.map(card => {
              const Icon = card.icon

              return (
                <article key={card.key} className={styles.metricCard}>
                  <div className={styles.metricCardMain}>
                    <p className={styles.metricLabel}>{card.label}</p>
                    <p className={styles.metricValue}>{card.value}</p>
                    <p className={styles.metricSubtext}>{card.subtext}</p>
                  </div>
                  <span className={cn(styles.metricIconBubble, card.iconClassName)}>
                    <Icon className={styles.metricIcon} />
                  </span>
                </article>
              )
            })}
          </section>

          <section className={cn(styles.panel, styles.tablePanel)}>
            <div className={styles.panelHeader}>
              <div className={styles.viewTabs}>
                <button type="button" className={cn(styles.viewTab, styles.viewTabActive)}>
                  用户列表
                </button>
                <span className={adminStyles.resultsCount}>最近 100 个匹配用户</span>
              </div>

              <div className={styles.panelActions}>
                <form className={adminStyles.searchForm} onSubmit={handleSearchSubmit}>
                  <SearchField
                    value={searchDraft}
                    onChange={event => setSearchDraft(event.target.value)}
                    placeholder="搜索邮箱、昵称"
                    wrapperClassName={cn(adminStyles.searchField, styles.topSearchField)}
                    icon={<Search className={adminStyles.searchIcon} />}
                    className={styles.topSearchInput}
                  />
                  <button type="submit" className={cn(styles.buttonBase, styles.secondaryButton)}>
                    搜索
                  </button>
                </form>

                <button
                  type="button"
                  className={styles.toolbarIconButton}
                  onClick={() => setRefreshKey(current => current + 1)}
                  aria-label="刷新列表"
                  title="刷新列表"
                >
                  <RefreshCcw size={14} />
                </button>
              </div>
            </div>

            <div className={adminStyles.resultsMeta}>
              <span>筛选词：{data?.query || '全部用户'}</span>
              <span>当前统计来自已落库业务数据，不含细粒度行为埋点</span>
            </div>

            {loadError ? <p className={adminStyles.inlineError}>{loadError}</p> : null}

            {loading ? (
              <div className={styles.tableSkeleton}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className={styles.skeletonRow} />
                ))}
              </div>
            ) : data && data.users.length === 0 ? (
              <div className={cn(styles.stateCard, adminStyles.emptyState)}>
                <h3 className={styles.stateTitle}>没找到匹配的用户记录</h3>
                <p className={styles.stateText}>可以试试邮箱片段、昵称关键词，或者清空筛选重新查看最近注册的用户。</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>用户</th>
                      <th>身份 / 会员</th>
                      <th>核心资产</th>
                      <th>登录方式</th>
                      <th>最近登录</th>
                      <th>注册时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className={styles.companyCell}>
                            <div className={cn(styles.companyMark, adminStyles.avatarMark)}>
                              <span>
                                {getUserDisplayName({
                                  displayName: user.displayName,
                                  email: user.email,
                                }).slice(0, 1).toUpperCase()}
                              </span>
                            </div>
                            <div className={adminStyles.userIdentity}>
                              <p className={styles.companyName}>
                                {getUserDisplayName({
                                  displayName: user.displayName,
                                  email: user.email,
                                })}
                              </p>
                              <p className={styles.companyRole}>{user.email || '未绑定邮箱'}</p>
                              <p className={adminStyles.userMetaLine}>UID · {user.id}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={adminStyles.badgeStack}>
                            <span className={cn(styles.inlineTag, adminStyles.roleTag)} data-role={user.role}>
                              {getRoleLabel(user.role)}
                            </span>
                            <span
                              className={cn(styles.inlineTag, adminStyles.planTag)}
                              data-plan={isAdminRole(user.role) ? 'admin' : user.membershipPlan}
                            >
                              {getMembershipLabel(user.membershipPlan, user.role)}
                            </span>
                          </div>
                          <p className={adminStyles.metaText}>会员有效期：{getMembershipExpiresLabel(user.membershipExpiresAt, user.role)}</p>
                          <p className={adminStyles.metaText}>账号状态：{user.onboardingCompleted ? '资料完整' : '待完善'}</p>
                        </td>
                        <td>
                          <div className={adminStyles.metricsCompact}>
                            <span>投递 {user.metrics.recordsTotal}</span>
                            <span>简历 {user.metrics.resumesTotal}</span>
                            <span>数据源 {user.metrics.dataSourcesTotal}</span>
                          </div>
                          <p className={adminStyles.metaText}>
                            AI {user.metrics.aiConversationsTotal} / 站点 {user.metrics.jobSitesTotal} / 会话 {user.metrics.sessionsTotal}
                          </p>
                        </td>
                        <td>
                          <div className={adminStyles.providerText}>
                            {formatAuthProviderLabels(user.providers)}
                          </div>
                          <p className={adminStyles.metaText}>最近资料变更：{formatDate(user.updatedAt)}</p>
                        </td>
                        <td>
                          <div className={styles.updatedValue}>{formatDate(user.lastLoginAt)}</div>
                        </td>
                        <td>
                          <div className={styles.updatedValue}>{formatDate(user.createdAt)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
