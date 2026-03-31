'use client'

import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Button, IconDownload, IconLeft, IconSave, Input, Space } from '../primitives'

interface ResumeBuilderToolbarProps {
  resumeTitle: string
  saveStatus: ReactNode
  saveLoading: boolean
  onBack: () => void
  onResumeTitleChange: (value: string) => void
  onResumeTitleBlur: () => void
  downloadLoading: boolean
  onDownloadImage: () => void
  onDownloadPdf: () => void
  onSave: () => void
}

export function ResumeBuilderToolbar({
  resumeTitle,
  saveStatus,
  saveLoading,
  onBack,
  onResumeTitleChange,
  onResumeTitleBlur,
  downloadLoading,
  onDownloadImage,
  onDownloadPdf,
  onSave,
}: ResumeBuilderToolbarProps) {
  const [isTitleEditing, setIsTitleEditing] = useState(false)
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement | null>(null)
  const titleBeforeEditingRef = useRef(resumeTitle)
  const skipCommitOnBlurRef = useRef(false)
  const displayTitle = resumeTitle.trim() || '未命名简历'

  useEffect(() => {
    if (!downloadMenuOpen) return

    const handlePointerDownOutside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (downloadMenuRef.current?.contains(target)) return
      setDownloadMenuOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDownloadMenuOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDownOutside)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [downloadMenuOpen])

  const startTitleEditing = () => {
    titleBeforeEditingRef.current = resumeTitle
    setIsTitleEditing(true)
  }

  const handleTitleBlur = () => {
    setIsTitleEditing(false)
    if (skipCommitOnBlurRef.current) {
      skipCommitOnBlurRef.current = false
      return
    }
    onResumeTitleBlur()
  }

  return (
    <div className="resume-toolbar border-b px-4 py-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 no-print flex-shrink-0">
      <div className="resume-toolbar-left flex min-w-0 items-center gap-2 justify-self-start">
        <Button type="text" icon={<IconLeft />} onClick={onBack} aria-label="返回" />
        <div className="resume-toolbar-status-wrap">{saveStatus}</div>
      </div>

      <div className="flex min-w-0 items-center px-2 justify-self-center">
        <div className="resume-toolbar-title-wrap">
          {isTitleEditing ? (
            <Input
              value={resumeTitle}
              onChange={onResumeTitleChange}
              onBlur={handleTitleBlur}
              onFocus={(event) => {
                event.currentTarget.select()
              }}
              onKeyDown={(event: ReactKeyboardEvent<HTMLInputElement>) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                  return
                }

                if (event.key === 'Escape') {
                  skipCommitOnBlurRef.current = true
                  onResumeTitleChange(titleBeforeEditingRef.current)
                  setIsTitleEditing(false)
                }
              }}
              autoFocus
              className="resume-toolbar-title-input text-center"
            />
          ) : (
            <button
              type="button"
              className="resume-toolbar-title-display"
              onDoubleClick={startTitleEditing}
              aria-label="双击编辑简历标题"
            >
              {displayTitle}
            </button>
          )}
        </div>
      </div>

      <div className="justify-self-end flex items-center gap-3">
        <Space>
          <div
            ref={downloadMenuRef}
            className={`resume-export-hover-menu${downloadMenuOpen ? ' is-open' : ''}`}
          >
            <Button
              type="secondary"
              icon={<IconDownload />}
              onClick={() => setDownloadMenuOpen(open => !open)}
              className="resume-toolbar-action resume-toolbar-action-export"
              aria-haspopup="menu"
              aria-expanded={downloadMenuOpen}
              loading={downloadLoading}
            >
              下载
            </Button>
            <div className="resume-export-hover-menu-panel" role="menu" aria-label="下载选项">
              <button
                type="button"
                className="resume-export-hover-menu-item"
                role="menuitem"
                onClick={() => {
                  setDownloadMenuOpen(false)
                  onDownloadImage()
                }}
                disabled={downloadLoading}
              >
                图片下载
              </button>
              <button
                type="button"
                className="resume-export-hover-menu-item"
                role="menuitem"
                onClick={() => {
                  setDownloadMenuOpen(false)
                  onDownloadPdf()
                }}
                disabled={downloadLoading}
              >
                PDF 下载
              </button>
            </div>
          </div>
          <Button
            type="secondary"
            icon={<IconSave />}
            onClick={onSave}
            title="保存 (⌘S / Ctrl+S)"
            loading={saveLoading}
            className="resume-toolbar-action resume-toolbar-action-save"
          >
            保存
          </Button>
        </Space>
      </div>
    </div>
  )
}
