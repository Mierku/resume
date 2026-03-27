"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import {
  BadgeDollarSign,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { Button } from "../ui/Button";
import { getUserDisplayName, type SessionUser } from "@/lib/user";
import { AuthRequiredModal } from "@/components/ui/Modal";
import { BrandFlowerIcon } from "@/components/BrandFlowerIcon";
import { useAuthSnapshot } from "@/lib/hooks/useAuthSnapshot";

interface NavLink {
  href: string;
  label: string;
  requireAuth?: boolean;
}

const navLinks: NavLink[] = [
  { href: "/", label: "首页" },
  { href: "/resume/templates", label: "模版" },
  { href: "/tracking", label: "跟踪" },
];

export function Header() {
  const pathname = usePathname();
  const hideHeader = pathname.startsWith("/resume/editor/");
  const { auth, checked, refresh } = useAuthSnapshot<SessionUser>({ eager: !hideHeader });
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRedirectPath, setAuthRedirectPath] = useState("/resume/my-resumes");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const themeToggleRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const user = auth.user;
  const loading = !checked;

  useEffect(() => {
    if (hideHeader) return;
    // Init theme from localStorage or system preference
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const initial = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, [hideHeader]);

  useEffect(() => {
    if (hideHeader) return;
    const scrollThreshold = 60;

    const handleScroll = () => {
      setScrolled(window.scrollY > scrollThreshold);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hideHeader, pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
    setMobileUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!userMenuRef.current || userMenuRef.current.contains(target)) return;
      setUserMenuOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUserMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [userMenuOpen]);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileUserMenuOpen(false);
    setMenuOpen(false);
    await signOut({ redirectTo: "/" });
  };

  const checkAuthStatus = async () => {
    if (auth.authenticated) return true;
    const latest = await refresh();
    return latest.authenticated;
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/resume/templates") return pathname === "/resume" || pathname.startsWith("/resume/templates");
    return pathname.startsWith(href);
  };

  const isLanding = pathname === "/";
  const isTracking = pathname.startsWith("/tracking");
  const isThemeDark = theme === "dark";
  const logoColor = isThemeDark ? "#f59e0b" : "#b45309";
  const auraBrand = "var(--aura-header-brand)";
  const auraTextPrimary = "var(--aura-header-text)";
  const auraTextMuted = "var(--aura-header-text-muted)";
  const auraTextSubtle = "var(--aura-header-text-subtle)";
  const visibleNavLinks = navLinks;
  const displayName = user ? getUserDisplayName(user) : "";

  if (hideHeader) {
    return null;
  }

  const toggleTheme = () => {
    const btn = themeToggleRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const next = theme === "light" ? "dark" : "light";

    // Set reveal origin and direction BEFORE transition starts
    document.documentElement.style.setProperty("--reveal-x", `${x}px`);
    document.documentElement.style.setProperty("--reveal-y", `${y}px`);
    document.documentElement.setAttribute("data-transition-to", next);

    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        document.documentElement.setAttribute("data-theme", next);
        setTheme(next);
        localStorage.setItem("theme", next);
      });
      transition.finished.then(() => {
        document.documentElement.removeAttribute("data-transition-to");
      });
    } else {
      document.documentElement.setAttribute("data-theme", next);
      setTheme(next);
      localStorage.setItem("theme", next);
      document.documentElement.removeAttribute("data-transition-to");
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b transition-colors duration-300" data-landing={isLanding ? "true" : "false"} data-scrolled={scrolled ? "true" : "false"} data-tracking={isTracking ? "true" : "false"}>
        <div className="max-w-full mx-auto px-10">
          <div className="flex items-center justify-between h-[64px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5" style={{ color: auraBrand }}>
            <BrandFlowerIcon className="h-7 w-7 shrink-0" color={logoColor} />
            <span
              className="text-lg font-serif font-extralight tracking-widest"
              style={{ fontFamily: "Noto Serif SC", color: auraBrand }}
            >
              沉浸式网申
            </span>
          </Link>

          {/* Desktop Nav + Auth + Theme Toggle */}
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-3">
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={async event => {
                    if (!link.requireAuth) return;
                    if (user) return;

                    event.preventDefault();
                    const authed = await checkAuthStatus();
                    if (authed) {
                      window.location.href = link.href;
                      return;
                    }

                    setAuthRedirectPath(link.href);
                    setShowAuthModal(true);
                  }}
                  className="text-sm font-medium px-3 py-2 rounded-sm transition-colors"
                  style={{
                    color: isActive(link.href) ? auraTextPrimary : auraTextMuted,
                    fontSize: "12px",
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <button
              ref={themeToggleRef}
              onClick={toggleTheme}
              className="p-2 rounded-sm transition-colors"
              style={{ color: auraTextSubtle }}
              aria-label={isThemeDark ? "切换到亮色模式" : "切换到暗色模式"}
            >
              {isThemeDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {loading ? (
              <div
                className="w-20 h-8 animate-pulse rounded-sm"
                style={{ background: "var(--aura-header-menu-border)" }}
              />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserMenuOpen(prev => !prev)}
                  style={{ color: auraTextMuted }}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <User className="mr-1 size-4" />
                  {displayName}
                  {userMenuOpen ? (
                    <ChevronUp className="ml-1 size-4" />
                  ) : (
                    <ChevronDown className="ml-1 size-4" />
                  )}
                </Button>
                {userMenuOpen ? (
                  <div
                    className="absolute right-0 top-[calc(100%+8px)] w-44 rounded-[12px] border p-1 shadow-lg"
                    style={{
                      borderColor: "var(--aura-header-menu-border)",
                      background: "var(--aura-header-menu-bg)",
                      backdropFilter: "blur(12px)",
                    }}
                  >
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm transition-colors"
                      style={{ color: auraTextMuted }}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <LayoutDashboard className="size-4" />
                      个人工作台
                    </Link>
                    <Link
                      href="/pricing"
                      className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm transition-colors"
                      style={{ color: auraTextMuted }}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <BadgeDollarSign className="size-4" />
                      定价
                    </Link>
                    <Link
                      href="/terms"
                      className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm transition-colors"
                      style={{ color: auraTextMuted }}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <ScrollText className="size-4" />
                      用户服务协议
                    </Link>
                    <Link
                      href="/privacy"
                      className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-sm transition-colors"
                      style={{ color: auraTextMuted }}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <ShieldCheck className="size-4" />
                      隐私政策
                    </Link>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm transition-colors"
                      style={{ color: auraTextMuted }}
                      onClick={() => void handleLogout()}
                    >
                      <LogOut className="size-4" />
                      退出登录
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link href="/login">
                <Button
                  size="sm"
                  style={{
                    background: "var(--aura-header-btn-bg)",
                    color: "var(--aura-header-btn-color)",
                    borderRadius: "999px",
                  }}
                >
                  登录
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2" style={{ color: auraTextPrimary }} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div
            className="md:hidden py-4 border-t animate-slide-down"
            style={{
              borderColor: "var(--aura-header-menu-border)",
              background: "var(--aura-header-menu-bg)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <nav className="flex flex-col gap-1">
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={async event => {
                    if (!link.requireAuth) {
                      setMenuOpen(false);
                      return;
                    }

                    if (user) {
                      setMenuOpen(false);
                      return;
                    }

                    event.preventDefault();
                    const authed = await checkAuthStatus();
                    if (authed) {
                      setMenuOpen(false);
                      window.location.href = link.href;
                      return;
                    }

                    setMenuOpen(false);
                    setAuthRedirectPath(link.href);
                    setShowAuthModal(true);
                  }}
                  className="text-sm font-medium px-3 py-2 rounded-sm transition-colors uppercase tracking-[0.18em]"
                  style={{
                    color: isActive(link.href) ? auraTextPrimary : auraTextMuted,
                    fontSize: "12px",
                    background: isActive(link.href) ? "var(--aura-header-menu-border)" : "transparent",
                  }}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 mt-3 border-t" style={{ borderColor: "var(--aura-header-menu-border)" }}>
                {user ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-sm"
                      style={{ color: auraTextMuted }}
                      onClick={() => setMobileUserMenuOpen(prev => !prev)}
                    >
                      <span className="flex items-center gap-2">
                        <User className="size-4" />
                        {displayName}
                      </span>
                      {mobileUserMenuOpen ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </button>
                    {mobileUserMenuOpen ? (
                      <div className="flex flex-col gap-1 pl-9 pr-2 pb-1">
                        <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="px-2 py-1.5 text-sm rounded-[8px]" style={{ color: auraTextMuted }}>
                          个人工作台
                        </Link>
                        <Link href="/pricing" onClick={() => setMenuOpen(false)} className="px-2 py-1.5 text-sm rounded-[8px]" style={{ color: auraTextMuted }}>
                          定价
                        </Link>
                        <Link href="/terms" onClick={() => setMenuOpen(false)} className="px-2 py-1.5 text-sm rounded-[8px]" style={{ color: auraTextMuted }}>
                          用户服务协议
                        </Link>
                        <Link href="/privacy" onClick={() => setMenuOpen(false)} className="px-2 py-1.5 text-sm rounded-[8px]" style={{ color: auraTextMuted }}>
                          隐私政策
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleLogout()}
                          className="px-2 py-1.5 text-left text-sm rounded-[8px]"
                          style={{ color: auraTextMuted }}
                        >
                          退出登录
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    <Button
                      className="w-full"
                      style={{
                        background: "var(--aura-header-btn-bg)",
                        color: "var(--aura-header-btn-color)",
                        borderRadius: "999px",
                      }}
                    >
                      登录
                    </Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
      </header>
      <AuthRequiredModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        redirectPath={authRedirectPath}
      />
    </>
  );
}
