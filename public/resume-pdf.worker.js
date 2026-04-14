const JSPDF_SOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
  'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js',
]

const A4_MM = {
  width: 210,
  height: 297,
}

let jsPdfLoadPromise = null

function formatError(error) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return '未知错误'
}

function loadJsPdf() {
  if (self.jspdf && typeof self.jspdf.jsPDF === 'function') {
    return Promise.resolve(self.jspdf.jsPDF)
  }

  if (jsPdfLoadPromise) {
    return jsPdfLoadPromise
  }

  jsPdfLoadPromise = new Promise((resolve, reject) => {
    let lastError = null

    for (const source of JSPDF_SOURCES) {
      try {
        importScripts(source)
        if (self.jspdf && typeof self.jspdf.jsPDF === 'function') {
          resolve(self.jspdf.jsPDF)
          return
        }
      } catch (error) {
        lastError = error
      }
    }

    reject(lastError || new Error('jsPDF Worker 加载失败'))
  }).finally(() => {
    jsPdfLoadPromise = null
  })

  return jsPdfLoadPromise
}

function createProfiler() {
  const entries = []

  return {
    async measure(step, fn) {
      const startedAt = performance.now()
      try {
        return await fn()
      } finally {
        entries.push({
          step,
          durationMs: performance.now() - startedAt,
        })
      }
    },
    entries,
  }
}

function hasCustomPageSizeMm(page) {
  return Number.isFinite(page.widthMm) && Number.isFinite(page.heightMm) && page.widthMm > 0 && page.heightMm > 0
}

function resolvePageOrientation(page) {
  if (hasCustomPageSizeMm(page)) {
    return page.widthMm >= page.heightMm ? 'landscape' : 'portrait'
  }
  return page.width >= page.height ? 'landscape' : 'portrait'
}

function resolvePageSizeMm(page) {
  if (hasCustomPageSizeMm(page)) {
    return [page.widthMm, page.heightMm]
  }

  const orientation = resolvePageOrientation(page)
  return orientation === 'landscape'
    ? [A4_MM.height, A4_MM.width]
    : [A4_MM.width, A4_MM.height]
}

self.addEventListener('message', async event => {
  const payload = event.data
  if (!payload || payload.type !== 'BUILD_PDF') {
    return
  }

  const profiler = createProfiler()

  try {
    const JsPDF = await profiler.measure('load jsPDF', () => loadJsPdf())
    const pages = Array.isArray(payload.pages) ? payload.pages : []
    if (pages.length === 0) {
      throw new Error('没有可导出的 PDF 页面')
    }

    const firstPage = pages[0]
    const firstOrientation = resolvePageOrientation(firstPage)
    const pdf = await profiler.measure('create jsPDF instance', () => {
      return new JsPDF({
        orientation: firstOrientation,
        unit: 'mm',
        format: resolvePageSizeMm(firstPage),
        compress: true,
      })
    })

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index]
      if (index > 0) {
        await profiler.measure(`page ${index + 1} addPage`, () => {
          const orientation = resolvePageOrientation(page)
          pdf.addPage(resolvePageSizeMm(page), orientation)
        })
      }

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imageBytes = await profiler.measure(`page ${index + 1} create Uint8Array`, () => {
        return new Uint8Array(page.buffer)
      })
      await profiler.measure(`page ${index + 1} addImage`, () => {
        pdf.addImage(imageBytes, page.format || 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST')
      })
    }

    const pdfArrayBuffer = await profiler.measure('output arraybuffer', () => pdf.output('arraybuffer'))
    const pdfBlob = await profiler.measure('create pdf blob', () => {
      return new Blob([pdfArrayBuffer], { type: 'application/pdf' })
    })

    self.postMessage({
      type: 'BUILD_PDF_SUCCESS',
      blob: pdfBlob,
      filename: typeof payload.filename === 'string' ? payload.filename : 'resume.pdf',
      size: pdfBlob.size,
      timings: profiler.entries,
    })
  } catch (error) {
    self.postMessage({
      type: 'BUILD_PDF_ERROR',
      error: formatError(error),
      timings: profiler.entries,
    })
  }
})
