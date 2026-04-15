'use client'

import { type RefObject, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const PREVIEW_INITIAL_SCALE = 0.6
const PREVIEW_MIN_SCALE = 0.3
const PREVIEW_MAX_SCALE = 6
const PREVIEW_FIT_HORIZONTAL_PADDING = 24
const PREVIEW_FIT_HEIGHT_PADDING = 16
const PREVIEW_SCROLL_VERTICAL_PADDING = 80
const PREVIEW_ZOOM_STEP_BUTTON = 0.06
const PREVIEW_ZOOM_STEP_WHEEL = 0.01

type PreventableEvent =
  | { preventDefault: () => void; cancelable?: boolean }
  | { preventDefault: () => void; nativeEvent?: { cancelable?: boolean } }

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function preventDefaultIfCancelable(event: PreventableEvent) {
  const nativeCancelable = 'nativeEvent' in event ? event.nativeEvent?.cancelable : undefined
  const directCancelable = 'cancelable' in event ? event.cancelable : undefined
  if (nativeCancelable === true || directCancelable === true) {
    event.preventDefault()
  }
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

async function ensureFontsReady() {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return
  }

  try {
    await document.fonts.ready
  } catch {
    // ignore font loading edge cases
  }
}

function resolvePreviewFitTarget(previewContent: HTMLDivElement | null) {
  if (!previewContent) return null

  const compareStage = previewContent.querySelector<HTMLElement>('.resume-ai-compare-stage')
  if (compareStage) {
    return compareStage
  }

  const pages = previewContent.querySelectorAll<HTMLElement>('[data-template]')
  if (pages.length > 0) {
    return pages[0]
  }

  return previewContent.querySelector<HTMLElement>('.resume-preview-root') || previewContent
}

function resolvePreviewFitScale(
  viewport: HTMLDivElement | null,
  previewContent: HTMLDivElement | null,
) {
  if (!viewport || !previewContent) {
    return PREVIEW_INITIAL_SCALE
  }

  const target = resolvePreviewFitTarget(previewContent)
  if (!target) {
    return PREVIEW_INITIAL_SCALE
  }

  const availableWidth = Math.max(viewport.clientWidth - PREVIEW_FIT_HORIZONTAL_PADDING * 2, 0)
  const availableHeight = Math.max(viewport.clientHeight - PREVIEW_FIT_HEIGHT_PADDING * 2, 0)
  const contentWidth = Math.max(target.offsetWidth, target.scrollWidth)
  const contentHeight = Math.max(target.offsetHeight, target.scrollHeight)

  if (!availableWidth || !availableHeight || !contentWidth || !contentHeight) {
    return PREVIEW_INITIAL_SCALE
  }

  return clamp(
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
    PREVIEW_MIN_SCALE,
    PREVIEW_MAX_SCALE,
  )
}

function hasPreviewLayoutReady(
  viewport: HTMLDivElement | null,
  previewContent: HTMLDivElement | null,
) {
  if (!viewport || !previewContent) return false

  const target = resolvePreviewFitTarget(previewContent)
  if (!target) return false

  const availableWidth = Math.max(viewport.clientWidth - PREVIEW_FIT_HORIZONTAL_PADDING * 2, 0)
  const availableHeight = Math.max(viewport.clientHeight - PREVIEW_FIT_HEIGHT_PADDING * 2, 0)
  const contentWidth = Math.max(target.offsetWidth, target.scrollWidth)
  const contentHeight = Math.max(target.offsetHeight, target.scrollHeight)

  return availableWidth > 0 && availableHeight > 0 && contentWidth > 0 && contentHeight > 0
}

function resolvePreviewScrollMax(viewport: HTMLDivElement | null, scrollSpaceHeight: number) {
  if (!viewport) return 0
  return Math.max(scrollSpaceHeight - viewport.clientHeight, 0)
}

function resolveCenteredScrollTop(
  viewport: HTMLDivElement | null,
  currentScale: number,
  nextScale: number,
  verticalPadding: number,
) {
  if (!viewport) return verticalPadding

  const viewportCenter = viewport.scrollTop + viewport.clientHeight / 2
  const effectiveCurrentScale = currentScale || 1
  const contentCenter = (viewportCenter - verticalPadding) / effectiveCurrentScale
  return contentCenter * nextScale + verticalPadding - viewport.clientHeight / 2
}

interface UsePreviewWorkspaceControlsOptions {
  initialized: boolean
  previewFitKey: string
  previewContentRef: RefObject<HTMLDivElement | null>
  previewViewportRef: RefObject<HTMLDivElement | null>
}

export function usePreviewWorkspaceControls({
  initialized,
  previewFitKey,
  previewContentRef,
  previewViewportRef,
}: UsePreviewWorkspaceControlsOptions) {
  const [previewScale, setPreviewScale] = useState(PREVIEW_INITIAL_SCALE)
  const [previewContentHeight, setPreviewContentHeight] = useState(0)
  const [previewAutoFitReadyKey, setPreviewAutoFitReadyKey] = useState<string | null>(null)
  const [spaceZoomActive, setSpaceZoomActive] = useState(false)
  const [previewInteractionActive, setPreviewInteractionActive] = useState(false)

  const previewScaleRef = useRef(PREVIEW_INITIAL_SCALE)
  const initialPreviewScaleRef = useRef(PREVIEW_INITIAL_SCALE)
  const previewHasInitialFitRef = useRef(false)
  const previewPendingScrollTopRef = useRef<number | null>(null)
  const previewContentHeightRef = useRef(0)

  const previewScaledHeight = Math.max(previewContentHeight * previewScale, 0)
  const previewScrollSpaceHeight = previewScaledHeight + PREVIEW_SCROLL_VERTICAL_PADDING * 2
  const previewReady = previewAutoFitReadyKey === previewFitKey

  const setPreviewScaleCentered = useCallback((nextScaleRaw: number) => {
    const viewport = previewViewportRef.current
    const currentScale = previewScaleRef.current
    const nextScale = clamp(nextScaleRaw, PREVIEW_MIN_SCALE, PREVIEW_MAX_SCALE)

    if (Math.abs(nextScale - currentScale) < 0.001) return

    const nextScrollTop = resolveCenteredScrollTop(
      viewport,
      currentScale,
      nextScale,
      PREVIEW_SCROLL_VERTICAL_PADDING,
    )
    previewScaleRef.current = nextScale
    setPreviewScale(nextScale)
    const nextScrollSpaceHeight = previewContentHeightRef.current * nextScale + PREVIEW_SCROLL_VERTICAL_PADDING * 2
    const maxScrollTop = resolvePreviewScrollMax(viewport, nextScrollSpaceHeight)
    previewPendingScrollTopRef.current = clamp(nextScrollTop, 0, maxScrollTop)
  }, [previewViewportRef])

  const fitPreviewToHeight = useCallback(async (maxAttempts = 8) => {
    await ensureFontsReady()

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })

      const viewport = previewViewportRef.current
      const previewContent = previewContentRef.current
      if (!hasPreviewLayoutReady(viewport, previewContent)) {
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 32)
        })
        continue
      }

      const nextScale = resolvePreviewFitScale(viewport, previewContent)
      initialPreviewScaleRef.current = nextScale
      previewScaleRef.current = nextScale
      setPreviewScale(nextScale)
      previewPendingScrollTopRef.current = PREVIEW_SCROLL_VERTICAL_PADDING
      return true
    }

    return false
  }, [previewContentRef, previewViewportRef])

  const handlePreviewZoomIn = useCallback(() => {
    setPreviewAutoFitReadyKey(previewFitKey)
    setPreviewScaleCentered(previewScaleRef.current + PREVIEW_ZOOM_STEP_BUTTON)
  }, [previewFitKey, setPreviewScaleCentered])

  const handlePreviewZoomOut = useCallback(() => {
    setPreviewAutoFitReadyKey(previewFitKey)
    setPreviewScaleCentered(previewScaleRef.current - PREVIEW_ZOOM_STEP_BUTTON)
  }, [previewFitKey, setPreviewScaleCentered])

  const handlePreviewCenter = useCallback(() => {
    setPreviewAutoFitReadyKey(previewFitKey)
    void fitPreviewToHeight()
  }, [fitPreviewToHeight, previewFitKey])

  useEffect(() => {
    previewScaleRef.current = previewScale
  }, [previewScale])

  useLayoutEffect(() => {
    const pendingScrollTop = previewPendingScrollTopRef.current
    if (pendingScrollTop === null) return
    const viewport = previewViewportRef.current
    if (!viewport) return
    const maxScrollTop = resolvePreviewScrollMax(viewport, previewScrollSpaceHeight)
    viewport.scrollTop = clamp(pendingScrollTop, 0, maxScrollTop)
    previewPendingScrollTopRef.current = null
  }, [previewScale, previewScrollSpaceHeight, previewViewportRef])

  useEffect(() => {
    previewContentHeightRef.current = previewContentHeight
  }, [previewContentHeight])

  useEffect(() => {
    const target = previewContentRef.current
    if (!target) return

    const updateHeight = () => {
      const nextHeight = target.offsetHeight
      setPreviewContentHeight((prev) => (Math.abs(prev - nextHeight) < 1 ? prev : nextHeight))
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      updateHeight()
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [previewContentRef, previewFitKey])

  useEffect(() => {
    previewHasInitialFitRef.current = false
  }, [previewFitKey])

  useEffect(() => {
    if (!initialized) return
    if (previewHasInitialFitRef.current) return
    if (previewContentHeight <= 0) return

    let cancelled = false

    void (async () => {
      const fitted = await fitPreviewToHeight()
      if (cancelled) return
      previewHasInitialFitRef.current = fitted
      if (fitted) {
        setPreviewAutoFitReadyKey(previewFitKey)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fitPreviewToHeight, initialized, previewContentHeight, previewFitKey])

  useEffect(() => {
    const viewport = previewViewportRef.current
    if (!viewport) return
    const maxScrollTop = resolvePreviewScrollMax(viewport, previewScrollSpaceHeight)
    if (viewport.scrollTop > maxScrollTop) {
      viewport.scrollTop = maxScrollTop
    }
  }, [previewScrollSpaceHeight, previewViewportRef])

  useEffect(() => {
    const viewport = previewViewportRef.current
    if (!viewport) return

    const onWheel = (event: WheelEvent) => {
      const shouldZoom = event.ctrlKey || event.metaKey || spaceZoomActive
      if (!shouldZoom) return

      event.preventDefault()
      event.stopPropagation()

      if (!event.deltaY) return
      const step = event.deltaY < 0 ? PREVIEW_ZOOM_STEP_WHEEL : -PREVIEW_ZOOM_STEP_WHEEL
      setPreviewScaleCentered(previewScaleRef.current + step)
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', onWheel)
    }
  }, [previewViewportRef, setPreviewScaleCentered, spaceZoomActive])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      if (isEditableElement(event.target)) return
      if (!previewInteractionActive) return
      preventDefaultIfCancelable(event)
      event.stopPropagation()
      setSpaceZoomActive(true)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      if (previewInteractionActive && !isEditableElement(event.target)) {
        preventDefaultIfCancelable(event)
        event.stopPropagation()
      }
      setSpaceZoomActive(false)
    }

    const onWindowBlur = () => {
      setSpaceZoomActive(false)
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', onWindowBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [previewInteractionActive])

  const handlePreviewPointerEnter = useCallback(() => {
    setPreviewInteractionActive(true)
  }, [])

  const handlePreviewPointerDown = useCallback(() => {
    setPreviewInteractionActive(true)
  }, [])

  const handlePreviewPointerLeave = useCallback(() => {
    setPreviewInteractionActive(false)
    setSpaceZoomActive(false)
  }, [])

  const resetPreviewReady = useCallback(() => {
    setPreviewAutoFitReadyKey(null)
  }, [])

  return useMemo(
    () => ({
      previewScale,
      previewScrollSpaceHeight,
      previewReady,
      verticalPadding: PREVIEW_SCROLL_VERTICAL_PADDING,
      onZoomIn: handlePreviewZoomIn,
      onZoomOut: handlePreviewZoomOut,
      onCenter: handlePreviewCenter,
      onFit: fitPreviewToHeight,
      onPreviewPointerEnter: handlePreviewPointerEnter,
      onPreviewPointerDown: handlePreviewPointerDown,
      onPreviewPointerLeave: handlePreviewPointerLeave,
      resetPreviewReady,
    }),
    [
      fitPreviewToHeight,
      handlePreviewCenter,
      handlePreviewPointerDown,
      handlePreviewPointerEnter,
      handlePreviewPointerLeave,
      handlePreviewZoomIn,
      handlePreviewZoomOut,
      previewReady,
      previewScale,
      previewScrollSpaceHeight,
      resetPreviewReady,
    ],
  )
}
