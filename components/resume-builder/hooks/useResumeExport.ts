'use client'

import { type RefObject, useCallback, useState } from 'react'
import { Message } from '@/components/resume-builder/primitives'
import type { ResumeData } from '@/lib/resume/types'

type SnapdomOptions = {
  scale?: number
  width?: number
  height?: number
  backgroundColor?: string
  embedFonts?: boolean
  cache?: 'disabled' | 'soft' | 'auto' | 'full'
}

type SnapdomRenderer = {
  toCanvas: (
    element: HTMLElement,
    options?: SnapdomOptions,
  ) => Promise<HTMLCanvasElement>
}

declare global {
  interface Window {
    snapdom?: SnapdomRenderer
  }
}

const SNAPDOM_SCRIPT_ID = 'resume-snapdom-script'
const SNAPDOM_SCRIPT_SOURCES = [
  'https://unpkg.com/@zumer/snapdom@2.7.0/dist/snapdom.js',
  'https://cdn.jsdelivr.net/npm/@zumer/snapdom@2.7.0/dist/snapdom.js',
] as const

const IMAGE_EXPORT_RENDER_SCALE = 2
const PDF_EXPORT_RENDER_SCALE = 1.5
const PDF_EXPORT_IMAGE_MIME = 'image/jpeg'
const PDF_EXPORT_IMAGE_FORMAT: ResumePdfWorkerPagePayload['format'] = 'JPEG'
const PDF_EXPORT_IMAGE_QUALITY = 0.84
const PDF_A4_WIDTH_MM = 210
const PDF_A4_HEIGHT_MM = 297
const PDF_MIN_FREE_FORM_HEIGHT_MM = 20
const PDF_WORKER_SCRIPT_VERSION = '2026-04-14-free-form-1'

let snapdomLoadingPromise: Promise<SnapdomRenderer> | null = null

type ResumeImageExportFormat = 'png' | 'jpg'

interface ExportTimingEntry {
  step: string
  durationMs: number
}

interface PdfExportPageStat {
  page: number
  canvasWidth: number
  canvasHeight: number
  pixelCount: number
  blobBytes: number
  pageWidthMm: number
  pageHeightMm: number
}

interface ResumePdfWorkerPagePayload {
  width: number
  height: number
  widthMm: number
  heightMm: number
  format: 'JPEG'
  buffer: ArrayBuffer
}

interface ResumePdfWorkerSuccessPayload {
  blob: Blob
  filename: string
  size: number
  timings: ExportTimingEntry[]
}

function formatDurationMs(durationMs: number) {
  return `${durationMs.toFixed(1)}ms`
}

function createExportProfiler(label: string) {
  const rows: ExportTimingEntry[] = []

  return {
    record(step: string, durationMs: number) {
      rows.push({ step, durationMs })
    },
    async measure<T>(step: string, task: () => Promise<T> | T): Promise<T> {
      const start = performance.now()
      const result = await task()
      const durationMs = performance.now() - start
      rows.push({ step, durationMs })
      return result
    },
    flush(meta?: Record<string, unknown>) {
      const totalDurationMs = rows.reduce((sum, entry) => sum + entry.durationMs, 0)
      const tableRows = [
        ...rows.map((entry) => ({ step: entry.step, durationMs: Number(entry.durationMs.toFixed(2)) })),
        { step: 'TOTAL', durationMs: Number(totalDurationMs.toFixed(2)) },
      ]

      console.groupCollapsed(`[Resume Export] ${label}`)
      console.table(tableRows)
      if (meta) {
        console.log('meta', meta)
      }
      console.groupEnd()

      return totalDurationMs
    },
  }
}

function createOffscreenExportCaptureRoot(sourceRoot: HTMLElement) {
  const captureHost = document.createElement('div')
  captureHost.setAttribute('aria-hidden', 'true')
  captureHost.style.position = 'fixed'
  captureHost.style.left = '-20000px'
  captureHost.style.top = '0'
  captureHost.style.opacity = '0'
  captureHost.style.pointerEvents = 'none'
  captureHost.style.zIndex = '-1'
  captureHost.style.width = 'max-content'
  captureHost.style.maxWidth = 'none'

  const clonedRoot = sourceRoot.cloneNode(true) as HTMLElement
  clonedRoot.style.setProperty('--resume-export-preview-scale', '1')
  clonedRoot.style.setProperty('zoom', '1')
  clonedRoot.style.setProperty('transform', 'none')
  clonedRoot.style.setProperty('margin-inline', '0')
  clonedRoot.style.setProperty('width', 'max-content')
  captureHost.appendChild(clonedRoot)

  document.body.appendChild(captureHost)
  return { captureHost, captureRoot: clonedRoot }
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality)
  })
}

function resolvePdfPageSizeMm(
  canvas: HTMLCanvasElement,
  pageFormat: ResumeData['metadata']['page']['format'],
) {
  const isLandscape = canvas.width >= canvas.height
  const widthMm = isLandscape ? PDF_A4_HEIGHT_MM : PDF_A4_WIDTH_MM
  const fixedHeightMm = isLandscape ? PDF_A4_WIDTH_MM : PDF_A4_HEIGHT_MM

  if (pageFormat !== 'free-form') {
    return { widthMm, heightMm: fixedHeightMm }
  }

  const ratio = canvas.width > 0 ? canvas.height / canvas.width : fixedHeightMm / widthMm
  const dynamicHeightMm = Math.max(PDF_MIN_FREE_FORM_HEIGHT_MM, widthMm * ratio)
  return { widthMm, heightMm: Number(dynamicHeightMm.toFixed(2)) }
}

function removeExternalScript(script: HTMLScriptElement | null) {
  if (!script) return
  if (script.parentNode) {
    script.parentNode.removeChild(script)
  }
}

function waitForScriptGlobal<T>(
  script: HTMLScriptElement,
  resolver: () => T | null,
  errorMessage: string,
) {
  const resolved = resolver()
  if (resolved) {
    return Promise.resolve(resolved)
  }

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }

    const onLoad = () => {
      cleanup()
      const globalObject = resolver()
      if (globalObject) {
        resolve(globalObject)
        return
      }
      reject(new Error(errorMessage))
    }

    const onError = () => {
      cleanup()
      reject(new Error(errorMessage))
    }

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
  })
}

async function loadScriptGlobalWithFallback<T>(
  scriptId: string,
  sources: readonly string[],
  resolver: () => T | null,
  errorMessage: string,
) {
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null
  if (existing) {
    try {
      return await waitForScriptGlobal(existing, resolver, errorMessage)
    } catch {
      removeExternalScript(existing)
    }
  }

  for (const source of sources) {
    const stale = document.getElementById(scriptId) as HTMLScriptElement | null
    removeExternalScript(stale)

    const script = document.createElement('script')
    script.id = scriptId
    script.src = source
    script.async = true
    document.body.appendChild(script)

    try {
      return await waitForScriptGlobal(script, resolver, errorMessage)
    } catch {
      removeExternalScript(script)
    }
  }

  throw new Error(errorMessage)
}

function loadSnapdom(): Promise<SnapdomRenderer> {
  const globalSnapdom = window.snapdom
  if (globalSnapdom && typeof globalSnapdom.toCanvas === 'function') {
    return Promise.resolve(globalSnapdom)
  }

  if (snapdomLoadingPromise) {
    return snapdomLoadingPromise
  }

  snapdomLoadingPromise = loadScriptGlobalWithFallback(
    SNAPDOM_SCRIPT_ID,
    SNAPDOM_SCRIPT_SOURCES,
    () => {
      const candidate = window.snapdom
      if (candidate && typeof candidate.toCanvas === 'function') {
        return candidate
      }
      return null
    },
    'snapdom 加载失败',
  ).finally(() => {
    snapdomLoadingPromise = null
  })

  return snapdomLoadingPromise
}

function nextAnimationFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function buildPdfInWorker(payload: {
  filename: string
  pages: ResumePdfWorkerPagePayload[]
}): Promise<ResumePdfWorkerSuccessPayload> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      reject(new Error('当前环境不支持后台导出'))
      return
    }

    const worker = new Worker(`/resume-pdf.worker.js?v=${PDF_WORKER_SCRIPT_VERSION}`)

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      worker.terminate()
    }

    const handleMessage = (event: MessageEvent<unknown>) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      const workerPayload = data as {
        type?: string
        error?: string
        blob?: Blob
        filename?: string
        size?: number
        timings?: ExportTimingEntry[]
      }

      if (workerPayload.type === 'BUILD_PDF_SUCCESS' && workerPayload.blob instanceof Blob) {
        cleanup()
        resolve({
          blob: workerPayload.blob,
          filename: workerPayload.filename || payload.filename,
          size: typeof workerPayload.size === 'number' ? workerPayload.size : workerPayload.blob.size,
          timings: Array.isArray(workerPayload.timings) ? workerPayload.timings : [],
        })
        return
      }

      if (workerPayload.type === 'BUILD_PDF_ERROR') {
        cleanup()
        reject(new Error(workerPayload.error || 'PDF 生成失败'))
      }
    }

    const handleError = () => {
      cleanup()
      reject(new Error('PDF 生成失败'))
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)

    try {
      const transferList = payload.pages.map((page) => page.buffer)
      worker.postMessage(
        {
          type: 'BUILD_PDF',
          payload,
        },
        transferList,
      )
    } catch {
      cleanup()
      reject(new Error('PDF 生成失败'))
    }
  })
}

interface UseResumeExportOptions {
  previewContentRef: RefObject<HTMLDivElement | null>
  resumeTitleRef: RefObject<string>
  fallbackTitle: string
  pageFormat: ResumeData['metadata']['page']['format']
  ensureAuthForAction: () => Promise<boolean>
}

export function useResumeExport({
  previewContentRef,
  resumeTitleRef,
  fallbackTitle,
  pageFormat,
  ensureAuthForAction,
}: UseResumeExportOptions) {
  const [exporting, setExporting] = useState(false)

  const exportResumePagesAsImage = useCallback(
    async (format: ResumeImageExportFormat) => {
      try {
        await ensureFontsReady()
        const snapdom = await loadSnapdom()
        const previewRoot = previewContentRef.current?.querySelector<HTMLElement>('.resume-preview-root')
        if (!previewRoot) {
          Message.error('预览尚未准备完成，请稍后重试')
          return
        }

        const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>('[data-template]'))
        if (pages.length === 0) {
          Message.error('当前没有可导出的页面')
          return
        }

        const normalizedTitle =
          (resumeTitleRef.current || fallbackTitle || 'resume').trim().replace(/[^\w\u4e00-\u9fa5-]+/g, '-') ||
          'resume'
        const renderOptions: SnapdomOptions = {
          backgroundColor: '#ffffff',
          scale: IMAGE_EXPORT_RENDER_SCALE,
          embedFonts: true,
          cache: 'auto',
        }
        const renderPageToCanvas = async (page: HTMLElement) => {
          return snapdom.toCanvas(page, renderOptions)
        }

        const { captureHost, captureRoot } = createOffscreenExportCaptureRoot(previewRoot)

        try {
          await nextAnimationFrame()
          await nextAnimationFrame()

          const capturePages = Array.from(captureRoot.querySelectorAll<HTMLElement>('[data-template]'))
          if (capturePages.length === 0) {
            throw new Error('图片生成失败')
          }
          const renderedCanvases: HTMLCanvasElement[] = []
          for (const page of capturePages) {
            const canvas = await renderPageToCanvas(page)
            renderedCanvases.push(canvas)
          }

          const exportWidth = Math.max(...renderedCanvases.map((canvas) => canvas.width))
          const exportHeight = renderedCanvases.reduce((sum, canvas) => sum + canvas.height, 0)
          if (!exportWidth || !exportHeight) {
            throw new Error('图片生成失败')
          }

          const stitchedCanvas = document.createElement('canvas')
          stitchedCanvas.width = exportWidth
          stitchedCanvas.height = exportHeight
          const context = stitchedCanvas.getContext('2d')
          if (!context) {
            throw new Error('图片生成失败')
          }

          context.fillStyle = '#ffffff'
          context.fillRect(0, 0, exportWidth, exportHeight)
          let drawTop = 0
          renderedCanvases.forEach((canvas) => {
            const drawLeft = Math.max(0, Math.floor((exportWidth - canvas.width) / 2))
            context.drawImage(canvas, drawLeft, drawTop)
            drawTop += canvas.height
          })

          const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
          const quality = format === 'jpg' ? 0.92 : 1
          const blob = await new Promise<Blob | null>((resolve) => stitchedCanvas.toBlob(resolve, mimeType, quality))
          if (!blob) {
            throw new Error('图片生成失败')
          }

          const filename =
            capturePages.length === 1 ? `${normalizedTitle}.${format}` : `${normalizedTitle}-continuous.${format}`
          downloadBlob(blob, filename)
          const formatLabel = format.toUpperCase()
          Message.success(capturePages.length === 1 ? `已下载 ${formatLabel}` : `已下载 ${formatLabel} 长图`)
        } finally {
          captureHost.remove()
        }
      } catch (error) {
        Message.error(error instanceof Error ? error.message : `下载 ${format.toUpperCase()} 失败`)
      }
    },
    [fallbackTitle, previewContentRef, resumeTitleRef],
  )

  const exportResumePagesAsPdf = useCallback(async () => {
    const profiler = createExportProfiler('PDF export timing')
    try {
      await profiler.measure('fonts.ready', () => ensureFontsReady())
      const snapdom = await profiler.measure('load snapdom', () => loadSnapdom())
      const previewRoot = previewContentRef.current?.querySelector<HTMLElement>('.resume-preview-root')
      if (!previewRoot) {
        Message.error('预览尚未准备完成，请稍后重试')
        return
      }

      const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>('[data-template]'))
      if (pages.length === 0) {
        Message.error('当前没有可导出的页面')
        return
      }

      const normalizedTitle =
        (resumeTitleRef.current || fallbackTitle || 'resume').trim().replace(/[^\w\u4e00-\u9fa5-]+/g, '-') ||
        'resume'
      const renderOptions: SnapdomOptions = {
        backgroundColor: '#ffffff',
        scale: PDF_EXPORT_RENDER_SCALE,
        embedFonts: true,
        cache: 'auto',
      }
      const renderPageToCanvas = async (page: HTMLElement) => {
        return snapdom.toCanvas(page, renderOptions)
      }

      const { captureHost, captureRoot } = await profiler.measure('clone preview root', () =>
        createOffscreenExportCaptureRoot(previewRoot),
      )
      try {
        await profiler.measure('wait 2 animation frames', async () => {
          await nextAnimationFrame()
          await nextAnimationFrame()
        })

        const capturePages = await profiler.measure('query capture pages', () =>
          Array.from(captureRoot.querySelectorAll<HTMLElement>('[data-template]')),
        )
        if (capturePages.length === 0) {
          throw new Error('PDF 生成失败')
        }

        const renderedCanvases: HTMLCanvasElement[] = []
        const pageStats: PdfExportPageStat[] = []
        for (const [index, page] of capturePages.entries()) {
          const canvas = await profiler.measure(`page ${index + 1} toCanvas`, () => renderPageToCanvas(page))
          renderedCanvases.push(canvas)
        }
        if (renderedCanvases.length === 0) {
          throw new Error('PDF 生成失败')
        }

        const workerPages: ResumePdfWorkerPagePayload[] = []
        for (const [index, canvas] of renderedCanvases.entries()) {
          const imageBlob = await profiler.measure(`page ${index + 1} toBlob(${PDF_EXPORT_IMAGE_FORMAT})`, () =>
            canvasToBlob(canvas, PDF_EXPORT_IMAGE_MIME, PDF_EXPORT_IMAGE_QUALITY),
          )
          if (!imageBlob) {
            throw new Error(`第 ${index + 1} 页图片编码失败`)
          }
          const imageBuffer = await profiler.measure(`page ${index + 1} blob.arrayBuffer`, () => imageBlob.arrayBuffer())
          const pageSizeMm = resolvePdfPageSizeMm(canvas, pageFormat)
          pageStats.push({
            page: index + 1,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            pixelCount: canvas.width * canvas.height,
            blobBytes: imageBlob.size,
            pageWidthMm: pageSizeMm.widthMm,
            pageHeightMm: pageSizeMm.heightMm,
          })
          workerPages.push({
            width: canvas.width,
            height: canvas.height,
            widthMm: pageSizeMm.widthMm,
            heightMm: pageSizeMm.heightMm,
            format: PDF_EXPORT_IMAGE_FORMAT,
            buffer: imageBuffer,
          })
        }

        const workerResult = await profiler.measure('worker build pdf', () => {
          return buildPdfInWorker({
            filename: `${normalizedTitle}.pdf`,
            pages: workerPages,
          })
        })
        workerResult.timings.forEach((entry) => {
          profiler.record(`worker ${entry.step}`, entry.durationMs)
        })
        await profiler.measure('trigger browser download', () => {
          downloadBlob(workerResult.blob, workerResult.filename)
        })
        const totalDurationMs = profiler.flush({
          pageCount: workerPages.length,
          filename: workerResult.filename,
          pageStats,
          workerPdfBytes: workerResult.size,
          pdfImage: {
            format: PDF_EXPORT_IMAGE_FORMAT,
            quality: PDF_EXPORT_IMAGE_QUALITY,
            renderScale: PDF_EXPORT_RENDER_SCALE,
          },
        })
        Message.success(`已下载 PDF（${renderedCanvases.length} 页，${formatDurationMs(totalDurationMs)}，详情见控制台）`)
      } finally {
        captureHost.remove()
      }
    } catch (error) {
      profiler.flush({
        status: 'failed',
        error: error instanceof Error ? error.message : 'unknown',
      })
      Message.error(error instanceof Error ? error.message : '下载 PDF 失败')
    }
  }, [fallbackTitle, pageFormat, previewContentRef, resumeTitleRef])

  const handleDownloadImage = useCallback(
    async (format: ResumeImageExportFormat) => {
      if (exporting) return
      if (!(await ensureAuthForAction())) {
        return
      }

      setExporting(true)
      try {
        await exportResumePagesAsImage(format)
      } finally {
        setExporting(false)
      }
    },
    [ensureAuthForAction, exportResumePagesAsImage, exporting],
  )

  const handleDownloadPdf = useCallback(async () => {
    if (exporting) return
    if (!(await ensureAuthForAction())) {
      return
    }

    setExporting(true)
    try {
      await exportResumePagesAsPdf()
    } finally {
      setExporting(false)
    }
  }, [ensureAuthForAction, exportResumePagesAsPdf, exporting])

  return {
    exporting,
    handleDownloadImage,
    handleDownloadPdf,
  }
}
