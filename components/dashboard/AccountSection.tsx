'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, FileText, FolderKanban } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatAuthProviderLabels } from '@/lib/auth-provider-labels'
import { getUserDisplayName, isAdminRole, type SessionUser } from '@/lib/user'
import { cn } from '@/lib/utils'
import { getDashboardSectionHref } from '@/components/dashboard/types'
import { AccountBindingPanel } from '@/components/dashboard/AccountBindingPanel'
import styles from './dashboard-workbench.module.scss'

interface AccountSectionPayload {
  recordsTotal: number
  resumesTotal: number
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '长期有效'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '长期有效'
  }

  return dateFormatter.format(parsed)
}

function getMembershipLabel(rawPlan: string | null | undefined, role: SessionUser['role']) {
  if (role === 'super_admin') return '超级管理员账号'
  if (role === 'admin') return '管理员账号'

  const normalized = String(rawPlan || 'basic').toLowerCase()
  if (normalized === 'pro') return 'PRO 用户'
  if (normalized === 'elite') return '畅享用户'
  return '基础用户'
}

function getMembershipAccessLabel(value: string | null | undefined, role: SessionUser['role']) {
  if (isAdminRole(role)) {
    return '不受限制'
  }

  return formatDate(value)
}

export function AccountSection({
  user,
  recordsVersion,
}: {
  user: SessionUser
  recordsVersion: number
}) {
  const [payload, setPayload] = useState<AccountSectionPayload>({
    recordsTotal: 0,
    resumesTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError('')

      try {
        const [recordsStatsRes, resumesRes] = await Promise.all([
          fetch('/api/records/stats', { cache: 'no-store' }),
          fetch('/api/resumes', { cache: 'no-store' }),
        ])

        if (recordsStatsRes.status === 401 || resumesRes.status === 401) {
          throw new Error('登录状态已失效，请重新登录。')
        }

        if (!recordsStatsRes.ok || !resumesRes.ok) {
          throw new Error('账户信息加载失败')
        }

        const [recordsPayload, resumesPayload] = await Promise.all([
          recordsStatsRes.json().catch(() => null),
          resumesRes.json().catch(() => null),
        ])

        if (cancelled) return

        setPayload({
          recordsTotal: typeof recordsPayload?.total === 'number' ? recordsPayload.total : 0,
          resumesTotal: Array.isArray(resumesPayload?.resumes) ? resumesPayload.resumes.length : 0,
        })
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load account section data:', error)
        setLoadError(error instanceof Error ? error.message : '账户信息加载失败')
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
  }, [recordsVersion])

  const summaryCards = useMemo(() => {
    return [
      {
        key: 'records',
        label: '投递记录',
        value: String(payload.recordsTotal).padStart(2, '0'),
        subtext: '当前工作台累计同步的求职申请',
        icon: FolderKanban,
      },
      {
        key: 'resumes',
        label: '简历数量',
        value: String(payload.resumesTotal).padStart(2, '0'),
        subtext: '已保存的模板与岗位变体',
        icon: FileText,
      },
    ]
  }, [payload.recordsTotal, payload.resumesTotal])

  return (
    <div className={styles.sectionShell}>
      <header className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.sectionEyebrow}>Account Profile</span>
          <div className={styles.sectionHeadingRow}>
            <h1 className={styles.sectionTitle}>个人主页</h1>
            <span className={styles.sectionPill}>{getMembershipLabel(user.planType, user.role)}</span>
          </div>
          <p className={styles.sectionDescription}>
            账户中心汇总你的会员状态、登录方式与核心资产规模。现在也支持在这里补绑邮箱或微信，并在冲突时处理旧账号资产。
          </p>
        </div>
      </header>

      <section className={styles.accountGrid}>
        <article className={cn(styles.panel, styles.profileCard)}>
          <div className={styles.profileHero}>
            <div className={styles.profileAvatar}>
              {getUserDisplayName(user).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className={styles.profileName}>{getUserDisplayName(user)}</h2>
              <p className={styles.profileEmail}>{user.email || '未绑定邮箱'}</p>
            </div>
          </div>

          {loading ? (
            <div className={styles.profileMetaList}>
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className={styles.skeletonRow} />
              ))}
            </div>
          ) : loadError ? (
            <div className={styles.profileMetaList}>
              <p className={styles.resumeText}>{loadError}</p>
            </div>
          ) : (
            <>
              <div className={styles.profileMetaList}>
                <div className={styles.profileMetaItem}>
                  <span className={styles.profileMetaLabel}>会员等级</span>
                  <span className={styles.profileMetaValue}>{getMembershipLabel(user.planType, user.role)}</span>
                </div>
                <div className={styles.profileMetaItem}>
                  <span className={styles.profileMetaLabel}>会员有效期</span>
                  <span className={styles.profileMetaValue}>{getMembershipAccessLabel(user.planExpiresAt, user.role)}</span>
                </div>
                <div className={styles.profileMetaItem}>
                  <span className={styles.profileMetaLabel}>账号状态</span>
                  <span className={styles.profileMetaValue}>{user.onboardingCompleted ? '资料完整' : '待完善'}</span>
                </div>
                <div className={styles.profileMetaItem}>
                  <span className={styles.profileMetaLabel}>登录方式</span>
                  <span className={styles.profileMetaValue}>
                    {formatAuthProviderLabels(user.providers)}
                  </span>
                </div>
              </div>
              <AccountBindingPanel user={user} />
            </>
          )}
        </article>

        <div className={styles.quickActionGrid}>
          <article className={cn(styles.panel, styles.quickActionCard)}>
            <h2 className={styles.quickActionTitle}>快速入口</h2>
            <p className={styles.quickActionText}>在工作台内切换不同模块，或者继续进入原有编辑页面。</p>
            <div className={styles.quickActionList}>
              <Link href={getDashboardSectionHref('tracking')} className={styles.quickActionLink}>
                跳到求职跟踪
                <ArrowRight size={16} />
              </Link>
              <Link href={getDashboardSectionHref('resume')} className={styles.quickActionLink}>
                查看我的简历
                <ArrowRight size={16} />
              </Link>
              <Link href="/onboarding" className={styles.quickActionLink}>
                重新打开引导
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>

          <article className={cn(styles.panel, styles.quickActionCard)}>
            <h2 className={styles.quickActionTitle}>账户概览</h2>
            <p className={styles.quickActionText}>这里展示工作台当前的资产规模，帮助你快速判断资料完整度和求职推进状态。</p>

            {loading ? (
              <div className={styles.quickActionList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className={styles.skeletonRow} />
                ))}
              </div>
            ) : (
              <div className={styles.denseMetricGrid}>
                {summaryCards.map(card => {
                  const Icon = card.icon
                  return (
                    <article key={card.key} className={cn(styles.panel, styles.denseMetricCard)}>
                      <div className={styles.metricLabel}>
                        <Icon className={styles.metricIcon} />
                        {card.label}
                      </div>
                      <p className={styles.denseMetricValue}>{card.value}</p>
                      <p className={styles.metricSubtext}>{card.subtext}</p>
                    </article>
                  )
                })}
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  )
}
