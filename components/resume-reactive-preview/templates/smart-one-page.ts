import { normalizeNumericValue } from '@/lib/resume/editor-limits'
import {
  SMART_ONE_PAGE_BODY_FONT_SIZE_LIMIT,
  SMART_ONE_PAGE_BODY_LINE_HEIGHT_LIMIT,
  SMART_ONE_PAGE_GAP_X_LIMIT,
  SMART_ONE_PAGE_GAP_Y_LIMIT,
  SYSTEM_PAGE_GAP_X_PT,
  SYSTEM_PAGE_GAP_Y_PT,
} from '@/lib/resume/page-layout'
import type { ReactiveTemplateId, ResumeData } from '@/lib/resume/types'
import {
  collectVisibleSectionIds,
  estimateCurrentTemplateHeight,
  resolveTemplateContentMetrics,
} from './estimate-current-template-height'

const SMART_ONE_PAGE_TOLERANCE_PX = 1
const SMART_ONE_PAGE_SUPPORTED_TEMPLATES = new Set<ReactiveTemplateId>([
  'template-1',
  'template-2',
  'template-3',
  'template-4',
  'template-5',
])

export interface SmartOnePageEstimateResult {
  predictedHeightPx: number
  availableContentHeightPx: number
  overflowPx: number
}

interface SmartOnePageRunResult {
  status: 'already-fit' | 'fitted' | 'improved' | 'unchanged'
  before: SmartOnePageEstimateResult
  after: SmartOnePageEstimateResult
  nextData: ResumeData
}

export interface SmartOnePageComputation {
  enabled: boolean
  active: boolean
  status: 'disabled' | 'inactive' | SmartOnePageRunResult['status']
  reason?: 'free-form' | 'unsupported-template'
  managedData: ResumeData
  effectiveData: ResumeData
  before: SmartOnePageEstimateResult | null
  after: SmartOnePageEstimateResult | null
}

function collectRuntimeSectionIdsForEstimate(data: ResumeData) {
  const layoutSectionIds = data.metadata.layout.pages.flatMap(page => [...(page.main || []), ...(page.sidebar || [])].filter(Boolean))
  return collectVisibleSectionIds(data, layoutSectionIds)
}

function estimateTemplateHeightForData(data: ResumeData) {
  if (!SMART_ONE_PAGE_SUPPORTED_TEMPLATES.has(data.metadata.template)) return null

  const contentMetrics = resolveTemplateContentMetrics(data)
  if (!Number.isFinite(contentMetrics.contentMaxHeightPx)) return null

  const sectionIds = collectRuntimeSectionIdsForEstimate(data)
  const estimated = estimateCurrentTemplateHeight({
    data,
    sectionIds,
    contentWidthPx: contentMetrics.contentWidthPx,
  })

  return {
    predictedHeightPx: estimated.predictedHeightPx,
    availableContentHeightPx: contentMetrics.contentMaxHeightPx as number,
    overflowPx: estimated.predictedHeightPx - (contentMetrics.contentMaxHeightPx as number),
  }
}

function createManagedPageData(data: ResumeData) {
  const next = structuredClone(data)
  next.metadata.page.gapX = SYSTEM_PAGE_GAP_X_PT
  next.metadata.page.gapY = SYSTEM_PAGE_GAP_Y_PT
  return next
}

function isNonOverflowEstimate(estimate: SmartOnePageEstimateResult) {
  return estimate.overflowPx <= 0
}

function compareSmartOnePageEstimates(
  left: SmartOnePageEstimateResult,
  right: SmartOnePageEstimateResult,
) {
  const leftFits = isNonOverflowEstimate(left)
  const rightFits = isNonOverflowEstimate(right)

  if (leftFits !== rightFits) {
    return leftFits ? 1 : -1
  }

  if (leftFits && rightFits) {
    if (left.overflowPx > right.overflowPx) return 1
    if (left.overflowPx < right.overflowPx) return -1
    if (left.predictedHeightPx > right.predictedHeightPx) return 1
    if (left.predictedHeightPx < right.predictedHeightPx) return -1
    return 0
  }

  if (left.overflowPx < right.overflowPx) return 1
  if (left.overflowPx > right.overflowPx) return -1
  if (left.predictedHeightPx < right.predictedHeightPx) return 1
  if (left.predictedHeightPx > right.predictedHeightPx) return -1
  return 0
}

function normalizeSmartOnePageBaseData(data: ResumeData) {
  const next = createManagedPageData(data)
  next.metadata.typography.body.fontSize = normalizeNumericValue(next.metadata.typography.body.fontSize, SMART_ONE_PAGE_BODY_FONT_SIZE_LIMIT)
  next.metadata.typography.body.lineHeight = normalizeNumericValue(next.metadata.typography.body.lineHeight, SMART_ONE_PAGE_BODY_LINE_HEIGHT_LIMIT)
  next.metadata.page.gapX = normalizeNumericValue(next.metadata.page.gapX, SMART_ONE_PAGE_GAP_X_LIMIT)
  next.metadata.page.gapY = normalizeNumericValue(next.metadata.page.gapY, SMART_ONE_PAGE_GAP_Y_LIMIT)
  return next
}

function hasSmartOnePageDiff(left: ResumeData, right: ResumeData) {
  return (
    Math.abs(left.metadata.typography.body.fontSize - right.metadata.typography.body.fontSize) > 0.0001 ||
    Math.abs(left.metadata.typography.body.lineHeight - right.metadata.typography.body.lineHeight) > 0.0001 ||
    Math.abs(left.metadata.page.gapX - right.metadata.page.gapX) > 0.0001 ||
    Math.abs(left.metadata.page.gapY - right.metadata.page.gapY) > 0.0001
  )
}

function createSmartOnePageCandidate(
  data: ResumeData,
  strengths: {
    gapX?: number
    gapY?: number
    lineHeight?: number
    fontSize?: number
    mode: 'compress' | 'expand'
  },
) {
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value))
  const lerpToTarget = (current: number, target: number, strength: number) => current + (target - current) * clamp01(strength)
  const gapXStrength = clamp01(strengths.gapX || 0)
  const gapYStrength = clamp01(strengths.gapY || 0)
  const lineHeightStrength = clamp01(strengths.lineHeight || 0)
  const fontSizeStrength = clamp01(strengths.fontSize || 0)

  const next = structuredClone(data)
  const bodyLineHeightTarget =
    strengths.mode === 'compress' ? SMART_ONE_PAGE_BODY_LINE_HEIGHT_LIMIT.min : SMART_ONE_PAGE_BODY_LINE_HEIGHT_LIMIT.max
  const bodyFontSizeTarget =
    strengths.mode === 'compress' ? SMART_ONE_PAGE_BODY_FONT_SIZE_LIMIT.min : SMART_ONE_PAGE_BODY_FONT_SIZE_LIMIT.max
  const gapXTarget = strengths.mode === 'compress' ? SMART_ONE_PAGE_GAP_X_LIMIT.min : SMART_ONE_PAGE_GAP_X_LIMIT.max
  const gapYTarget = strengths.mode === 'compress' ? SMART_ONE_PAGE_GAP_Y_LIMIT.min : SMART_ONE_PAGE_GAP_Y_LIMIT.max

  next.metadata.typography.body.lineHeight = normalizeNumericValue(
    lerpToTarget(next.metadata.typography.body.lineHeight, bodyLineHeightTarget, lineHeightStrength),
    SMART_ONE_PAGE_BODY_LINE_HEIGHT_LIMIT,
  )
  next.metadata.typography.body.fontSize = normalizeNumericValue(
    lerpToTarget(next.metadata.typography.body.fontSize, bodyFontSizeTarget, fontSizeStrength),
    SMART_ONE_PAGE_BODY_FONT_SIZE_LIMIT,
  )
  next.metadata.page.gapX = normalizeNumericValue(
    lerpToTarget(next.metadata.page.gapX, gapXTarget, gapXStrength),
    SMART_ONE_PAGE_GAP_X_LIMIT,
  )
  next.metadata.page.gapY = normalizeNumericValue(
    lerpToTarget(next.metadata.page.gapY, gapYTarget, gapYStrength),
    SMART_ONE_PAGE_GAP_Y_LIMIT,
  )

  return next
}

function findSmartOnePageResult(data: ResumeData): SmartOnePageRunResult | null {
  const before = estimateTemplateHeightForData(data)
  if (!before) return null

  const constrainedBase = normalizeSmartOnePageBaseData(data)
  const constrainedBaseEstimate = estimateTemplateHeightForData(constrainedBase)
  if (!constrainedBaseEstimate) return null
  const baseDiffFromOriginal = hasSmartOnePageDiff(data, constrainedBase)

  if (isNonOverflowEstimate(before) && !baseDiffFromOriginal) {
    return {
      status: 'already-fit',
      before,
      after: before,
      nextData: data,
    }
  }

  const spacingSteps = [0.12, 0.22, 0.34, 0.46, 0.58, 0.7, 0.84, 1]
  const lineHeightSteps = [0.1, 0.18, 0.26, 0.34, 0.44, 0.56, 0.68, 0.8, 0.9, 1]
  const fontSteps = [0.08, 0.16, 0.24, 0.34, 0.46, 0.58, 0.7, 0.82, 0.92, 1]
  const mode: 'compress' | 'expand' = constrainedBaseEstimate.overflowPx > 0 ? 'compress' : 'expand'

  let bestData = constrainedBase
  let bestEstimate = constrainedBaseEstimate
  let currentData = constrainedBase
  let currentEstimate = constrainedBaseEstimate

  const evaluateCandidate = (candidate: ResumeData) => {
    const estimate = estimateTemplateHeightForData(candidate)
    if (!estimate) return null
    if (compareSmartOnePageEstimates(estimate, bestEstimate) > 0) {
      bestData = candidate
      bestEstimate = estimate
    }
    return estimate
  }

  const runPass = (candidates: ResumeData[]) => {
    let passBestData = currentData
    let passBestEstimate = currentEstimate

    for (const candidate of candidates) {
      const estimate = evaluateCandidate(candidate)
      if (!estimate) continue
      if (compareSmartOnePageEstimates(estimate, passBestEstimate) > 0) {
        passBestData = candidate
        passBestEstimate = estimate
      }
    }

    currentData = passBestData
    currentEstimate = passBestEstimate
  }

  const passFactories: Array<() => ResumeData[]> = [
    () =>
      spacingSteps.map(step =>
        createSmartOnePageCandidate(currentData, {
          gapY: step,
          gapX: Math.min(1, step * 0.72),
          mode,
        }),
      ),
    () =>
      lineHeightSteps.map(step =>
        createSmartOnePageCandidate(currentData, {
          lineHeight: step,
          mode,
        }),
      ),
    () =>
      fontSteps.map(step =>
        createSmartOnePageCandidate(currentData, {
          fontSize: step,
          mode,
        }),
      ),
    () =>
      spacingSteps.map((spacingStep, index) =>
        createSmartOnePageCandidate(currentData, {
          gapY: spacingStep,
          gapX: Math.min(1, spacingStep * 0.72),
          lineHeight: lineHeightSteps[Math.min(index, lineHeightSteps.length - 1)],
          mode,
        }),
      ),
    () =>
      fontSteps.map((fontStep, index) =>
        createSmartOnePageCandidate(currentData, {
          gapY: spacingSteps[Math.min(index, spacingSteps.length - 1)],
          gapX: Math.min(1, spacingSteps[Math.min(index, spacingSteps.length - 1)] * 0.72),
          lineHeight: lineHeightSteps[Math.min(index, lineHeightSteps.length - 1)],
          fontSize: fontStep,
          mode,
        }),
      ),
  ]

  for (const buildCandidates of passFactories) {
    runPass(buildCandidates())
  }

  const changedFromOriginal = hasSmartOnePageDiff(data, bestData)

  if (isNonOverflowEstimate(bestEstimate) && changedFromOriginal) {
    return {
      status: 'fitted',
      before,
      after: bestEstimate,
      nextData: bestData,
    }
  }

  if (changedFromOriginal) {
    return {
      status: 'improved',
      before,
      after: bestEstimate,
      nextData: bestData,
    }
  }

  return {
    status: 'unchanged',
    before,
    after: before,
    nextData: data,
  }
}

export function resolveSmartOnePageComputation(data: ResumeData): SmartOnePageComputation {
  const managedData = createManagedPageData(data)
  const enabled = Boolean(data.metadata.page.smartOnePageEnabled)

  if (!enabled) {
    return {
      enabled: false,
      active: false,
      status: 'disabled',
      managedData,
      effectiveData: managedData,
      before: null,
      after: null,
    }
  }

  if (managedData.metadata.page.format === 'free-form') {
    return {
      enabled: true,
      active: false,
      status: 'inactive',
      reason: 'free-form',
      managedData,
      effectiveData: managedData,
      before: null,
      after: null,
    }
  }

  if (!SMART_ONE_PAGE_SUPPORTED_TEMPLATES.has(managedData.metadata.template)) {
    return {
      enabled: true,
      active: false,
      status: 'inactive',
      reason: 'unsupported-template',
      managedData,
      effectiveData: managedData,
      before: null,
      after: null,
    }
  }

  const result = findSmartOnePageResult(managedData)
  if (!result) {
    return {
      enabled: true,
      active: false,
      status: 'inactive',
      reason: 'unsupported-template',
      managedData,
      effectiveData: managedData,
      before: null,
      after: null,
    }
  }

  return {
    enabled: true,
    active: true,
    status: result.status,
    managedData,
    effectiveData: result.nextData,
    before: result.before,
    after: result.after,
  }
}
