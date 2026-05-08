'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Upload, X } from 'lucide-react'
import { Message } from '@/components/ui/radix-adapter'
import { ScrollShell } from '@/components/ui/ScrollShell'
import { ChromeWindow } from '@/components/ChromeWindow'
import Image from 'next/image'
import { toast } from '@/lib/toast'
import { DiagonalCircuitPulseCanvas } from './DiagonalCircuitPulseCanvas'
import s from '../landing.module.scss'


type LogoShape = 'square' | 'circle' | 'ring' | 'pill' | 'stack'

const platformLogos: Array<{ label: string; mark: string; shape: LogoShape }> = [
  { label: 'LINKEDIN', mark: 'in', shape: 'square' },
  { label: 'BOSS ZHIPIN', mark: 'B', shape: 'square' },
  { label: 'ZHAOPIN', mark: 'Z', shape: 'circle' },
  { label: '51JOB', mark: '51', shape: 'stack' },
  { label: 'LIEPIN', mark: 'LP', shape: 'ring' },
  { label: 'LAGOU', mark: 'L', shape: 'pill' },
  { label: 'MAIMAI', mark: 'M', shape: 'circle' },
]

const logoShapeClassMap: Record<LogoShape, string> = {
  square: s.logoMarkSquare,
  circle: s.logoMarkCircle,
  ring: s.logoMarkRing,
  pill: s.logoMarkPill,
  stack: s.logoMarkStack,
}

const DEFAULT_RESUME_TEMPLATE_ID = 'template-1'
const DEFAULT_RESUME_TITLE = '未命名简历'

const installGuide = {
  url: 'chrome://extensions',
  edgeUrl: 'edge://extensions',
  loadSource: '../extension1/.output/chrome-mv3-dev（开发） 或 ../extension1/.output/chrome-mv3（正式）',
}

export function HomePageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const logoMarqueeItems = [...platformLogos, ...platformLogos]
  const [installGuideOpen, setInstallGuideOpen] = useState(false)
  const [creatingResume, setCreatingResume] = useState(false)

  const closeInstallGuide = useCallback(() => {
    setInstallGuideOpen(false)

    if (typeof window === 'undefined') {
      return
    }

    const nextUrl = new URL(window.location.href)
    if (!nextUrl.searchParams.has('installGuide')) {
      return
    }

    nextUrl.searchParams.delete('installGuide')
    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
    window.history.replaceState(null, '', nextPath)
  }, [])

  useEffect(() => {
    if (searchParams.get('installGuide') === '1') {
      setInstallGuideOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!installGuideOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeInstallGuide()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [closeInstallGuide, installGuideOpen])

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      Message.success(successMessage)
    } catch {
      Message.error('复制失败，请手动复制')
    }
  }

  const enterDefaultEditor = () => {
    const loadingToastId = toast.loading('正在进入编辑页...')
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('resume:editor-loading-toast-id', String(loadingToastId))
      window.sessionStorage.setItem('resume:guest-editor-entry', '1')
    }

    router.push('/builder/editor/new')
  }

  const handleQuickCreateResume = async () => {
    if (creatingResume) return

    setCreatingResume(true)
    try {
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: DEFAULT_RESUME_TITLE,
          templateId: DEFAULT_RESUME_TEMPLATE_ID,
          mode: 'form',
        }),
      })

      if (response.status === 401) {
        enterDefaultEditor()
        return
      }

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; resume?: { id?: string } }
        | null

      if (!response.ok) {
        throw new Error(payload?.error || '创建失败，请稍后重试')
      }

      const resumeId = typeof payload?.resume?.id === 'string' ? payload.resume.id : ''
      if (!resumeId) {
        throw new Error('创建失败，请稍后重试')
      }

      const loadingToastId = toast.loading('正在进入编辑页...')
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('resume:just-created-id', resumeId)
        window.sessionStorage.setItem('resume:editor-loading-toast-id', String(loadingToastId))
      }

      router.push(`/builder/editor/${resumeId}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败，请稍后重试')
    } finally {
      setCreatingResume(false)
    }
  }

  return (
    <div className={s.root}>
      <div className={s.sandBg} aria-hidden />

      {installGuideOpen && (
        <div className={s.installOverlay} role="dialog" aria-modal="true" aria-labelledby="install-guide-title">
          <button
            type="button"
            className={s.installBackdrop}
            aria-label="关闭安装说明"
            onClick={closeInstallGuide}
          />

          <div className={s.installModal}>
            <ScrollShell className={s.installModalScroll} tone='aura' reveal='always' axis='y'>
              <div className={s.installModalHeader}>
                <div>
                  <h2 id="install-guide-title" className={s.installTitle}>
                    安装指南
                  </h2>
                </div>

                <button
                  type="button"
                  className={s.installClose}
                  aria-label="关闭安装说明"
                  onClick={closeInstallGuide}
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <div className={s.installSection}>
                <p className={s.installSectionLabel}>版本方案</p>
                <div className={s.installVersionGrid}>
                  <article className={s.installVersionCard}>
                    <div className={s.installBadge}>Store</div>
                    <h3 className={s.installVersionTitle}>商店版</h3>
                    <p className={s.installVersionDesc}>自动静默更新</p>
                  </article>

                  <article className={`${s.installVersionCard} ${s.installVersionCardActive}`}>
                    <div className={`${s.installBadge} ${s.installBadgeMuted}`}>Current</div>
                    <h3 className={s.installVersionTitle}>手动加载版</h3>
                    <p className={s.installVersionDesc}>内部测试专用</p>
                  </article>
                </div>
              </div>

              <div className={s.installSection}>
                <p className={s.installSectionLabel}>安装步骤</p>
                <div className={s.installStep}>
                  <div className={s.installStepIndex}>1</div>
                  <div className={s.installStepBody}>
                    <h3 className={s.installStepTitle}>访问扩展管理</h3>
                    <p className={s.installStepText}>在浏览器地址栏输入：</p>

                    <div className={s.installCodeRow}>
                      <code className={s.installCode}>{installGuide.url}</code>
                      <button
                        type="button"
                        className={s.installCopyButton}
                        onClick={() => copyText(installGuide.url, `${installGuide.url} 已复制`)}
                      >
                        复制
                      </button>
                    </div>
                    <p className={s.installStepHint}>Edge 用户可用：{installGuide.edgeUrl}</p>
                  </div>
                </div>

                <div className={s.installStep}>
                  <div className={s.installStepIndex}>2</div>
                  <div className={s.installStepBody}>
                    <h3 className={s.installStepTitle}>开启开发者模式</h3>
                    <p className={s.installStepText}>点击页面右上角的开关。</p>

                    <div className={s.installHintPanel}>
                      <span>示意图：右上角开关</span>
                    </div>
                  </div>
                </div>

                <div className={s.installStep}>
                  <div className={s.installStepIndex}>3</div>
                  <div className={s.installStepBody}>
                    <h3 className={s.installStepTitle}>加载解压包</h3>
                    <p className={s.installStepText}>点击“加载已解压的扩展程序”，或者直接将文件夹拖入此页面：</p>

                    <div className={s.installDropArea}>
                      <Upload className="size-7" aria-hidden="true" />
                      <span className={s.installDropText}>将 extension 文件夹拖拽至此</span>
                    </div>

                    <div className={s.installPathBlock}>
                      <div className={s.installPathLabel}>推荐目录</div>
                      <code className={s.installPathValue}>{installGuide.loadSource}</code>
                      <button
                        type="button"
                        className={s.installPathAction}
                        onClick={() => copyText(installGuide.loadSource, '插件目录提示已复制')}
                      >
                        复制目录提示
                      </button>
                    </div>
                    <div className={s.installFooterActions}>
                      <button type="button" className={s.installPrimaryAction} onClick={closeInstallGuide}>
                        我知道了
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollShell>
          </div>
        </div>
      )}

      <section className={s.hero}>
        <DiagonalCircuitPulseCanvas className={s.heroPulseLayer} />
        <div className={s.heroGrid}>
          <div className={s.copyCol}>
            <div className={s.copyHeader}>
              <span className={s.kicker}>Effortless Career</span>
              <h1 className={s.title}>
                让繁琐的网申
                <br />
                <span className={s.titleAccent}>化为指尖的从容</span>
              </h1>
              <p className={s.subtitle}>
                简历与网申一站式解决           
              <br />
                在每一个快节奏的机会面前，为您保留最后一份优雅。
              </p>
            </div>
            <div className={s.actions}>
              <button
                type="button"
                className={s.ctaPrimary}
                onClick={handleQuickCreateResume}
                disabled={creatingResume}
                aria-busy={creatingResume}
              >
                {creatingResume ? '正在创建...' : '立即创建我的简历'}
              </button>
              <button type="button" className={s.ctaGhost} onClick={() => setInstallGuideOpen(true)}>
                <span>自动投递</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className={s.visualCol}>
            <ChromeWindow title="####" url="www.immersive-apply.com" className={s.chromeWindowHero}>
              <Image
                src="/home/hero/image.png"
                alt=""
                fill
                loading="eager"
                sizes="(max-width: 920px) 100vw, (max-width: 1440px) 58vw, 840px"
                style={{ objectFit: 'cover' }}
              />

            </ChromeWindow>

            <div className={s.glowOrbTop} aria-hidden />
            <div className={s.glowOrbBottom} aria-hidden />
          </div>
        </div>
      </section>

      <section className={s.compatibility} aria-label="平台兼容性">
        <div className={s.compatibilityInner}>
          <span className={s.compatibilityEyebrow}>COMPATIBILITY</span>
          <p className={`${s.compatibilityTitle} text-2xl font-light opacity-80`}>支持主流招聘平台，一触即达</p>
          <p className={s.compatibilitySubtitle}>沉浸式网申已适配以下招聘平台，无需重复手动填写</p>

          <div className={s.logoWall} aria-hidden>
            <div className={s.logoTrack}>
              {logoMarqueeItems.map((platform, index) => (
                <article key={`${platform.label}-${index}`} className={s.logoItem}>
                  <div className={`${s.logoMark} ${logoShapeClassMap[platform.shape]}`}>
                    <span>{platform.mark}</span>
                  </div>
                  <p className={s.logoName}>{platform.label}</p>
                </article>
              ))}
            </div>
          </div>

          <p className={s.compatibilityNote}>
            * 与上述平台无官方合作关系。我们的技术仅提供浏览器层面的内容填充支持，以提升投递效率。
          </p>
        </div>
      </section>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>沉浸式网申</div>
          <p className={s.footerText}>让每一次投递都更轻盈、更专注。</p>
          <p className={s.footerMeta}>© 2026 沉浸式网申 · All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
