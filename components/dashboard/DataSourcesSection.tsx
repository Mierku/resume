'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Check, Database, Edit3, Plus, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import styles from './dashboard-workbench.module.css'

interface DataSource {
  id: string
  name: string
  langMode: string
  basics: {
    nameZh?: string
    email?: string
  }
  updatedAt: string
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

export function DataSourcesSection({
  initialDefaultDataSourceId,
  onDefaultDataSourceChange,
}: {
  initialDefaultDataSourceId: string | null
  onDefaultDataSourceChange: (nextDefaultDataSourceId: string | null) => void
}) {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [defaultDataSourceId, setDefaultDataSourceId] = useState<string | null>(initialDefaultDataSourceId)
  const [workingId, setWorkingId] = useState<string | null>(null)

  useEffect(() => {
    setDefaultDataSourceId(initialDefaultDataSourceId)
  }, [initialDefaultDataSourceId])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError('')

      try {
        const response = await fetch('/api/data-sources', { cache: 'no-store' })
        if (response.status === 401) {
          throw new Error('登录状态已失效，请重新登录。')
        }

        if (!response.ok) {
          throw new Error('数据源列表加载失败')
        }

        const payload = await response.json().catch(() => null)
        if (cancelled) return

        setDataSources(Array.isArray(payload?.dataSources) ? (payload.dataSources as DataSource[]) : [])
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load data sources:', error)
        setLoadError(error instanceof Error ? error.message : '数据源列表加载失败')
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
  }, [])

  const summaryCards = useMemo(() => {
    const recentUpdated = dataSources[0]?.updatedAt ? formatDate(dataSources[0].updatedAt) : '暂无'
    const defaultCount = defaultDataSourceId ? 1 : 0

    return [
      {
        key: 'total',
        label: '数据源总数',
        value: String(dataSources.length).padStart(2, '0'),
        subtext: '用于一键填表和生成简历',
        icon: Database,
      },
      {
        key: 'default',
        label: '默认已设置',
        value: String(defaultCount).padStart(2, '0'),
        subtext: defaultDataSourceId ? '当前已有默认数据源' : '当前未设置默认值',
        icon: Check,
      },
      {
        key: 'updated',
        label: '最近更新',
        value: recentUpdated,
        subtext: '最近一次资料维护时间',
        icon: Edit3,
      },
    ]
  }, [dataSources, defaultDataSourceId])

  const handleSetDefault = async (id: string) => {
    setWorkingId(id)

    try {
      const response = await fetch(`/api/data-sources/${id}/set-default`, {
        method: 'POST',
      })

      if (response.status === 401) {
        throw new Error('登录后才能设置默认数据源')
      }

      if (!response.ok) {
        throw new Error('设置默认数据源失败')
      }

      setDefaultDataSourceId(id)
      onDefaultDataSourceChange(id)
      toast.success('已设为默认数据源')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '设置默认数据源失败')
    } finally {
      setWorkingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('确定要删除这个数据源吗？关联的简历将取消关联。')
    if (!confirmed) {
      return
    }

    setWorkingId(id)

    try {
      const response = await fetch(`/api/data-sources/${id}`, {
        method: 'DELETE',
      })

      if (response.status === 401) {
        throw new Error('登录后才能删除数据源')
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || '删除失败')
      }

      setDataSources(current => current.filter(dataSource => dataSource.id !== id))

      const nextDefaultId = defaultDataSourceId === id ? null : defaultDataSourceId
      setDefaultDataSourceId(nextDefaultId)
      onDefaultDataSourceChange(nextDefaultId)
      toast.success('数据源已删除')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className={styles.sectionShell}>
      <header className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.sectionEyebrow}>Structured Data</span>
          <div className={styles.sectionHeadingRow}>
            <h1 className={styles.sectionTitle}>数据源</h1>
            <span className={styles.sectionPill}>{dataSources.length} 份资料</span>
          </div>
          <p className={styles.sectionDescription}>
            数据源是整个工作台的资料底座，负责承载你的基础信息、求职意向和结构化经历，用于一键填表和简历生成。
          </p>
        </div>

        <div className={styles.sectionHeaderActions}>
          <Link href="/resume/data-source/new" className={cn(styles.buttonBase, styles.primaryButton)}>
            <Plus size={16} />
            新建数据源
          </Link>
        </div>
      </header>

      <section className={styles.denseMetricGrid}>
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
      </section>

      {loadError ? (
        <section className={cn(styles.panel, styles.stateCard)}>
          <h2 className={styles.stateTitle}>数据源暂时不可用</h2>
          <p className={styles.stateText}>{loadError}</p>
        </section>
      ) : loading ? (
        <section className={styles.dataSourceList}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className={styles.loadingPanel} />
          ))}
        </section>
      ) : dataSources.length === 0 ? (
        <section className={cn(styles.panel, styles.stateCard)}>
          <h2 className={styles.stateTitle}>你还没有数据源</h2>
          <p className={styles.stateText}>先创建一份默认数据源，后续填写简历和自动填表都会直接复用它。</p>
          <div className={styles.stateActions}>
            <Link href="/resume/data-source/new" className={cn(styles.buttonBase, styles.primaryButton)}>
              创建第一份数据源
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.dataSourceList}>
          {dataSources.map(dataSource => {
            const isDefault = defaultDataSourceId === dataSource.id
            const profileText = [dataSource.basics?.nameZh, dataSource.basics?.email].filter(Boolean).join(' · ')

            return (
              <article key={dataSource.id} className={cn(styles.panel, styles.dataSourceCard)}>
                <div className={styles.dataSourceCardBody}>
                  <div>
                    <div className={styles.dataSourceTitleRow}>
                      <h2 className={styles.dataSourceName}>{dataSource.name}</h2>
                      {isDefault ? <span className={styles.inlineTag}>默认</span> : null}
                      <span className={styles.inlineTag}>{dataSource.langMode === 'zh' ? '中文' : 'English'}</span>
                    </div>
                    <p className={styles.dataSourceText}>{profileText || '尚未填写基础姓名或邮箱信息。'}</p>
                    <div className={styles.dataSourceMeta}>
                      <span className={styles.inlineTag}>更新于 {formatDate(dataSource.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.cardActionGrid}>
                  {!isDefault ? (
                    <button
                      type="button"
                      className={cn(styles.buttonBase, styles.secondaryButton)}
                      onClick={() => void handleSetDefault(dataSource.id)}
                      disabled={workingId === dataSource.id}
                    >
                      {workingId === dataSource.id ? '设置中...' : '设为默认'}
                    </button>
                  ) : null}
                  <Link href={`/resume/data-source/${dataSource.id}`} className={cn(styles.buttonBase, styles.secondaryButton)}>
                    编辑
                  </Link>
                  <button
                    type="button"
                    className={cn(styles.buttonBase, styles.secondaryButton, styles.dangerButton)}
                    onClick={() => void handleDelete(dataSource.id)}
                    disabled={workingId === dataSource.id}
                  >
                    <Trash2 size={16} />
                    删除
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
