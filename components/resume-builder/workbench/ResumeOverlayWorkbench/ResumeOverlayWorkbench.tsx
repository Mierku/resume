'use client'

import { X } from 'lucide-react'
import { type CSSProperties, type ReactNode, type RefObject, type PointerEvent as ReactPointerEvent } from 'react'
import { BUILDER_TOOL_META, type ActiveBuilderTool, type BuilderTool } from '../types'
import { ResumeToolRail } from '../ResumeToolRail/ResumeToolRail'
import { ResumePreviewWorkspace } from '../ResumePreviewWorkspace/ResumePreviewWorkspace'

interface ResumeOverlayWorkbenchProps {
  activeTool: ActiveBuilderTool
  sidePanelScrolling: boolean
  onSelectTool: (tool: BuilderTool) => void
  onCloseTool: () => void
  onSidePanelScroll: () => void
  toolPanelContent: ReactNode
  editorContent: ReactNode
  onEditorPanelResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void
  onEditorPanelResizeMove: (event: ReactPointerEvent<HTMLDivElement>) => void
  onEditorPanelResizeEnd: (event: ReactPointerEvent<HTMLDivElement>) => void
  previewContent: ReactNode
  previewContentRef: RefObject<HTMLDivElement | null>
  previewViewportRef: RefObject<HTMLDivElement | null>
  previewScale: number
  previewScrollSpaceHeight: number
  verticalPadding: number
  previewReady: boolean
  aiPreviewVisible: boolean
  aiPreviewActionLoading: 'new_version' | 'overwrite' | 'discard' | null
  onRunPreviewDraftAction: (action: 'new_version' | 'overwrite' | 'discard') => void
  onPreviewPointerEnter: () => void
  onPreviewPointerDown: () => void
  onPreviewPointerLeave: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onCenter: () => void
  onFit: () => void
}

export function ResumeOverlayWorkbench({
  activeTool,
  sidePanelScrolling,
  onSelectTool,
  onCloseTool,
  onSidePanelScroll,
  toolPanelContent,
  editorContent,
  onEditorPanelResizeStart,
  onEditorPanelResizeMove,
  onEditorPanelResizeEnd,
  previewContent,
  previewContentRef,
  previewViewportRef,
  previewScale,
  previewScrollSpaceHeight,
  verticalPadding,
  previewReady,
  aiPreviewVisible,
  aiPreviewActionLoading,
  onRunPreviewDraftAction,
  onPreviewPointerEnter,
  onPreviewPointerDown,
  onPreviewPointerLeave,
  onZoomIn,
  onZoomOut,
  onCenter,
  onFit,
}: ResumeOverlayWorkbenchProps) {
  const activeToolMeta = activeTool ? BUILDER_TOOL_META[activeTool] : null
  const workbenchStyle = {
    ['--resume-preview-left-padding' as string]: activeTool ? '430px' : '112px',
    ['--resume-preview-left-padding-medium' as string]: activeTool ? '360px' : '112px',
  } as CSSProperties

  return (
    <div className="resume-builder-workbench flex-1 overflow-hidden" style={workbenchStyle}>
      <ResumeToolRail activeTool={activeTool} onSelectTool={onSelectTool} />

      {activeTool ? (
        <aside
          className={`resume-side-panel resume-context-panel no-print flex flex-col overflow-hidden${activeTool === 'ai' ? '' : ' is-auto-height'}`}
        >
          {activeTool === 'ai' || !activeToolMeta ? null : (
            <div className="resume-workbench-panel-head">
              <div className="resume-workbench-panel-head-row">
                <div className="resume-workbench-panel-copy">
                  <h2 className="resume-workbench-panel-title">{activeToolMeta.title}</h2>
                </div>
                <div className="resume-workbench-panel-actions">
                  <button
                    type="button"
                    className="resume-workbench-panel-close"
                    onClick={onCloseTool}
                    aria-label={`关闭${activeToolMeta.title}面板`}
                    title="关闭面板"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div
            className={`resume-scroll-shell${sidePanelScrolling ? ' is-scrolling' : ''}${activeTool === 'ai' ? ' is-ai-panel' : ''}`}
            onScroll={onSidePanelScroll}
          >
            <div className={`resume-side-panel-body resume-workbench-panel-body${activeTool === 'ai' ? ' is-ai-panel' : ' py-4 px-3'}`}>
              {toolPanelContent}
            </div>
          </div>
        </aside>
      ) : null}

      <ResumePreviewWorkspace
        content={previewContent}
        previewContentRef={previewContentRef}
        previewViewportRef={previewViewportRef}
        previewScale={previewScale}
        previewScrollSpaceHeight={previewScrollSpaceHeight}
        verticalPadding={verticalPadding}
        ready={previewReady}
        aiPreviewVisible={aiPreviewVisible}
        aiPreviewActionLoading={aiPreviewActionLoading}
        onRunPreviewDraftAction={onRunPreviewDraftAction}
        onPointerEnter={onPreviewPointerEnter}
        onPointerDown={onPreviewPointerDown}
        onPointerLeave={onPreviewPointerLeave}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onCenter={onCenter}
        onFit={onFit}
      />

      <div
        className="resume-editor-panel-resizer no-print"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整属性编辑器宽度"
        onPointerDown={onEditorPanelResizeStart}
        onPointerMove={onEditorPanelResizeMove}
        onPointerUp={onEditorPanelResizeEnd}
        onPointerCancel={onEditorPanelResizeEnd}
      />

      <aside className="resume-side-panel resume-editor-panel no-print flex flex-col overflow-hidden">
        {editorContent}
      </aside>
    </div>
  )
}
