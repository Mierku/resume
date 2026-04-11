import { RESUME_EDITOR_LIMITS, clampToRange } from '@/lib/resume/editor-limits'
import { isRenderableSkillItem } from '@/lib/resume/skills'
import type { CustomSectionType, ReactiveTemplateId, ResumeData, StandardSectionType } from '@/lib/resume/types'
import { estimateComposedHeight, type ComposedHeightEstimate } from './composed-block-engine'
import { resolveComposedRuntimeContext, resolveTemplate5SidebarPercent } from './composed-runtime-context'

export interface EstimateCurrentTemplateHeightInput {
  data: ResumeData
  sectionIds: string[]
  contentWidthPx: number
  locale?: string
}

export interface TemplateContentMetrics {
  contentWidthPx: number
  contentMaxHeightPx: number | null
}

export interface EstimatedTemplatePage {
  pageIndex: number
  sectionIds: string[]
  predictedHeightPx: number
  remainingHeightPx: number | null
  includesHeader: boolean
}

export interface EstimatedTemplatePagination {
  pageMaxHeightPx: number | null
  headerHeightPx: number
  pages: EstimatedTemplatePage[]
}

const MEASURED_TEMPLATE_PAGINATION_IDS = new Set<ReactiveTemplateId>([
  'template-1',
  'template-2',
  'template-3',
  'template-4',
  'template-5',
])

function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, '').trim()
}

function hasTextValue(value: unknown) {
  return String(value || '').trim().length > 0
}

export function hasRenderableStandardItem(sectionId: StandardSectionType, item: Record<string, unknown>) {
  if (item.hidden) return false

  switch (sectionId) {
    case 'profiles':
      return (
        hasTextValue(item.network) ||
        hasTextValue(item.username) ||
        hasTextValue((item.website as { url?: string; label?: string } | undefined)?.url) ||
        hasTextValue((item.website as { url?: string; label?: string } | undefined)?.label)
      )
    case 'experience':
      return (
        hasTextValue(item.company) ||
        hasTextValue(item.position) ||
        hasTextValue(item.location) ||
        hasTextValue(item.period) ||
        hasTextValue(stripHtml(String(item.description || '')))
      )
    case 'education':
      return (
        hasTextValue(item.school) ||
        hasTextValue(item.degree) ||
        hasTextValue(item.area) ||
        hasTextValue(item.grade) ||
        hasTextValue(item.location) ||
        hasTextValue(item.period) ||
        hasTextValue(stripHtml(String(item.description || '')))
      )
    case 'projects':
      return (
        hasTextValue(item.name) ||
        hasTextValue(item.period) ||
        hasTextValue((item.website as { url?: string; label?: string } | undefined)?.url) ||
        hasTextValue((item.website as { url?: string; label?: string } | undefined)?.label) ||
        hasTextValue(stripHtml(String(item.description || '')))
      )
    case 'skills':
      return isRenderableSkillItem(item)
    case 'languages':
      return hasTextValue(item.language) || hasTextValue(item.fluency) || Number(item.level || 0) > 0
    case 'interests':
      return hasTextValue(item.name) || (Array.isArray(item.keywords) && item.keywords.length > 0)
    case 'awards':
    case 'certifications':
    case 'publications':
      return hasTextValue(item.title) || hasTextValue(item.date) || hasTextValue(stripHtml(String(item.description || '')))
    case 'volunteer':
      return hasTextValue(item.organization) || hasTextValue(item.location) || hasTextValue(item.period) || hasTextValue(stripHtml(String(item.description || '')))
    case 'references':
      return hasTextValue(item.name) || hasTextValue(item.position) || hasTextValue(item.phone) || hasTextValue(stripHtml(String(item.description || '')))
    default:
      return false
  }
}

export function hasRenderableCustomItem(type: CustomSectionType, item: Record<string, unknown>) {
  if (item.hidden) return false
  if (type === 'summary' || type === 'cover-letter') {
    return hasTextValue(stripHtml(String(item.content || ''))) || hasTextValue(item.recipient)
  }
  return hasRenderableStandardItem(type as StandardSectionType, item)
}

export function supportsMeasuredTemplatePagination(templateId: ReactiveTemplateId) {
  return MEASURED_TEMPLATE_PAGINATION_IDS.has(templateId)
}

export function collectVisibleSectionIds(data: ResumeData, layoutSectionIds: string[]) {
  const canonical = ['summary', ...Object.keys(data.sections), ...data.customSections.map(section => section.id)]
  const known = new Set(canonical)
  const dedupedLayout = Array.from(new Set((layoutSectionIds || []).filter(id => known.has(id))))
  const sectionOrder =
    dedupedLayout.length > 0
      ? [...dedupedLayout, ...canonical.filter(sectionId => !dedupedLayout.includes(sectionId))]
      : canonical

  return sectionOrder.filter(sectionId => {
    if (sectionId === 'summary') {
      return !data.summary.hidden && stripHtml(data.summary.content).length > 0
    }

    if (sectionId in data.sections) {
      const standardId = sectionId as StandardSectionType
      const section = data.sections[standardId]
      return (
        !section.hidden &&
        (
          section.items.some(item => hasRenderableStandardItem(standardId, item as unknown as Record<string, unknown>)) ||
          stripHtml(section.intro || '').length > 0
        )
      )
    }

    const custom = data.customSections.find(item => item.id === sectionId)
    if (!custom || custom.hidden) return false
    return custom.items.some(item => hasRenderableCustomItem(custom.type, item as unknown as Record<string, unknown>))
  })
}

export { stripHtml }

const PT_TO_PX = 96 / 72
const MM_TO_PX = 96 / 25.4
const ASIDE_COLUMN_GAP_MULTIPLIER = 2.4
const TEMPLATE_PAGE_DIMENSIONS: Record<'a4' | 'letter' | 'free-form', { width: string; height: string }> = {
  a4: { width: '210mm', height: '297mm' },
  letter: { width: '216mm', height: '279mm' },
  'free-form': { width: '210mm', height: '297mm' },
}

function parseLengthToPx(value: string) {
  const trimmed = String(value || '').trim().toLowerCase()
  const numeric = Number.parseFloat(trimmed)
  if (!Number.isFinite(numeric)) return 0
  if (trimmed.endsWith('mm')) return numeric * MM_TO_PX
  if (trimmed.endsWith('pt')) return numeric * PT_TO_PX
  return numeric
}

export function resolveTemplateContentMetrics(data: ResumeData): TemplateContentMetrics {
  const dimensions = TEMPLATE_PAGE_DIMENSIONS[data.metadata.page.format] || TEMPLATE_PAGE_DIMENSIONS.a4
  const parsedWidthPx = parseLengthToPx(dimensions.width)
  const parsedHeightPx = parseLengthToPx(dimensions.height)
  const pageShortSidePx = Math.min(parsedWidthPx, parsedHeightPx)
  const pageLongSidePx = Math.max(parsedWidthPx, parsedHeightPx)

  const marginXPt = clampToRange(
    data.metadata.page.marginX,
    RESUME_EDITOR_LIMITS.page.marginX.min,
    RESUME_EDITOR_LIMITS.page.marginX.max,
  )
  const marginYPt = clampToRange(
    data.metadata.page.marginY,
    RESUME_EDITOR_LIMITS.page.marginY.min,
    RESUME_EDITOR_LIMITS.page.marginY.max,
  )
  const paddingX = marginXPt * PT_TO_PX
  const contentWidthPx = Math.max(1, pageShortSidePx - paddingX * 2)

  if (data.metadata.page.format === 'free-form') {
    return {
      contentWidthPx,
      contentMaxHeightPx: null,
    }
  }

  const paddingY = marginYPt * PT_TO_PX
  return {
    contentWidthPx,
    contentMaxHeightPx: Math.max(1, pageLongSidePx - paddingY * 2),
  }
}

function estimateComposedTemplateHeightByCurrentTemplate(input: EstimateCurrentTemplateHeightInput): ComposedHeightEstimate {
  const { layoutSpec, preset } = resolveComposedRuntimeContext(input.data)

  if (layoutSpec.layout === 'left-aside') {
    const sidebarWidthPercent = resolveTemplate5SidebarPercent(
      Number(input.data.metadata.layout.sidebarWidth || layoutSpec.sidebarPercent || 26),
    )
    const rightColumnRatio = 1 - sidebarWidthPercent / 100
    const gapXPt = clampToRange(
      input.data.metadata.page.gapX,
      RESUME_EDITOR_LIMITS.page.gapX.min,
      RESUME_EDITOR_LIMITS.page.gapX.max,
    )
    const columnGapPx = gapXPt * PT_TO_PX * ASIDE_COLUMN_GAP_MULTIPLIER
    const rightColumnWidthPx = Math.max(1, input.contentWidthPx * rightColumnRatio - columnGapPx)

    const estimate = estimateComposedHeight({
      ...input,
      contentWidthPx: rightColumnWidthPx,
      preset,
    })

    const sectionBlockHeights = estimate.blockHeights.filter(block => block.id !== 'hero')
    return {
      predictedHeightPx: sectionBlockHeights.reduce((sum, block) => sum + block.totalHeightPx, 0),
      blockHeights: sectionBlockHeights,
    }
  }

  return estimateComposedHeight({
    ...input,
    preset,
  })
}

export function estimateCurrentTemplateHeight(input: EstimateCurrentTemplateHeightInput): ComposedHeightEstimate {
  return estimateComposedTemplateHeightByCurrentTemplate(input)
}

function createEstimatedPage(pageIndex: number, pageMaxHeightPx: number | null, headerHeightPx = 0): EstimatedTemplatePage {
  const normalizedHeaderHeight = Math.max(0, headerHeightPx)
  return {
    pageIndex,
    sectionIds: [],
    predictedHeightPx: normalizedHeaderHeight,
    remainingHeightPx:
      Number.isFinite(pageMaxHeightPx) && pageMaxHeightPx !== null
        ? pageMaxHeightPx - normalizedHeaderHeight
        : null,
    includesHeader: normalizedHeaderHeight > 0,
  }
}

export function estimateCurrentTemplatePages(input: EstimateCurrentTemplateHeightInput): EstimatedTemplatePagination {
  const contentMetrics = resolveTemplateContentMetrics(input.data)
  const pageMaxHeightPx = contentMetrics.contentMaxHeightPx
  const { layoutSpec } = resolveComposedRuntimeContext(input.data)
  const composedEstimate = estimateCurrentTemplateHeight(input)

  if (!Number.isFinite(pageMaxHeightPx) || pageMaxHeightPx == null || pageMaxHeightPx <= 1) {
    return {
      pageMaxHeightPx,
      headerHeightPx: 0,
      pages: [
        {
          pageIndex: 0,
          sectionIds: [...input.sectionIds],
          predictedHeightPx: composedEstimate.predictedHeightPx,
          remainingHeightPx: null,
          includesHeader: false,
        },
      ],
    }
  }

  let headerHeightPx = 0
  let blockHeights = composedEstimate.blockHeights

  if (layoutSpec.layout !== 'left-aside') {
    const heroBlock = composedEstimate.blockHeights.find(block => block.id === 'hero')
    headerHeightPx = heroBlock?.totalHeightPx ?? 0
    blockHeights = composedEstimate.blockHeights.filter(block => block.id !== 'hero')
  }

  const pages: EstimatedTemplatePage[] = []
  let currentPage = createEstimatedPage(0, pageMaxHeightPx, headerHeightPx)

  blockHeights.forEach(block => {
    const remainingHeightPx = currentPage.remainingHeightPx
    const shouldMoveToNextPage =
      remainingHeightPx !== null &&
      block.totalHeightPx > remainingHeightPx + 0.5 &&
      (currentPage.sectionIds.length > 0 || currentPage.includesHeader)

    if (shouldMoveToNextPage) {
      pages.push(currentPage)
      currentPage = createEstimatedPage(pages.length, pageMaxHeightPx, 0)
    }

    currentPage.sectionIds.push(block.sectionId)
    currentPage.predictedHeightPx += block.totalHeightPx
    if (currentPage.remainingHeightPx !== null) {
      currentPage.remainingHeightPx -= block.totalHeightPx
    }
  })

  if (currentPage.sectionIds.length > 0 || currentPage.includesHeader || pages.length === 0) {
    pages.push(currentPage)
  }

  return {
    pageMaxHeightPx,
    headerHeightPx,
    pages,
  }
}
