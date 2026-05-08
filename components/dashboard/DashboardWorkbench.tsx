"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  BadgeDollarSign,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  FileText,
  House,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { BrandFlowerIcon } from "@/components/BrandFlowerIcon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tip } from "@/components/ui/Tip";
import { ThemeMorphIcon } from "@/components/ui/ThemeMorphIcon";
import { UserMenuAvatarTrigger } from "@/components/ui/UserMenuAvatarTrigger";
import avatarStyles from "@/components/ui/user-menu-avatar.module.scss";
import {
  clearAuthSessionHint,
  invalidateAuthSnapshotCache,
} from "@/lib/auth/client";
import { useAuthSnapshot } from "@/lib/hooks/useAuthSnapshot";
import {
  getUserAvatarUrl,
  getUserDisplayName,
  type SessionUser,
} from "@/lib/user";
import {
  getDashboardSectionHref,
  parseDashboardSection,
  type DashboardSection,
} from "@/components/dashboard/types";
import { TrackingSection } from "@/components/dashboard/TrackingSection";
import { ResumesSection } from "@/components/dashboard/ResumesSection";
import { AccountSection } from "@/components/dashboard/AccountSection";
import { AdminUsersSection } from "@/components/dashboard/AdminUsersSection";
import { AdminCommerceSection } from "@/components/dashboard/AdminCommerceSection";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { cn } from "@/lib/utils";
import styles from "./dashboard-workbench.module.scss";

const SECTION_META: Record<
  DashboardSection,
  { label: string; icon: LucideIcon }
> = {
  workbench: { label: "工作台", icon: House },
  tracking: { label: "求职跟踪", icon: BriefcaseBusiness },
  resume: { label: "我的简历", icon: FileText },
  "admin-users": { label: "管理后台", icon: ShieldCheck },
  "admin-commerce": { label: "电商后台", icon: Boxes },
  account: { label: "个人主页", icon: UserRound },
};
const SECTION_NAV_ORDER: DashboardSection[] = [
  "workbench",
  "resume",
  "tracking",
  "admin-users",
  "admin-commerce",
];
const USER_MENU_ITEMS: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
  section?: DashboardSection;
}> = [
  {
    href: getDashboardSectionHref("account"),
    label: "个人主页",
    icon: UserRound,
    section: "account",
  },
  { href: "/pricing", label: "定价", icon: BadgeDollarSign },
  { href: "/privacy", label: "隐私协议", icon: ShieldCheck },
];
const THEME_STORAGE_KEY = "theme";
type ThemeMode = "light" | "dark";

function DashboardWorkbenchLoading() {
  return (
    <div className={styles.app} data-dashboard-theme="builder-aligned">
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
  );
}

function DashboardUserMenu({
  user,
  activeSection,
  className,
}: {
  user: SessionUser;
  activeSection: DashboardSection;
  className?: string;
}) {
  const [menuPinned, setMenuPinned] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const userDisplayName = getUserDisplayName(user);
  const userAvatarUrl = getUserAvatarUrl(user);

  const handleLogout = async () => {
    setMenuPinned(false);
    clearAuthSessionHint();
    invalidateAuthSnapshotCache();
    await signOut({ redirectTo: "/" });
  };

  useEffect(() => {
    if (!menuPinned) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      setMenuPinned(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuPinned(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [menuPinned]);

  return (
    <div
      ref={menuRef}
      className={cn(avatarStyles.userMenu, className)}
      data-menu-open={menuPinned ? "true" : "false"}
    >
      <Tip
        content="用户导航菜单"
        placement="bottom"
        align="end"
        offset={4}
        disabled={menuPinned}
        triggerClassName={styles.userMenuTipTrigger}
      >
        <UserMenuAvatarTrigger
          avatarUrl={userAvatarUrl}
          displayName={userDisplayName}
          expanded={menuPinned}
          onToggle={() => setMenuPinned((current) => !current)}
          buttonClassName={avatarStyles.userMenuTrigger}
          avatarOrbitClassName={avatarStyles.userMenuAvatarOrbit}
          avatarClassName={avatarStyles.userMenuAvatar}
        />
      </Tip>

      {menuPinned ? (
        <div
          className={styles.userMenuDropdown}
          role="menu"
          aria-label="账户菜单"
        >
          <div className={styles.userMenuDropdownTop}>
            <p className={styles.userMenuName}>{userDisplayName}</p>
            <p className={styles.userMenuEmail}>{user.email || "未绑定邮箱"}</p>
          </div>

          <div className={styles.userMenuActions}>
            {USER_MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.section === activeSection;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={cn(
                    styles.userMenuLink,
                    isActive && styles.userMenuLinkActive,
                  )}
                  onClick={() => setMenuPinned(false)}
                >
                  <span className={styles.userMenuLinkLead}>
                    <Icon className={styles.userMenuLinkIcon} />
                    {item.label}
                  </span>
                  <ChevronRight className={styles.userMenuLinkArrow} />
                </Link>
              );
            })}
            <button
              type="button"
              role="menuitem"
              className={cn(styles.userMenuLink, styles.userMenuLogoutButton)}
              onClick={() => void handleLogout()}
            >
              <span className={styles.userMenuLinkLead}>
                <LogOut className={styles.userMenuLinkIcon} />
                退出登录
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DashboardWorkbenchInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { auth, checked } = useAuthSnapshot<SessionUser>({ eager: true });
  const activeSection = parseDashboardSection(searchParams.get("section"));
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const mainScrollRef = useRef<HTMLElement | null>(null);

  const nextPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const isAuthenticated = auth.authenticated && Boolean(auth.user);
  const user = isAuthenticated ? auth.user : null;
  const isGuestMode = checked && !isAuthenticated;
  const canAccessAdminSection = Boolean(user?.isAdmin);
  const resolvedActiveSection =
    isGuestMode
      ? "workbench"
      : (activeSection === "admin-users" || activeSection === "admin-commerce") && !canAccessAdminSection
      ? "tracking"
      : activeSection;
  const visibleSectionIds: DashboardSection[] = isGuestMode
    ? ["workbench"]
    : canAccessAdminSection
      ? SECTION_NAV_ORDER
      : SECTION_NAV_ORDER.filter((item) => item !== "admin-users");
  const visibleSectionItems = visibleSectionIds.map((id) => ({
    id,
    label: SECTION_META[id].label,
    icon: SECTION_META[id].icon,
  }));
  const activeSectionMeta = SECTION_META[resolvedActiveSection];
  const ActiveSectionIcon = activeSectionMeta.icon;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  useEffect(() => {
    if (!checked || !auth.authenticated || !user) return;
    if (activeSection !== "admin-users" && activeSection !== "admin-commerce") return;
    if (canAccessAdminSection) return;
    router.replace(getDashboardSectionHref("tracking"));
  }, [
    activeSection,
    auth.authenticated,
    canAccessAdminSection,
    checked,
    router,
    user,
  ]);

  useEffect(() => {
    if (!checked || !isGuestMode) return;
    if (activeSection === "workbench") return;
    router.replace(getDashboardSectionHref("workbench"));
  }, [activeSection, checked, isGuestMode, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const resolveTheme = (): ThemeMode => {
      const current = document.documentElement.getAttribute("data-theme");
      if (current === "light" || current === "dark") return current;

      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;

      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    };

    const syncTheme = () => {
      setTheme(resolveTheme());
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [resolvedActiveSection]);

  const handleSectionVisit = () => {
    setMobileNavOpen(false);
  };

  const handleThemeToggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (typeof window === "undefined") return;

    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const nextTheme: ThemeMode = theme === "light" ? "dark" : "light";

    document.documentElement.style.setProperty("--reveal-x", `${x}px`);
    document.documentElement.style.setProperty("--reveal-y", `${y}px`);
    document.documentElement.setAttribute("data-transition-to", nextTheme);

    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        document.documentElement.setAttribute("data-theme", nextTheme);
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        setTheme(nextTheme);
      });
      transition.finished.finally(() => {
        document.documentElement.removeAttribute("data-transition-to");
      });
      return;
    }

    document.documentElement.setAttribute("data-theme", nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
    document.documentElement.removeAttribute("data-transition-to");
  };

  if (!checked) {
    return <DashboardWorkbenchLoading />;
  }

  const isThemeDark = theme === "dark";
  const desktopHeader = (
    <>
      <div className={styles.desktopHeaderBrand}>
        <Link href="/" className={styles.brandMark} aria-label="返回首页">
          <BrandFlowerIcon />
        </Link>
        <div className={styles.brandCopy}>
          <p className="text-lg font-serif font-extralight tracking-widest">
            沉浸式网申
          </p>
        </div>
      </div>
      <div className={styles.desktopHeaderMeta}>
        <button
          type="button"
          className={styles.themeToggleIconButton}
          onClick={handleThemeToggle}
          aria-label={isThemeDark ? "切换到亮色模式" : "切换到暗色模式"}
          title={isThemeDark ? "切换到亮色模式" : "切换到暗色模式"}
        >
          <ThemeMorphIcon isDark={isThemeDark} size={18} sunRadius={4} />
        </button>
        {user ? (
          <DashboardUserMenu
            user={user}
            activeSection={resolvedActiveSection}
            className={styles.desktopUserMenu}
          />
        ) : (
          <Link href={loginHref} className={styles.loginEntryButton}>
            <LogIn size={14} />
            登录
          </Link>
        )}
      </div>
    </>
  );

  const desktopSidebar = (
    <>
      <nav className={styles.nav} aria-label="个人工作台导航">
        {visibleSectionItems.map((item) => {
          const Icon = item.icon;
          return (
            <Tip
              key={item.id}
              content={item.label}
              placement="right"
              disabled={sidebarExpanded}
              triggerClassName={styles.navTipTrigger}
            >
              <Link
                href={getDashboardSectionHref(item.id)}
                className={cn(
                  styles.navLink,
                  resolvedActiveSection === item.id && styles.navLinkActive,
                )}
                scroll={false}
                onClick={handleSectionVisit}
              >
                <Icon className={styles.navIcon} />
                <span className={styles.navText}>{item.label}</span>
              </Link>
            </Tip>
          );
        })}
      </nav>
      <div className={styles.desktopSidebarFooter}>
        <button
          type="button"
          className={styles.sidebarToggleButton}
          onClick={() => setSidebarExpanded((current) => !current)}
          aria-label={sidebarExpanded ? "收起侧栏" : "展开侧栏"}
          aria-expanded={sidebarExpanded}
          title={sidebarExpanded ? "收起侧栏" : "展开侧栏"}
        >
          <span className={styles.sidebarToggleIcon}>
            {sidebarExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </span>
        </button>
      </div>
    </>
  );

  const mobileTopbar = (
    <div className={styles.mobileTopbar}>
      <div className={styles.mobileTopbarLead}>
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
          {activeSectionMeta.label}
        </div>
      </div>
      <div className={styles.mobileTopbarActions}>
        <button
          type="button"
          className={styles.themeToggleIconButton}
          onClick={handleThemeToggle}
          aria-label={isThemeDark ? "切换到亮色模式" : "切换到暗色模式"}
          title={isThemeDark ? "切换到亮色模式" : "切换到暗色模式"}
        >
          <ThemeMorphIcon isDark={isThemeDark} size={18} sunRadius={4} />
        </button>
        {user ? (
          <DashboardUserMenu
            user={user}
            activeSection={resolvedActiveSection}
            className={styles.mobileUserMenu}
          />
        ) : (
          <Link href={loginHref} className={styles.loginEntryButton}>
            <LogIn size={14} />
            登录
          </Link>
        )}
      </div>
    </div>
  );

  const mainContent = (
    <div
      className={cn(
        styles.sectionFrame,
        resolvedActiveSection === "workbench" && styles.workbenchSectionFrame,
      )}
    >
      {resolvedActiveSection === "workbench" ? (
        <div
          className={styles.workbenchBlankCanvas}
          aria-label="工作台内容预留区域"
        />
      ) : null}

      {user && resolvedActiveSection === "tracking" ? (
        <div className={styles.trackingSectionStack}>
          <TrackingSection
            onRecordsMutated={() => setRecordsVersion((current) => current + 1)}
          />
        </div>
      ) : null}

      {user && resolvedActiveSection === "resume" ? <ResumesSection /> : null}

      {user &&
      resolvedActiveSection === "admin-users" &&
      canAccessAdminSection ? (
        <AdminUsersSection />
      ) : null}

      {user &&
      resolvedActiveSection === "admin-commerce" &&
      canAccessAdminSection ? (
        <AdminCommerceSection />
      ) : null}

      {user && resolvedActiveSection === "account" ? (
        <AccountSection
          user={user}
          recordsVersion={recordsVersion}
        />
      ) : null}
    </div>
  );

  const mobileDrawer = (
    <>
      <div className={cn(styles.brand, styles.drawerBrand)}>
        <div className={styles.drawerBrandIdentity}>
          <Link
            href="/"
            className={cn(styles.brandMark, styles.drawerBrandMark)}
            aria-label="返回首页"
          >
            <span className={styles.brandGlow} aria-hidden />
            <BrandFlowerIcon
              className={styles.brandIcon}
              color="var(--builder-button-primary-hover)"
            />
          </Link>
          <div className={styles.brandCopy}>
            <p className={styles.brandTitle}>沉浸式网申</p>
            <p className={styles.drawerBrandText}>个人工作台</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setMobileNavOpen(false)}
          aria-label="关闭导航"
        >
          <X size={20} />
        </button>
      </div>

      <nav className={styles.nav} aria-label="移动端个人工作台导航">
        {visibleSectionItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={getDashboardSectionHref(item.id)}
              className={cn(
                styles.navLink,
                resolvedActiveSection === item.id && styles.navLinkActive,
              )}
              scroll={false}
              onClick={handleSectionVisit}
            >
              <Icon className={styles.navIcon} />
              <span className={styles.navText}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <DashboardShell
      showSidebar
      sidebarExpanded={sidebarExpanded}
      mobileNavOpen={mobileNavOpen}
      onRequestCloseMobileNav={() => setMobileNavOpen(false)}
      mainRef={mainScrollRef}
      desktopHeader={desktopHeader}
      desktopSidebar={desktopSidebar}
      mobileTopbar={mobileTopbar}
      mainContent={mainContent}
      mobileDrawer={mobileDrawer}
    />
  );
}

export default function DashboardWorkbench() {
  return (
    <Suspense fallback={<DashboardWorkbenchLoading />}>
      <DashboardWorkbenchInner />
    </Suspense>
  );
}
