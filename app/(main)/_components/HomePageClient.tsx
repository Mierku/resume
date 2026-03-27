'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, X } from 'lucide-react'
import { Message } from '@/components/ui/radix-adapter'
import { ChromeWindow } from '@/components/ChromeWindow'
import Image from 'next/image'
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

type BrowserGuide = 'chrome' | 'edge'

const installGuides: Record<
  BrowserGuide,
  {
    label: string
    url: string
    toggleLabel: string
    loadSource: string
    supportText: string
  }
> = {
  chrome: {
    label: 'Chrome',
    url: 'chrome://extensions',
    toggleLabel: '开发者模式',
    loadSource: '../extension1/.output/chrome-mv3-dev（开发） 或 ../extension1/.output/chrome-mv3（正式）',
    supportText: '推荐用于本地开发、内测和私有交付',
  },
  edge: {
    label: 'Edge',
    url: 'edge://extensions',
    toggleLabel: '开发人员模式',
    loadSource: '../extension1/.output/chrome-mv3-dev（开发） 或 ../extension1/.output/chrome-mv3（正式）',
    supportText: '适合 Edge 用户，同样支持 Chromium 扩展目录加载',
  },
}

export function HomePageClient() {
  const logoMarqueeItems = [...platformLogos, ...platformLogos]
  const [installGuideOpen, setInstallGuideOpen] = useState(false)
  const [activeBrowser, setActiveBrowser] = useState<BrowserGuide>('chrome')

  useEffect(() => {
    if (!installGuideOpen) {
      document.body.style.overflow = ''
      return
    }

    document.body.style.overflow = 'hidden'

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInstallGuideOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [installGuideOpen])

  const guide = installGuides[activeBrowser]

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      Message.success(successMessage)
    } catch {
      Message.error('复制失败，请手动复制')
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
            onClick={() => setInstallGuideOpen(false)}
          />

          <div className={s.installModal}>
            <div className={s.installModalScroll}>
              <div className={s.installModalHeader}>
                <div>
                  <p className={s.installEyebrow}>Install Guide</p>
                  <h2 id="install-guide-title" className={s.installTitle}>
                    1. 安装版本说明
                  </h2>
                </div>

                <button
                  type="button"
                  className={s.installClose}
                  aria-label="关闭安装说明"
                  onClick={() => setInstallGuideOpen(false)}
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>

              <div className={s.installSection}>
                <div className={s.installVersionGrid}>
                  <article className={s.installVersionCard}>
                    <div className={s.installBadge}>后续</div>
                    <h3 className={s.installVersionTitle}>商店自动更新版</h3>
                    <ul className={s.installList}>
                      <li>Chrome Web Store / Edge Add-ons 上架后开放</li>
                      <li>适合公开分发和自动更新</li>
                      <li>当前阶段暂不启用</li>
                    </ul>
                  </article>

                  <article className={`${s.installVersionCard} ${s.installVersionCardActive}`}>
                    <div className={`${s.installBadge} ${s.installBadgeMuted}`}>当前</div>
                    <h3 className={s.installVersionTitle}>手动加载版</h3>
                    <ul className={s.installList}>
                      <li>不依赖 Chrome 商店审核</li>
                      <li>适合私有分发、内部测试、本地调试</li>
                      <li>需要手动开启浏览器扩展开发者模式</li>
                    </ul>
                  </article>
                </div>

                <div className={s.installNotice}>
                  当前先采用手动加载模式。点击下方步骤即可完成安装，不接下载功能也能先把链路跑通。
                </div>
              </div>

              <div className={s.installModalHeader}>
                <div>
                  <p className={s.installEyebrow}>Step By Step</p>
                  <h2 className={s.installTitle}>2. 安装步骤</h2>
                </div>

                <div className={s.installBrowserTabs}>
                  {(['chrome', 'edge'] as BrowserGuide[]).map(browser => (
                    <button
                      key={browser}
                      type="button"
                      className={browser === activeBrowser ? s.installBrowserTabActive : s.installBrowserTab}
                      onClick={() => setActiveBrowser(browser)}
                    >
                      {installGuides[browser].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={s.installSection}>
                <div className={s.installStep}>
                  <div className={s.installStepIndex}>1</div>
                  <div className={s.installStepBody}>
                    <h3 className={s.installStepTitle}>进入浏览器的扩展程序页面</h3>
                    <p className={s.installStepText}>{guide.supportText}</p>

                    <div className={s.installCodeRow}>
                      <code className={s.installCode}>{guide.url}</code>
                      <button
                        type="button"
                        className={s.installCopyButton}
                        onClick={() => copyText(guide.url, `${guide.url} 已复制`)}
                      >
                        <Copy className="size-4" aria-hidden="true" />
                        复制
                      </button>
                    </div>
                  </div>
                </div>

                <div className={s.installStep}>
                  <div className={s.installStepIndex}>2</div>
                  <div className={s.installStepBody}>
                    <h3 className={s.installStepTitle}>开启「{guide.toggleLabel}」</h3>
                    <p className={s.installStepText}>打开扩展管理页后，在右上角把开关打开。开启后才会出现“加载已解压的扩展程序”入口。</p>

                    <div className={s.browserMock}>
                      <div className={s.browserMockTop}>
                        <span className={s.browserMockDot} />
                        <span className={s.browserMockDot} />
                        <span className={s.browserMockDot} />
                        <div className={s.browserMockAddress}>{guide.url}</div>
                      </div>
                      <div className={s.browserMockBody}>
                        <div className={s.browserMockToolbar}>
                          <span className={s.browserMockPill}>加载已解压的扩展程序</span>
                          <span className={s.browserMockPill}>打包扩展程序</span>
                          <span className={s.browserMockPill}>更新</span>
                        </div>
                        <div className={s.browserMockToggle}>
                          <span>{guide.toggleLabel}</span>
                          <span className={s.browserMockSwitch}>
                            <span className={s.browserMockSwitchKnob} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={s.installStep}>
                  <div className={s.installStepIndex}>3</div>
                  <div className={s.installStepBody}>
                    <h3 className={s.installStepTitle}>加载插件目录</h3>
                    <p className={s.installStepText}>点击“加载已解压的扩展程序”后，选择我们提供给你的插件目录。如果你就在本地项目里调试，直接选下面这个构建目录即可。</p>

                    <div className={s.installPathBlock}>
                      <div className={s.installPathLabel}>推荐目录</div>
                      <code className={s.installPathValue}>{guide.loadSource}</code>
                      <button
                        type="button"
                        className={s.installPathAction}
                        onClick={() => copyText(guide.loadSource, '插件目录提示已复制')}
                      >
                        复制目录提示
                      </button>
                    </div>
                  </div>
                </div>

                <div className={s.installStep}>
                  <div className={s.installStepIndex}>4</div>
                  <div className={s.installStepBody}>
                    <h3 className={s.installStepTitle}>固定插件并开启沉浸式模式</h3>
                    <p className={s.installStepText}>安装完成后，把插件固定到浏览器工具栏，打开 Popup 面板，开启沉浸式模式。随后就可以在招聘网站中使用一键填报。</p>

                    <div className={s.installFooterActions}>
                      <Link href="/install" className={s.installTextLink}>
                        查看完整安装页
                      </Link>
                      <button type="button" className={s.installPrimaryAction} onClick={() => setInstallGuideOpen(false)}>
                        我知道了
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              <button type="button" className={s.ctaPrimary} onClick={() => setInstallGuideOpen(true)}>
                安装插件
              </button>
              <Link href="/resume/templates" className={s.ctaGhost}>
                <span>制作简历</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
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
