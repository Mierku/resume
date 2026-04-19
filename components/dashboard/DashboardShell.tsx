"use client";

import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";
import styles from "./dashboard-workbench.module.scss";

interface DashboardShellProps {
  desktopHeader: ReactNode;
  mainContent: ReactNode;
  desktopSidebar?: ReactNode;
  mobileTopbar?: ReactNode;
  mobileDrawer?: ReactNode;
  showSidebar?: boolean;
  sidebarExpanded?: boolean;
  mobileNavOpen?: boolean;
  onRequestCloseMobileNav?: () => void;
  mainRef?: RefObject<HTMLElement | null>;
}

export function DashboardShell({
  desktopHeader,
  mainContent,
  desktopSidebar,
  mobileTopbar,
  mobileDrawer,
  showSidebar = true,
  sidebarExpanded = false,
  mobileNavOpen = false,
  onRequestCloseMobileNav,
  mainRef,
}: DashboardShellProps) {
  return (
    <div
      className={styles.app}
      data-dashboard-theme="builder-aligned"
      data-sidebar-expanded={sidebarExpanded ? "true" : "false"}
      data-shell-sidebar={showSidebar ? "true" : "false"}
    >
      {showSidebar && mobileNavOpen ? (
        <div className={styles.drawerBackdrop} onClick={onRequestCloseMobileNav} />
      ) : null}

      <div className={styles.desktopShell}>
        <header className={styles.desktopHeader}>{desktopHeader}</header>

        <div className={styles.desktopBody}>
          {showSidebar ? (
            <aside className={styles.desktopSidebar}>{desktopSidebar}</aside>
          ) : null}

          <main
            ref={mainRef}
            data-scroll-tone="panel"
            data-scroll-reveal="always"
            data-scroll-axis="y"
            className={cn(
              "scroll-shell",
              styles.desktopMain,
              styles.sections,
              !showSidebar && styles.desktopMainNoSidebar,
            )}
          >
            {showSidebar ? mobileTopbar : null}
            {mainContent}
          </main>
        </div>
      </div>

      {showSidebar ? (
        <div className={cn(styles.drawerShell, mobileNavOpen && styles.drawerOpen)}>
          <aside className={styles.drawerSidebar}>{mobileDrawer}</aside>
        </div>
      ) : null}
    </div>
  );
}
