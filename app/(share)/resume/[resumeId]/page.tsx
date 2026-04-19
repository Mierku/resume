'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useParams } from 'next/navigation'
import { BrandFlowerIcon } from '@/components/BrandFlowerIcon'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import styles from '@/components/dashboard/dashboard-workbench.module.scss'
import { ResumeReactivePreview } from '@/components/resume-reactive-preview'
import { useResumeExport } from '@/components/resume-builder/hooks/useResumeExport'
import { ScrollShell } from '@/components/ui/ScrollShell'
import { ThemeMorphIcon } from '@/components/ui/ThemeMorphIcon'
import { normalizeResumeContent } from '@/lib/resume/mappers'
import type { ResumeData } from '@/lib/resume/types'
import shareStyles from './share-page.module.scss'

type ThemeMode = 'light' | 'dark'
const THEME_STORAGE_KEY = 'theme'

type PublicResumeResponse =
  | {
      status: 'visible'
      canDownload: boolean
      resume: {
        id: string
        title: string
        templateId: string
        content: unknown
      }
    }
  | {
      status: 'hidden'
      resumeId?: string
      title?: string
      message?: string
      detail?: string
    }

export default function ResumeSharePage() {
  const params = useParams<{ resumeId: string }>()
  const resumeId = typeof params.resumeId === 'string' ? params.resumeId : ''
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('分享简历')
  const [resumeData, setResumeData] = useState<ResumeData | null>(null)
  const [allowDownload, setAllowDownload] = useState(false)
  const [hiddenMessage, setHiddenMessage] = useState('此简历无法查看')
  const [hiddenDetail, setHiddenDetail] = useState('作者已经隐藏了简历')
  const [theme, setTheme] = useState<ThemeMode>('dark')
  const previewContentRef = useRef<HTMLDivElement>(null)
  const resumeTitleRef = useRef(title)

  useEffect(() => {
    resumeTitleRef.current = title
  }, [title])

  useEffect(() => {
    if (!resumeId) {
      setLoading(false)
      setResumeData(null)
      setAllowDownload(false)
      return
    }

    const controller = new AbortController()

    async function load() {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/resumes/${encodeURIComponent(resumeId)}/public`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        )

        const payload = (await response.json().catch(() => null)) as
          | PublicResumeResponse
          | null

        if (!payload || payload.status === 'hidden') {
          setResumeData(null)
          setAllowDownload(false)
          setTitle(payload?.title || '分享简历')
          setHiddenMessage(payload?.message || '此简历无法查看')
          setHiddenDetail(payload?.detail || '作者已经隐藏了简历')
          return
        }

        const normalized = normalizeResumeContent(payload.resume.content, {
          templateId: payload.resume.templateId,
          withBackup: true,
        })
        setResumeData(normalized.data)
        setAllowDownload(payload.canDownload)
        setTitle(payload.resume.title || '分享简历')
      } finally {
        setLoading(false)
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [resumeId])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const resolveTheme = (): ThemeMode => {
      const current = document.documentElement.getAttribute('data-theme')
      if (current === 'light' || current === 'dark') return current

      const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') return saved

      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    const syncTheme = () => {
      setTheme(resolveTheme())
    }

    syncTheme()
    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  const pageFormat = resumeData?.metadata.page.format || 'a4'
  const canViewResume = Boolean(resumeData)
  const canDownloadResume = canViewResume && allowDownload
  const isThemeDark = theme === 'dark'

  const { exporting, handleDownloadPdf } = useResumeExport({
    previewContentRef,
    resumeTitleRef,
    fallbackTitle: title,
    pageFormat,
    ensureAuthForAction: async () => canDownloadResume,
  })

  const handleThemeToggle = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    if (typeof window === 'undefined') return

    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light'

    document.documentElement.style.setProperty('--reveal-x', `${x}px`)
    document.documentElement.style.setProperty('--reveal-y', `${y}px`)
    document.documentElement.setAttribute('data-transition-to', nextTheme)

    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        document.documentElement.setAttribute('data-theme', nextTheme)
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
        setTheme(nextTheme)
      })
      transition.finished.finally(() => {
        document.documentElement.removeAttribute('data-transition-to')
      })
      return
    }

    document.documentElement.setAttribute('data-theme', nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    setTheme(nextTheme)
    document.documentElement.removeAttribute('data-transition-to')
  }, [theme])

  const desktopHeader = useMemo(
    () => (
      <>
        <div className={styles.desktopHeaderBrand}>
          <Link href='/' className={styles.brandMark} aria-label='返回首页'>
            <BrandFlowerIcon />
          </Link>
          <div className={styles.brandCopy}>
            <p className={shareStyles.shareBrandTitle}>沉浸式网申</p>
          </div>
        </div>
        <div className={styles.desktopHeaderMeta}>
          <button
            type='button'
            className={styles.themeToggleIconButton}
            onClick={handleThemeToggle}
            aria-label={isThemeDark ? '切换到亮色模式' : '切换到暗色模式'}
            title={isThemeDark ? '切换到亮色模式' : '切换到暗色模式'}
          >
            <ThemeMorphIcon isDark={isThemeDark} size={18} sunRadius={4} />
          </button>
          {canDownloadResume ? (
            <button
              type='button'
              className={styles.loginEntryButton}
              onClick={() => void handleDownloadPdf()}
              disabled={exporting}
            >
              {exporting ? '下载中...' : '下载简历'}
            </button>
          ) : null}
        </div>
      </>
    ),
    [canDownloadResume, exporting, handleDownloadPdf, handleThemeToggle, isThemeDark],
  )

  const mainContent = (
    <div className={`${styles.sectionFrame} ${shareStyles.mainFrame}`}>
      {loading ? (
        <div className={shareStyles.mainViewport}>
          <div className={shareStyles.previewSurface}>
            <ScrollShell
              className={`${shareStyles.previewScrollViewport} ${shareStyles.previewState}`}
              tone='panel'
              reveal='always'
              axis='y'
            >
              <p className={shareStyles.loadingText}>正在加载简历...</p>
            </ScrollShell>
          </div>
        </div>
      ) : resumeData ? (
        <div className={shareStyles.mainViewport}>
          <div ref={previewContentRef} className={shareStyles.previewSurface}>
            <ScrollShell className={shareStyles.previewScrollViewport} tone='panel' reveal='always' axis='y'>
              <ResumeReactivePreview data={resumeData} />
            </ScrollShell>
          </div>
        </div>
      ) : (
        <div className={shareStyles.mainViewport}>
          <div className={shareStyles.previewSurface}>
            <ScrollShell
              className={`${shareStyles.previewScrollViewport} ${shareStyles.previewState}`}
              tone='panel'
              reveal='always'
              axis='y'
            >
              <div className={shareStyles.hiddenCopy}>
                <h1 className={shareStyles.hiddenTitle}>{hiddenMessage}</h1>
                <p className={shareStyles.hiddenDetail}>{hiddenDetail}</p>
              </div>
            </ScrollShell>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <DashboardShell
      showSidebar={false}
      desktopHeader={desktopHeader}
      mainContent={mainContent}
    />
  )
}
