'use client'

import { type CSSProperties, type RefObject, type ReactNode } from 'react'
import { ZoomIn, ZoomOut } from 'lucide-react'
import { Button, IconMaximize, IconRefresh, IconRedo, IconUndo, Tooltip } from '../../primitives'
import { useResumeBuilderStore } from '../../store/useResumeBuilderStore'
import styles from './ResumePreviewWorkspace.module.scss'

interface ResumePreviewCanvasProps {
  viewportPaddingStyle?: CSSProperties
  content: ReactNode
  previewContentRef: RefObject<HTMLDivElement | null>
  previewViewportRef: RefObject<HTMLDivElement | null>
  previewScale: number
  previewScrollSpaceHeight: number
  verticalPadding: number
  ready: boolean
}

function ResumePreviewCanvas({
  viewportPaddingStyle,
  content,
  previewContentRef,
  previewViewportRef,
  previewScale,
  previewScrollSpaceHeight,
  verticalPadding,
  ready,
}: ResumePreviewCanvasProps) {
  const scrollSpaceHeight = previewScrollSpaceHeight > 0 ? previewScrollSpaceHeight : 1

  return (
    <div ref={previewViewportRef} className={styles.viewport} style={viewportPaddingStyle}>
      <div className={styles.scrollSpace} style={{ height: scrollSpaceHeight }}>
        <div
          className={styles.stageShell}
          style={{
            top: verticalPadding,
            transform: `translateX(-50%) scale(${previewScale})`,
            opacity: ready ? 1 : 0,
          }}
        >
          <div ref={previewContentRef} className={styles.stage}>
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResumePreviewDock({
  scale,
  ready,
  onZoomIn,
  onZoomOut,
  onCenter,
  onFit,
}: {
  scale: number
  ready: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onCenter: () => void
  onFit: () => void
}) {
  const undo = useResumeBuilderStore(state => state.undo)
  const redo = useResumeBuilderStore(state => state.redo)

  return (
    <div className={`${styles.dockWrap} no-print`}>
      <div className={styles.dock}>
        <Tooltip content="撤销">
          <Button type="text" size="small" icon={<IconUndo />} onClick={undo} className={styles.dockButton} aria-label="撤销" />
        </Tooltip>
        <Tooltip content="重做">
          <Button type="text" size="small" icon={<IconRedo />} onClick={redo} className={styles.dockButton} aria-label="重做" />
        </Tooltip>

        <span className={styles.dockDivider} />

        <Tooltip content="放大">
          <Button
            type="text"
            size="small"
            icon={<ZoomIn className="h-4 w-4" />}
            onClick={onZoomIn}
            className={styles.dockButton}
            aria-label="放大预览"
          />
        </Tooltip>
        <Tooltip content="缩小">
          <Button
            type="text"
            size="small"
            icon={<ZoomOut className="h-4 w-4" />}
            onClick={onZoomOut}
            className={styles.dockButton}
            aria-label="缩小预览"
          />
        </Tooltip>
        <Tooltip content="重置缩放">
          <Button
            type="text"
            size="small"
            icon={<IconRefresh />}
            onClick={onCenter}
            className={styles.dockButton}
            aria-label="恢复初始缩放"
          />
        </Tooltip>
        <Tooltip content="适应画布">
          <Button
            type="text"
            size="small"
            icon={<IconMaximize />}
            onClick={onFit}
            className={styles.dockButton}
            aria-label="适应画布"
          />
        </Tooltip>

        <Button type="text" size="small" onClick={onCenter} className={`${styles.dockButton} text-xs tabular-nums`}>
          {ready ? `${Math.round(scale * 100)}%` : '适配中'}
        </Button>
      </div>
    </div>
  )
}

interface ResumePreviewWorkspaceProps extends ResumePreviewCanvasProps {
  editorPanelWidth: number
  previewLeftPadding: number
  aiPreviewVisible: boolean
  aiPreviewActionLoading: 'new_version' | 'overwrite' | 'discard' | null
  onRunPreviewDraftAction: (action: 'new_version' | 'overwrite' | 'discard') => void
  onPointerEnter: () => void
  onPointerDown: () => void
  onPointerLeave: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onCenter: () => void
  onFit: () => void
}

export function ResumePreviewWorkspace({
  editorPanelWidth,
  previewLeftPadding,
  aiPreviewVisible,
  aiPreviewActionLoading,
  onRunPreviewDraftAction,
  onPointerEnter,
  onPointerDown,
  onPointerLeave,
  onZoomIn,
  onZoomOut,
  onCenter,
  onFit,
  ...canvasProps
}: ResumePreviewWorkspaceProps) {
  const viewportPaddingStyle = {
    padding: `20px ${editorPanelWidth + 6}px 28px ${previewLeftPadding}px`,
  } satisfies CSSProperties

  return (
    <div
      className={styles.workspace}
      onPointerEnter={onPointerEnter}
      onPointerDown={onPointerDown}
      onPointerLeave={onPointerLeave}
    >
      {aiPreviewVisible ? (
        <div className={`${styles.previewActions} no-print`}>
          <button
            type="button"
            className="resume-ai-mini-btn"
            disabled={Boolean(aiPreviewActionLoading)}
            onClick={() => onRunPreviewDraftAction('new_version')}
          >
            {aiPreviewActionLoading === 'new_version' ? '保存中...' : '确认保存'}
          </button>
          <button
            type="button"
            className="resume-ai-mini-btn is-outline"
            disabled={Boolean(aiPreviewActionLoading)}
            onClick={() => onRunPreviewDraftAction('overwrite')}
          >
            {aiPreviewActionLoading === 'overwrite' ? '覆盖中...' : '覆盖原版'}
          </button>
          <button
            type="button"
            className="resume-ai-mini-btn is-ghost"
            disabled={Boolean(aiPreviewActionLoading)}
            onClick={() => onRunPreviewDraftAction('discard')}
          >
            {aiPreviewActionLoading === 'discard' ? '处理中...' : '放弃草稿'}
          </button>
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden">
        <ResumePreviewCanvas {...canvasProps} viewportPaddingStyle={viewportPaddingStyle} />
        <ResumePreviewDock
          scale={canvasProps.previewScale}
          ready={canvasProps.ready}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onCenter={onCenter}
          onFit={onFit}
        />
      </div>
    </div>
  )
}
