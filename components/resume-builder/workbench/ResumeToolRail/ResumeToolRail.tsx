'use client'

import { FileText, LayoutTemplate, MessageSquare, MoonStar, PenLine, Ruler, Sun, Type } from 'lucide-react'
import { type FocusEvent as ReactFocusEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import type { ActiveBuilderTool, BuilderTool } from '../types'
import styles from './ResumeToolRail.module.scss'

const THEME_STORAGE_KEY = 'theme'
type ThemeMode = 'light' | 'dark'

function ToolButton({
  label,
  active = false,
  onSelect,
  className = '',
  children,
}: {
  label: string
  active?: boolean
  onSelect: () => void
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`${styles.toolButton}${active ? ` ${styles.toolButtonActive}` : ''}${className ? ` ${className}` : ''}`}
      onClick={onSelect}
      aria-label={label}
    >
      <span className={styles.toolIcon} aria-hidden="true">
        {children}
      </span>
      <span className={styles.toolLabel}>{label}</span>
    </button>
  )
}

interface ResumeToolRailProps {
  activeTool: ActiveBuilderTool
  onSelectTool: (tool: BuilderTool) => void
}

export function ResumeToolRail({ activeTool, onSelectTool }: ResumeToolRailProps) {
  const [expanded, setExpanded] = useState(false)
  const [theme, setTheme] = useState<ThemeMode>('dark')

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

    return () => {
      observer.disconnect()
    }
  }, [])

  const handleThemeToggle = useCallback(() => {
    if (typeof window === 'undefined') return

    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    setTheme(nextTheme)
    setExpanded(false)
  }, [theme])

  const handleToolSelect = useCallback((tool: BuilderTool) => {
    onSelectTool(tool)
    setExpanded(false)
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      })
    }
  }, [onSelectTool])

  const handleBlurCapture = useCallback((event: ReactFocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setExpanded(false)
    }
  }, [])

  return (
    <aside
      className={`resume-tool-rail no-print ${styles.rail}${expanded ? ` ${styles.railExpanded}` : ''}`}
      onPointerEnter={() => setExpanded(true)}
      onPointerLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={handleBlurCapture}
    >
      <div className={styles.railShell}>
        <div className={styles.toolGroup}>
          <ToolButton label="自动填充" active={activeTool === 'fill'} onSelect={() => handleToolSelect('fill')}>
            <PenLine size={14} />
          </ToolButton>
          <ToolButton
            label="AI对话"
            active={activeTool === 'ai'}
            onSelect={() => handleToolSelect('ai')}
          >
            <MessageSquare className={styles.aiLogo} />
          </ToolButton>
        </div>

        <div className={styles.toolsDivider} />

        <div className={styles.toolGroup}>
          <ToolButton label="简历样式" active={activeTool === 'template'} onSelect={() => handleToolSelect('template')}>
            <LayoutTemplate size={14} />
          </ToolButton>
          <ToolButton label="文本设置" active={activeTool === 'typography'} onSelect={() => handleToolSelect('typography')}>
            <Type size={14} />
          </ToolButton>
          <ToolButton label="排版参数" active={activeTool === 'typesetting'} onSelect={() => handleToolSelect('typesetting')}>
            <FileText size={14} />
          </ToolButton>
          <ToolButton label="Height Debug" active={activeTool === 'height-debug'} onSelect={() => handleToolSelect('height-debug')}>
            <Ruler size={14} />
          </ToolButton>
        </div>

        <div className={styles.toolsDivider} />

        <div className={styles.toolGroup}>
          <ToolButton
            label={theme === 'dark' ? '切换浅色' : '切换深色'}
            onSelect={handleThemeToggle}
          >
            {theme === 'dark' ? <Sun size={14} /> : <MoonStar size={14} />}
          </ToolButton>
        </div>
      </div>
    </aside>
  )
}
