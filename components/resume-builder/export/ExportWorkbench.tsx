'use client'

import { type ReactNode, type RefObject } from 'react'
import { Button, IconDownload, IconLeft, Option, Select } from '../primitives'

interface ExportWorkbenchProps {
  open: boolean
  onClose: () => void
  exportPreviewRef: RefObject<HTMLDivElement | null>
  exportFormat: 'pdf' | 'image'
  exportScope: 'current' | 'all'
  exportImageMode: 'paged' | 'continuous'
  exporting: boolean
  onExportFormatChange: (value: 'pdf' | 'image') => void
  onExportScopeChange: (value: 'current' | 'all') => void
  onExportImageModeChange: (value: 'paged' | 'continuous') => void
  onExportAction: () => void
  preview: ReactNode
}

export function ExportWorkbench({
  open,
  onClose,
  exportPreviewRef,
  exportFormat,
  exportScope,
  exportImageMode,
  exporting,
  onExportFormatChange,
  onExportScopeChange,
  onExportImageModeChange,
  onExportAction,
  preview,
}: ExportWorkbenchProps) {
  if (!open) return null

  return (
    <div className="resume-export-workbench-overlay" onClick={onClose}>
      <div
        className="resume-export-workbench"
        role="dialog"
        aria-modal="true"
        aria-label="导出工作台"
        onClick={event => event.stopPropagation()}
      >
        <div className="resume-export-workbench-header">
          <div className="resume-export-workbench-title-wrap">
            <h3 className="resume-export-workbench-title">导出工作台</h3>
            <p className="resume-export-workbench-subtitle">左侧预览分页，右侧设置导出格式与范围。</p>
          </div>
          <Button type="text" icon={<IconLeft />} onClick={onClose}>
            返回编辑
          </Button>
        </div>

        <div className="resume-export-workbench-body">
          <div className="resume-export-workbench-main">
            <div ref={exportPreviewRef} className="resume-export-preview-scroll">
              {preview}
            </div>
          </div>

          <aside className="resume-export-workbench-side">
            <div className="resume-export-panel-block">
              <div className="resume-export-panel-label">导出格式</div>
              <Select
                value={exportFormat}
                onChange={value => onExportFormatChange((Array.isArray(value) ? value[0] : value) as 'pdf' | 'image')}
                style={{ width: '100%' }}
              >
                <Option value="pdf">PDF</Option>
                <Option value="image">图片（PNG）</Option>
              </Select>
            </div>

            {exportFormat === 'image' ? (
              <>
                <div className="resume-export-panel-block">
                  <div className="resume-export-panel-label">页面范围</div>
                  <Select
                    value={exportScope}
                    onChange={value => onExportScopeChange((Array.isArray(value) ? value[0] : value) as 'current' | 'all')}
                    style={{ width: '100%' }}
                  >
                    <Option value="all">全部页面</Option>
                    <Option value="current">当前第一页</Option>
                  </Select>
                </div>

                <div className="resume-export-panel-block">
                  <div className="resume-export-panel-label">图片导出方式</div>
                  <Select
                    value={exportImageMode}
                    onChange={value => onExportImageModeChange((Array.isArray(value) ? value[0] : value) as 'paged' | 'continuous')}
                    style={{ width: '100%' }}
                  >
                    <Option value="paged">分页多图（逐页 PNG）</Option>
                    <Option value="continuous">连续长图（单张 PNG）</Option>
                  </Select>
                </div>
              </>
            ) : null}

            <div className="resume-export-panel-hint">
              {exportFormat === 'image'
                ? exportImageMode === 'continuous'
                  ? '将按当前分页结果拼接为连续长图 PNG。'
                  : '将按当前分页结果逐页导出 PNG。'
                : '将按当前分页结果导出 PDF。'}
            </div>

            <div className="resume-export-panel-actions">
              <Button type="secondary" icon={<IconDownload />} onClick={onExportAction} loading={exporting}>
                {exportFormat === 'image' ? (exportImageMode === 'continuous' ? '导出连续长图' : '导出图片') : '导出 PDF'}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
