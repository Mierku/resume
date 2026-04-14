'use client'

import { FileText, LayoutTemplate, PenLine, Ruler, Type } from 'lucide-react'
import { type FocusEvent as ReactFocusEvent, type ReactNode, useCallback, useState } from 'react'
import { BrandFlowerIcon } from '@/components/BrandFlowerIcon'
import type { ActiveBuilderTool, BuilderTool } from '../types'
import styles from './ResumeToolRail.module.css'

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
      className={`resume-side-tool-btn${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      onClick={onSelect}
      aria-label={label}
    >
      <span className="resume-side-tool-icon" aria-hidden="true">
        {children}
      </span>
      <span className="resume-side-tool-label">{label}</span>
    </button>
  )
}

interface ResumeToolRailProps {
  activeTool: ActiveBuilderTool
  onSelectTool: (tool: BuilderTool) => void
}

export function ResumeToolRail({ activeTool, onSelectTool }: ResumeToolRailProps) {
  const [expanded, setExpanded] = useState(false)

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
      className={`resume-tool-rail no-print ${styles.rail}${expanded ? ' is-expanded' : ''}`}
      onPointerEnter={() => setExpanded(true)}
      onPointerLeave={() => setExpanded(false)}
      onFocusCapture={() => setExpanded(true)}
      onBlurCapture={handleBlurCapture}
    >
      <div className="resume-tool-rail-shell">
        <div className="resume-side-tool-group">
          <ToolButton label="自动填充" active={activeTool === 'fill'} onSelect={() => handleToolSelect('fill')}>
            <PenLine size={14} />
          </ToolButton>
          <ToolButton
            label="AI 助手"
            active={activeTool === 'ai'}
            onSelect={() => handleToolSelect('ai')}
            className="resume-side-tool-btn-ai"
          >
            <BrandFlowerIcon className="resume-side-tool-ai-logo" />
          </ToolButton>
        </div>

        <div className="resume-side-tools-divider" />

        <div className="resume-side-tool-group">
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
      </div>
    </aside>
  )
}
