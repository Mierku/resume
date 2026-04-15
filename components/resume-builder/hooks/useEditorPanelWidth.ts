'use client'

import { type PointerEvent as ReactPointerEvent, type RefObject, useCallback, useEffect, useRef, useState } from 'react'

interface UseEditorPanelWidthOptions {
  builderScopeRef: RefObject<HTMLDivElement | null>
  storageKey?: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
}

const DEFAULT_STORAGE_KEY = 'resume:editor-panel-width'
const DEFAULT_WIDTH = 412
const DEFAULT_MIN_WIDTH = 340
const DEFAULT_MAX_WIDTH = 720

function resolveEditorPanelWidthMax(maxWidth: number) {
  if (typeof window === 'undefined') return maxWidth
  const viewportLimit = Math.floor(window.innerWidth * 0.82)
  return Math.max(DEFAULT_MIN_WIDTH, Math.min(maxWidth, viewportLimit))
}

function clampEditorPanelWidth(value: number, minWidth: number, maxWidth: number) {
  const resolvedMax = resolveEditorPanelWidthMax(maxWidth)
  return Math.max(minWidth, Math.min(resolvedMax, value))
}

function preventDefaultIfCancelable(event: ReactPointerEvent<HTMLDivElement>) {
  const nativeCancelable = event.nativeEvent?.cancelable
  if (nativeCancelable === true) {
    event.preventDefault()
  }
}

function resolveInitialEditorPanelWidth(
  storageKey: string,
  defaultWidth: number,
  minWidth: number,
  maxWidth: number,
) {
  if (typeof window === 'undefined') {
    return clampEditorPanelWidth(defaultWidth, minWidth, maxWidth)
  }

  const stored = window.localStorage.getItem(storageKey)
  if (!stored) {
    return clampEditorPanelWidth(defaultWidth, minWidth, maxWidth)
  }

  const parsed = Number.parseInt(stored, 10)
  if (!Number.isFinite(parsed)) {
    return clampEditorPanelWidth(defaultWidth, minWidth, maxWidth)
  }
  return clampEditorPanelWidth(parsed, minWidth, maxWidth)
}

export function useEditorPanelWidth({
  builderScopeRef,
  storageKey = DEFAULT_STORAGE_KEY,
  defaultWidth = DEFAULT_WIDTH,
  minWidth = DEFAULT_MIN_WIDTH,
  maxWidth = DEFAULT_MAX_WIDTH,
}: UseEditorPanelWidthOptions) {
  const [editorPanelWidth, setEditorPanelWidth] = useState(() =>
    resolveInitialEditorPanelWidth(storageKey, defaultWidth, minWidth, maxWidth),
  )
  const editorPanelResizeRef = useRef<{
    pointerId: number
    startX: number
    startWidth: number
  } | null>(null)
  const editorPanelWidthLiveRef = useRef(editorPanelWidth)

  const applyEditorPanelWidthVar = useCallback(
    (value: number) => {
      const scope = builderScopeRef.current
      if (!scope) return
      scope.style.setProperty('--resume-editor-panel-width', `${value}px`)
    },
    [builderScopeRef],
  )

  useEffect(() => {
    editorPanelWidthLiveRef.current = editorPanelWidth
    applyEditorPanelWidthVar(editorPanelWidth)
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, String(editorPanelWidth))
  }, [applyEditorPanelWidthVar, editorPanelWidth, storageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onResize = () => {
      const nextWidth = clampEditorPanelWidth(editorPanelWidthLiveRef.current, minWidth, maxWidth)
      editorPanelWidthLiveRef.current = nextWidth
      applyEditorPanelWidthVar(nextWidth)
      setEditorPanelWidth((previous) => (previous === nextWidth ? previous : nextWidth))
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [applyEditorPanelWidthVar, maxWidth, minWidth])

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('resume-editor-panel-resizing')
      }
    }
  }, [])

  const handleEditorPanelResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1120) {
      return
    }

    preventDefaultIfCancelable(event)
    event.stopPropagation()
    editorPanelResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: editorPanelWidthLiveRef.current,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (typeof document !== 'undefined') {
      document.body.classList.add('resume-editor-panel-resizing')
    }
  }, [])

  const handleEditorPanelResizeMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = editorPanelResizeRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      preventDefaultIfCancelable(event)
      event.stopPropagation()
      const deltaX = event.clientX - drag.startX
      const nextWidth = clampEditorPanelWidth(drag.startWidth - deltaX, minWidth, maxWidth)
      if (nextWidth === editorPanelWidthLiveRef.current) return
      editorPanelWidthLiveRef.current = nextWidth
      applyEditorPanelWidthVar(nextWidth)
    },
    [applyEditorPanelWidthVar, maxWidth, minWidth],
  )

  const handleEditorPanelResizeEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = editorPanelResizeRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    editorPanelResizeRef.current = null
    setEditorPanelWidth((previous) =>
      previous === editorPanelWidthLiveRef.current ? previous : editorPanelWidthLiveRef.current,
    )
    if (typeof document !== 'undefined') {
      document.body.classList.remove('resume-editor-panel-resizing')
    }
  }, [])

  return {
    editorPanelWidth,
    handleEditorPanelResizeStart,
    handleEditorPanelResizeMove,
    handleEditorPanelResizeEnd,
  }
}
