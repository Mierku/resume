'use client'

import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Button, IconLeft, IconSave, Input, Space } from '../../primitives'

function ToolbarSpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="resume-toolbar-download-spinner"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </svg>
  )
}

function PdfFileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="resume-toolbar-download-file-icon is-pdf"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15h3a1 1 0 0 1 0 2H9M9 12h3a1 1 0 1 1 0 2H9v-2z" />
    </svg>
  )
}

function PngFileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="resume-toolbar-download-file-icon is-png"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function JpgFileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="resume-toolbar-download-file-icon is-jpg"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

interface ResumeBuilderToolbarProps {
  resumeTitle: string
  saveStatus: ReactNode
  saveLoading: boolean
  onBack: () => void
  onResumeTitleChange: (value: string) => void
  onResumeTitleBlur: () => void
  downloadLoading: boolean
  onDownloadPng: () => void
  onDownloadJpg: () => void
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
  onDownloadPng,
  onDownloadJpg,
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

  useEffect(() => {
    if (downloadLoading) {
      setDownloadMenuOpen(false)
    }
  }, [downloadLoading])

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

  const downloadOptions = [
    {
      id: 'pdf',
      label: 'PDF 下载',
      desc: '适合打印与正式投递',
      icon: <PdfFileIcon />,
      onSelect: onDownloadPdf,
    },
    {
      id: 'png',
      label: '图片下载 (PNG)',
      desc: '高清无损图片格式',
      icon: <PngFileIcon />,
      onSelect: onDownloadPng,
    },
    {
      id: 'jpg',
      label: '图片下载 (JPG)',
      desc: '较小的文件体积',
      icon: <JpgFileIcon />,
      onSelect: onDownloadJpg,
    },
  ] as const

  return (
    <div className="resume-toolbar border-b px-4 py-2 flex items-center gap-3 no-print flex-shrink-0">
      <div className="resume-toolbar-left flex min-w-0 flex-1 items-center gap-2">
        <Button type="text" icon={<IconLeft />} onClick={onBack} aria-label="返回" />
        <div className={`resume-toolbar-title-wrap${isTitleEditing ? ' is-editing' : ''}`}>
          {isTitleEditing ? (
            <Input
              value={resumeTitle}
              onChange={onResumeTitleChange}
              onBlur={handleTitleBlur}
              onFocus={event => {
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
              className="resume-toolbar-title-input"
            />
          ) : (
            <button
              type="button"
              className="resume-toolbar-title-display"
              onClick={startTitleEditing}
              aria-label="点击编辑简历标题"
            >
              {displayTitle}
            </button>
          )}
        </div>
        <div className="resume-toolbar-status-wrap">{saveStatus}</div>
      </div>

      <div className="flex items-center gap-3">
        <Space className="gap-3">
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
          <div
            ref={downloadMenuRef}
            className={`resume-toolbar-download-menu${downloadMenuOpen ? ' is-open' : ''}`}
          >
            <button
              type="button"
              onClick={() => setDownloadMenuOpen(open => !open)}
              className="resume-toolbar-download-trigger"
              aria-haspopup="menu"
              aria-expanded={downloadMenuOpen}
              disabled={downloadLoading}
            >
              {downloadLoading ? (
                <span className="resume-toolbar-download-trigger-icon">
                  <ToolbarSpinnerIcon />
                </span>
              ) : null}
              <span className="resume-toolbar-download-trigger-label">快速下载
              <span>
                  <svg height="18" width="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#ffffff" d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"></path>
                  </svg>
              </span>
              </span>
            </button>
            <div className="resume-toolbar-download-panel" role="menu" aria-label="下载选项">
              <div className="resume-toolbar-download-panel-body">
                {downloadOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className="resume-toolbar-download-option"
                    role="menuitem"
                    onClick={() => {
                      setDownloadMenuOpen(false)
                      option.onSelect()
                    }}
                    disabled={downloadLoading}
                  >
                    <span className="resume-toolbar-download-option-icon-shell">{option.icon}</span>
                    <span className="resume-toolbar-download-option-copy">
                      <span className="resume-toolbar-download-option-label">{option.label}</span>
                      <span className="resume-toolbar-download-option-desc">{option.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="resume-toolbar-download-panel-footer">
                <span>选择输出格式</span>
              </div>
            </div>
          </div>

        </Space>
      </div>
    </div>
  )
}
