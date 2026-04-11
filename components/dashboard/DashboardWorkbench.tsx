'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  BriefcaseBusiness,
  Database,
  FileText,
  Menu,
  UserRound,
  X,
} from 'lucide-react'
import { BrandFlowerIcon } from '@/components/BrandFlowerIcon'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuthSnapshot } from '@/lib/hooks/useAuthSnapshot'
import { getUserDisplayName, type SessionUser } from '@/lib/user'
import {
  getDashboardSectionHref,
  parseDashboardSection,
  type DashboardSection,
} from '@/components/dashboard/types'
import { TrackingSection } from '@/components/dashboard/TrackingSection'
import { ResumesSection } from '@/components/dashboard/ResumesSection'
import { DataSourcesSection } from '@/components/dashboard/DataSourcesSection'
import { AccountSection } from '@/components/dashboard/AccountSection'
import { cn } from '@/lib/utils'
import styles from './dashboard-workbench.module.css'

const SECTION_ITEMS: Array<{
  id: DashboardSection
  label: string
  icon: typeof BriefcaseBusiness
}> = [
  { id: 'tracking', label: '跟踪', icon: BriefcaseBusiness },
  { id: 'resume', label: '简历', icon: FileText },
  { id: 'data-source', label: '数据源', icon: Database },
  { id: 'account', label: '用户信息', icon: UserRound },
]

const PRIMARY_SECTION_ITEMS = SECTION_ITEMS.filter(item => item.id !== 'account')
const ACCOUNT_SECTION_ITEM = SECTION_ITEMS.find(item => item.id === 'account')!

export function DashboardWorkbenchLoading() {
  return (
    <div className={styles.app}>
      <div className={styles.loadingShell}>
        <div className={styles.loadingSidebar} />
        <div className={styles.loadingMain}>
          <Skeleton className={styles.loadingHero} />
          <div className={styles.loadingCards}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className={styles.loadingCard} />
            ))}
          </div>
          <Skeleton className={styles.loadingPanel} />
        </div>
      </div>
    </div>
  )
}

function DashboardWorkbenchInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { auth, checked } = useAuthSnapshot<SessionUser>({ eager: true })
  const activeSection = parseDashboardSection(searchParams.get('section'))
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [visitedSections, setVisitedSections] = useState<Record<DashboardSection, boolean>>({
    tracking: activeSection === 'tracking',
    resume: activeSection === 'resume',
    'data-source': activeSection === 'data-source',
    account: activeSection === 'account',
  })
  const [defaultDataSourceIdOverride, setDefaultDataSourceIdOverride] = useState<string | null | undefined>(undefined)
  const [recordsVersion, setRecordsVersion] = useState(0)
  const [dataSourcesVersion, setDataSourcesVersion] = useState(0)

  const nextPath = useMemo(() => {
    const query = searchParams.toString()
    return query ? `${pathname}?${query}` : pathname
  }, [pathname, searchParams])

  useEffect(() => {
    if (!checked) return
    if (auth.authenticated) return
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`)
  }, [auth.authenticated, checked, nextPath, router])

  const activeItem = SECTION_ITEMS.find(item => item.id === activeSection) || SECTION_ITEMS[0]
  const ActiveSectionIcon = activeItem.icon
  const user = auth.user
  const defaultDataSourceId =
    defaultDataSourceIdOverride === undefined ? auth.user?.defaultDataSourceId || null : defaultDataSourceIdOverride
  const mountedSections: Record<DashboardSection, boolean> = {
    tracking: visitedSections.tracking || activeSection === 'tracking',
    resume: visitedSections.resume || activeSection === 'resume',
    'data-source': visitedSections['data-source'] || activeSection === 'data-source',
    account: visitedSections.account || activeSection === 'account',
  }

  const handleSectionVisit = (section: DashboardSection) => {
    setVisitedSections(current => {
      if (current[section] && current[activeSection]) {
        return current
      }

      return {
        ...current,
        [activeSection]: true,
        [section]: true,
      }
    })
    setMobileNavOpen(false)
  }

  if (!checked || !auth.authenticated || !user) {
    return <DashboardWorkbenchLoading />
  }

  return (
    <div className={styles.app}>
      {mobileNavOpen ? <div className={styles.drawerBackdrop} onClick={() => setMobileNavOpen(false)} /> : null}

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <Link href="/" className={styles.brandMark} aria-label="返回首页">
              <span className={styles.brandGlow} aria-hidden />
              <BrandFlowerIcon className={styles.brandIcon} color="var(--dash-brand)" />
            </Link>
            <div className={styles.brandCopy}>
              <p className={styles.brandTitle}>沉浸式网申</p>
              <p className={styles.brandMeta}>个人工作台</p>
            </div>
          </div>

          <nav className={styles.nav} aria-label="个人工作台导航">
            {PRIMARY_SECTION_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={getDashboardSectionHref(item.id)}
                  className={cn(styles.navLink, activeSection === item.id && styles.navLinkActive)}
                  scroll={false}
                  onClick={() => handleSectionVisit(item.id)}
                >
                  <Icon className={styles.navIcon} />
                  <span className={styles.navText}>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <Link
              href={getDashboardSectionHref(ACCOUNT_SECTION_ITEM.id)}
              className={cn(styles.navLink, styles.footerNavLink, activeSection === ACCOUNT_SECTION_ITEM.id && styles.navLinkActive)}
              scroll={false}
              onClick={() => handleSectionVisit(ACCOUNT_SECTION_ITEM.id)}
              aria-label={ACCOUNT_SECTION_ITEM.label}
              title={getUserDisplayName(user)}
            >
              <ACCOUNT_SECTION_ITEM.icon className={styles.navIcon} />
              <span className={styles.navText}>{ACCOUNT_SECTION_ITEM.label}</span>
            </Link>
          </div>
        </aside>

        <div className={styles.content}>
          <div className={styles.mobileTopbar}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              onClick={() => setMobileNavOpen(true)}
              aria-label="打开导航"
            >
              <Menu size={20} />
            </button>
            <div className={styles.mobileSectionChip}>
              <ActiveSectionIcon size={16} />
              {activeItem.label}
            </div>
          </div>

          <main className={styles.sections}>
            <div className={cn(styles.sectionFrame, activeSection !== 'tracking' && styles.sectionFrameHidden)}>
              {mountedSections.tracking ? (
                <TrackingSection onRecordsMutated={() => setRecordsVersion(current => current + 1)} />
              ) : null}
            </div>
            <div className={cn(styles.sectionFrame, activeSection !== 'resume' && styles.sectionFrameHidden)}>
              {mountedSections.resume ? <ResumesSection /> : null}
            </div>
            <div className={cn(styles.sectionFrame, activeSection !== 'data-source' && styles.sectionFrameHidden)}>
              {mountedSections['data-source'] ? (
                <DataSourcesSection
                  initialDefaultDataSourceId={defaultDataSourceId}
                  onDefaultDataSourceChange={nextDefaultId => {
                    setDefaultDataSourceIdOverride(nextDefaultId)
                    setDataSourcesVersion(current => current + 1)
                  }}
                />
              ) : null}
            </div>
            <div className={cn(styles.sectionFrame, activeSection !== 'account' && styles.sectionFrameHidden)}>
              {mountedSections.account ? (
                <AccountSection
                  user={user}
                  defaultDataSourceId={defaultDataSourceId}
                  recordsVersion={recordsVersion}
                  dataSourcesVersion={dataSourcesVersion}
                />
              ) : null}
            </div>
          </main>
        </div>
      </div>

      <div className={cn(styles.drawer, mobileNavOpen && styles.drawerOpen)}>
        <aside className={styles.sidebar}>
          <div className={cn(styles.brand, styles.drawerBrand)}>
            <div className={styles.drawerBrandIdentity}>
              <Link href="/" className={cn(styles.brandMark, styles.drawerBrandMark)} aria-label="返回首页">
                <span className={styles.brandGlow} aria-hidden />
                <BrandFlowerIcon className={styles.brandIcon} color="var(--dash-brand)" />
              </Link>
              <div className={styles.brandCopy}>
                <p className={styles.brandTitle}>沉浸式网申</p>
                <p className={styles.drawerBrandText}>个人工作台</p>
              </div>
            </div>
            <button type="button" className={styles.mobileMenuButton} onClick={() => setMobileNavOpen(false)} aria-label="关闭导航">
              <X size={20} />
            </button>
          </div>

          <nav className={styles.nav} aria-label="移动端个人工作台导航">
            {SECTION_ITEMS.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  href={getDashboardSectionHref(item.id)}
                  className={cn(styles.navLink, activeSection === item.id && styles.navLinkActive)}
                  scroll={false}
                  onClick={() => handleSectionVisit(item.id)}
                >
                  <Icon className={styles.navIcon} />
                  <span className={styles.navText}>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarUser}>
              <p className={styles.sidebarUserLabel}>{getUserDisplayName(user)}</p>
              <p className={styles.sidebarUserMeta}>{user.email || '已登录'}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function DashboardWorkbench() {
  return (
    <Suspense fallback={<DashboardWorkbenchLoading />}>
      <DashboardWorkbenchInner />
    </Suspense>
  )
}
