'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, FilePlus2, FileText, Layers3, WandSparkles } from 'lucide-react'
import { RESUME_TEMPLATES } from '@/lib/constants'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'
import styles from './dashboard-workbench.module.css'

interface ResumeSummary {
  id: string
  title: string
  templateId: string
  updatedAt: string
  dataSourceId?: string | null
  dataSource?: {
    id: string
    name: string
  } | null
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

export function ResumesSection() {
  const [resumes, setResumes] = useState<ResumeSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError('')

      try {
        const response = await fetch('/api/resumes', { cache: 'no-store' })
        if (response.status === 401) {
          throw new Error('登录状态已失效，请重新登录。')
        }

        if (!response.ok) {
          throw new Error('简历列表加载失败')
        }

        const payload = await response.json().catch(() => null)
        if (cancelled) return

        setResumes(Array.isArray(payload?.resumes) ? (payload.resumes as ResumeSummary[]) : [])
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load resumes:', error)
        setLoadError(error instanceof Error ? error.message : '简历列表加载失败')
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
    const linkedDataSourceCount = new Set(resumes.map(resume => resume.dataSource?.id).filter(Boolean)).size
    const lastUpdated = resumes[0]?.updatedAt ? formatDate(resumes[0].updatedAt) : '暂无'

    return [
      {
        key: 'total',
        label: '已保存简历',
        value: String(resumes.length).padStart(2, '0'),
        subtext: '用于不同岗位与不同版本投递',
        icon: FileText,
      },
      {
        key: 'linked',
        label: '已关联数据源',
        value: String(linkedDataSourceCount).padStart(2, '0'),
        subtext: '可直接复用资料生成简历',
        icon: Layers3,
      },
      {
        key: 'updated',
        label: '最近更新',
        value: lastUpdated,
        subtext: '最近一次修改发生的时间',
        icon: WandSparkles,
      },
    ]
  }, [resumes])

  return (
    <div className={styles.sectionShell}>
      <header className={styles.sectionHeader}>
        <div className={styles.sectionHeaderMain}>
          <span className={styles.sectionEyebrow}>Resume Library</span>
          <div className={styles.sectionHeadingRow}>
            <h1 className={styles.sectionTitle}>简历资产</h1>
            <span className={styles.sectionPill}>{resumes.length} 份</span>
          </div>
          <p className={styles.sectionDescription}>
            这里集中管理你保存过的简历版本、模板预览和关联数据源。工作台保留总览与跳转，编辑仍进入原有简历编辑器。
          </p>
        </div>

        <div className={styles.sectionHeaderActions}>
          <Link href="/resume/templates" className={cn(styles.buttonBase, styles.secondaryButton)}>
            模板中心
          </Link>
          <Link href="/resume/templates" className={cn(styles.buttonBase, styles.primaryButton)}>
            <FilePlus2 size={16} />
            新建简历
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
          <h2 className={styles.stateTitle}>简历列表暂时不可用</h2>
          <p className={styles.stateText}>{loadError}</p>
        </section>
      ) : loading ? (
        <section className={styles.resumeGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className={styles.loadingPanel} />
          ))}
        </section>
      ) : resumes.length === 0 ? (
        <section className={cn(styles.panel, styles.stateCard)}>
          <h2 className={styles.stateTitle}>还没有保存过简历</h2>
          <p className={styles.stateText}>从模板中心选择一个模板开始，工作台会自动把你的已保存简历统一收纳在这里。</p>
          <div className={styles.stateActions}>
            <Link href="/resume/templates" className={cn(styles.buttonBase, styles.primaryButton)}>
              开始创建
            </Link>
          </div>
        </section>
      ) : (
        <section className={styles.resumeGrid}>
          {resumes.map(resume => {
            const template = RESUME_TEMPLATES.find(item => item.id === resume.templateId) || RESUME_TEMPLATES[0]

            return (
              <article key={resume.id} className={cn(styles.panel, styles.resumeCard)}>
                <Link href={`/resume/editor/${resume.id}`} className={styles.resumePreviewShell}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={template.preview}
                    alt={`${template.name} 模板预览`}
                    className={styles.resumePreview}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </Link>

                <div className={styles.resumeBody}>
                  <div>
                    <h2 className={styles.resumeTitle}>{resume.title}</h2>
                    <p className={styles.resumeText}>更新于 {formatDate(resume.updatedAt)}</p>
                  </div>

                  <div className={styles.resumeMeta}>
                    <span className={styles.inlineTag}>{template.name}</span>
                    <span className={styles.inlineTag}>{resume.dataSource?.name || '未关联数据源'}</span>
                  </div>

                  <div className={styles.cardActionGrid}>
                    <Link href={`/resume/editor/${resume.id}`} className={cn(styles.buttonBase, styles.primaryButton)}>
                      继续编辑
                      <ArrowUpRight size={15} />
                    </Link>
                    <Link href="/resume/templates" className={cn(styles.buttonBase, styles.secondaryButton)}>
                      再建一份
                    </Link>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
