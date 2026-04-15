import {
  collectVisibleSectionIds,
  estimateCurrentTemplatePages,
  resolveTemplateContentMetrics,
  supportsMeasuredTemplatePagination,
} from '@/components/resume-reactive-preview/templates/estimate-current-template-height'
import type { ResumeData } from '@/lib/resume/types'

function collectRuntimeSectionIdsForEstimate(data: ResumeData) {
  const layoutSectionIds = data.metadata.layout.pages.flatMap((page) =>
    [...(page.main || []), ...(page.sidebar || [])].filter(Boolean),
  )
  return collectVisibleSectionIds(data, layoutSectionIds)
}

export function estimateTemplatePageCountForData(data: ResumeData) {
  if (!supportsMeasuredTemplatePagination(data.metadata.template)) {
    return Math.max(data.metadata.layout.pages.length, 1)
  }

  const contentMetrics = resolveTemplateContentMetrics(data)
  if (!Number.isFinite(contentMetrics.contentMaxHeightPx) || contentMetrics.contentWidthPx <= 1) {
    return 1
  }

  const sectionIds = collectRuntimeSectionIdsForEstimate(data)
  return Math.max(
    estimateCurrentTemplatePages({
      data,
      sectionIds,
      contentWidthPx: contentMetrics.contentWidthPx,
    }).pages.length,
    1,
  )
}

export function buildPreviewFitFingerprint(data: ResumeData) {
  return [
    data.metadata.template,
    data.metadata.page.format,
    data.metadata.page.marginX.toFixed(2),
    data.metadata.page.marginY.toFixed(2),
    data.metadata.page.gapX.toFixed(2),
    data.metadata.page.gapY.toFixed(2),
    data.metadata.typography.body.fontSize.toFixed(2),
    data.metadata.typography.body.lineHeight.toFixed(2),
    data.metadata.typography.heading.fontSize.toFixed(2),
    data.metadata.typography.heading.lineHeight.toFixed(2),
  ].join(':')
}
