'use client'

import { type CSSProperties, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './preview.module.scss'

interface FloatingWindowPosition {
  x: number
  y: number
}

interface DebugMetricBreakdown {
  textHeightPx: number
  paddingPx: number
  borderPx: number
  marginPx: number
  totalHeightPx: number
}

export interface ComposedDebugBlockRow {
  id: string
  sectionId: string
  predicted: DebugMetricBreakdown
  actual: DebugMetricBreakdown | null
}

interface ComposedDebugFloatingPanelProps {
  visible: boolean
  predictedHeightPx: number | null
  actualContentHeightPx: number
  heightDeltaPx: number | null
  pageViewportHeightPx: number
  contentMaxHeightPx: number | null
  overflowPx: number | null
  contentMaxOverflowPx: number | null
  scaleX: number
  scaleY: number
  blockCount: number
  measuredBlocks: number
  textDeltaPx: number
  paddingDeltaPx: number
  borderDeltaPx: number
  marginDeltaPx: number
  rows: ComposedDebugBlockRow[]
}

const PANEL_MARGIN_PX = 8

function clampPanelPosition(position: FloatingWindowPosition, panelWidth: number, panelHeight: number): FloatingWindowPosition {
  const maxX = Math.max(PANEL_MARGIN_PX, window.innerWidth - panelWidth - PANEL_MARGIN_PX)
  const maxY = Math.max(PANEL_MARGIN_PX, window.innerHeight - panelHeight - PANEL_MARGIN_PX)
  return {
    x: Math.min(maxX, Math.max(PANEL_MARGIN_PX, position.x)),
    y: Math.min(maxY, Math.max(PANEL_MARGIN_PX, position.y)),
  }
}

function formatPx(value: number | null | undefined) {
  return Number.isFinite(value) ? `${(value as number).toFixed(1)}px` : '...'
}

function formatDeltaPx(value: number | null | undefined) {
  return Number.isFinite(value) ? `${(value as number) >= 0 ? '+' : ''}${(value as number).toFixed(1)}px` : '...'
}

export function ComposedDebugFloatingPanel({
  visible,
  predictedHeightPx,
  actualContentHeightPx,
  heightDeltaPx,
  pageViewportHeightPx,
  contentMaxHeightPx,
  overflowPx,
  contentMaxOverflowPx,
  scaleX,
  scaleY,
  blockCount,
  measuredBlocks,
  textDeltaPx,
  paddingDeltaPx,
  borderDeltaPx,
  marginDeltaPx,
  rows,
}: ComposedDebugFloatingPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null)
  const dragOffsetRef = useRef<FloatingWindowPosition | null>(null)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState<FloatingWindowPosition | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const panel = panelRef.current
    if (!panel) return

    const rect = panel.getBoundingClientRect()
    const currentPosition = { x: rect.left, y: rect.top }
    setPosition(currentPosition)
    dragOffsetRef.current = {
      x: event.clientX - currentPosition.x,
      y: event.clientY - currentPosition.y,
    }
    setIsDragging(true)
    event.preventDefault()
    event.stopPropagation()
  }

  useEffect(() => {
    if (!visible) {
      setIsDragging(false)
      dragOffsetRef.current = null
      return
    }
    if (!isDragging || typeof window === 'undefined') return

    const handlePointerMove = (event: PointerEvent) => {
      const panelWidth = panelRef.current?.offsetWidth || 312
      const panelHeight = panelRef.current?.offsetHeight || 420
      const dragOffset = dragOffsetRef.current
      if (!dragOffset) return

      setPosition(clampPanelPosition({
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y,
      }, panelWidth, panelHeight))
    }

    const stopDragging = () => {
      setIsDragging(false)
      dragOffsetRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [isDragging, visible])

  useEffect(() => {
    if (!visible || !position || typeof window === 'undefined') return

    const handleResize = () => {
      const panelWidth = panelRef.current?.offsetWidth || 312
      const panelHeight = panelRef.current?.offsetHeight || 420
      setPosition(prev => (prev ? clampPanelPosition(prev, panelWidth, panelHeight) : prev))
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [position, visible])

  if (!visible || !mounted) return null

  const style: CSSProperties | undefined = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        right: 'auto',
      }
    : undefined

  return createPortal(
    <aside
      ref={panelRef}
      className={[
        styles.composedDebugPanel,
        styles.composedDebugFloating,
        isDragging ? styles.composedDebugDragging : '',
      ].filter(Boolean).join(' ')}
      style={style}
      onPointerDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
    >
      <div
        className={[
          styles.composedDebugDragHandle,
          isDragging ? styles.composedDebugDragHandleDragging : '',
        ].filter(Boolean).join(' ')}
        onPointerDown={handlePointerDown}
      >
        <div className={styles.composedDebugTitle}>Height Debug</div>
        <div className={styles.composedDebugDragHint}>Drag</div>
      </div>

      <div className={styles.composedDebugSummary}>
        <div>Content Total(P/A/D): {formatPx(predictedHeightPx)} / {formatPx(actualContentHeightPx || null)} / {formatDeltaPx(heightDeltaPx)}</div>
        <div>Page Viewport: {formatPx(pageViewportHeightPx || null)}</div>
        <div>Page Content Max: {formatPx(contentMaxHeightPx)}</div>
        <div>Overflow(Content-Page): {formatDeltaPx(overflowPx)}</div>
        <div>Overflow(Content-Max): {formatDeltaPx(contentMaxOverflowPx)}</div>
        <div>Scale(x/y): {scaleX.toFixed(3)} / {scaleY.toFixed(3)}</div>
        <div>Blocks: {blockCount} (measured: {measuredBlocks})</div>
        <div>Text Δ: {formatDeltaPx(textDeltaPx)}</div>
        <div>Padding Δ: {formatDeltaPx(paddingDeltaPx)}</div>
        <div>Border Δ: {formatDeltaPx(borderDeltaPx)}</div>
        <div>Margin Δ: {formatDeltaPx(marginDeltaPx)}</div>
      </div>

      <div className={styles.composedDebugBlockList}>
        {rows.map(row => (
          <section key={row.id} className={styles.composedDebugBlock}>
            <div className={styles.composedDebugBlockTitle}>{row.id} ({row.sectionId})</div>
            <div className={styles.composedDebugMetric}>total: {formatPx(row.predicted.totalHeightPx)} / {formatPx(row.actual?.totalHeightPx)} / {formatDeltaPx(row.actual ? row.predicted.totalHeightPx - row.actual.totalHeightPx : null)}</div>
            <div className={styles.composedDebugMetric}>text: {formatPx(row.predicted.textHeightPx)} / {formatPx(row.actual?.textHeightPx)} / {formatDeltaPx(row.actual ? row.predicted.textHeightPx - row.actual.textHeightPx : null)}</div>
            <div className={styles.composedDebugMetric}>padding: {formatPx(row.predicted.paddingPx)} / {formatPx(row.actual?.paddingPx)} / {formatDeltaPx(row.actual ? row.predicted.paddingPx - row.actual.paddingPx : null)}</div>
            <div className={styles.composedDebugMetric}>border: {formatPx(row.predicted.borderPx)} / {formatPx(row.actual?.borderPx)} / {formatDeltaPx(row.actual ? row.predicted.borderPx - row.actual.borderPx : null)}</div>
            <div className={styles.composedDebugMetric}>margin: {formatPx(row.predicted.marginPx)} / {formatPx(row.actual?.marginPx)} / {formatDeltaPx(row.actual ? row.predicted.marginPx - row.actual.marginPx : null)}</div>
          </section>
        ))}
      </div>
    </aside>,
    document.body,
  )
}
