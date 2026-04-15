'use client'

import { X } from 'lucide-react'
import { type ReactNode, type RefObject, type PointerEvent as ReactPointerEvent } from 'react'
import { BUILDER_TOOL_META, type ActiveBuilderTool, type BuilderTool } from '../types'
import { ResumeToolRail } from '../ResumeToolRail/ResumeToolRail'
import { ResumePreviewWorkspace } from '../ResumePreviewWorkspace/ResumePreviewWorkspace'
import styles from './ResumeOverlayWorkbench.module.scss'

interface ResumeOverlayWorkbenchProps {
  editorPanelWidth: number
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
  editorPanelWidth,
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
  const previewLeftPadding = activeTool ? 430 : 112

  return (
    <div className="resume-builder-workbench flex-1 overflow-hidden">
      <ResumeToolRail activeTool={activeTool} onSelectTool={onSelectTool} />

      {activeTool ? (
        <aside
          className={`resume-side-panel resume-context-panel no-print flex flex-col overflow-hidden ${styles.contextPanel}${activeTool === 'ai' ? '' : ` ${styles.contextPanelAutoHeight}`}`}
        >
          {activeTool === 'ai' || !activeToolMeta ? null : (
            <div className={styles.panelHead}>
              <div className={styles.panelHeadRow}>
                <div className={styles.panelCopy}>
                  <h2 className={styles.panelTitle}>{activeToolMeta.title}</h2>
                </div>
                <div className={styles.panelActions}>
                  <button
                    type="button"
                    className={styles.panelClose}
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
            <div className={`resume-side-panel-body ${styles.workbenchPanelBody}${activeTool === 'ai' ? ' is-ai-panel' : ' py-4 px-3'}`}>
              {toolPanelContent}
            </div>
          </div>
        </aside>
      ) : null}

      <ResumePreviewWorkspace
        editorPanelWidth={editorPanelWidth}
        previewLeftPadding={previewLeftPadding}
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
        className={`${styles.editorResizer} no-print`}
        style={{ right: `${editorPanelWidth + 2}px` }}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整属性编辑器宽度"
        onPointerDown={onEditorPanelResizeStart}
        onPointerMove={onEditorPanelResizeMove}
        onPointerUp={onEditorPanelResizeEnd}
        onPointerCancel={onEditorPanelResizeEnd}
      />

      <aside
        className={`resume-side-panel resume-editor-panel no-print flex flex-col overflow-hidden ${styles.editorPanel} ${styles.editorPanelShell}`}
        style={{ width: `${editorPanelWidth}px` }}
      >
        {editorContent}
      </aside>
    </div>
  )
}
