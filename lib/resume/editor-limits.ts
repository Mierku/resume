import {
  SMART_ONE_PAGE_GAP_X_LIMIT,
  SMART_ONE_PAGE_GAP_Y_LIMIT,
} from './page-layout'

export interface NumericLimitConfig {
  min: number
  max: number
  step: number
  defaultValue: number
  presets: readonly number[]
}

export const RESUME_EDITOR_LIMITS = {
  typography: {
    bodyFontSize: {
      min: 10,
      max: 18,
      step: 0.1,
      defaultValue: 10,
      presets: [10, 11, 12, 13, 14, 15, 16, 18] as const,
    },
    headingFontSize: {
      min: 10,
      max: 20,
      step: 0.1,
      defaultValue: 14,
      presets: [10, 12, 14, 16, 18, 20] as const,
    },
    bodyLineHeight: {
      min: 1.1,
      max: 2.4,
      step: 0.05,
      defaultValue: 1.5,
      presets: [1.1, 1.2, 1.35, 1.5, 1.65, 1.8, 2] as const,
    },
    headingLineHeight: {
      min: 1.1,
      max: 2.6,
      step: 0.05,
      defaultValue: 1.5,
      presets: [1.1, 1.25, 1.4, 1.5, 1.65, 1.8, 2] as const,
    },
  },
  page: {
    marginX: {
      min: 6,
      max: 28,
      step: 0.5,
      defaultValue: 14,
      presets: [8, 10, 12, 14, 16, 18, 20] as const,
    },
    marginY: {
      min: 6,
      max: 28,
      step: 0.5,
      defaultValue: 12,
      presets: [8, 10, 12, 14, 16, 18, 20] as const,
    },
    gapX: {
      ...SMART_ONE_PAGE_GAP_X_LIMIT,
    },
    gapY: {
      ...SMART_ONE_PAGE_GAP_Y_LIMIT,
    },
  },
} as const

function getPrecision(step: number) {
  if (!Number.isFinite(step)) return 0
  const normalized = step.toString()
  const dotIndex = normalized.indexOf('.')
  return dotIndex >= 0 ? normalized.length - dotIndex - 1 : 0
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(value)) return 0
  if (!Number.isFinite(step) || step <= 0) return value
  const precision = getPrecision(step)
  return Number((Math.round(value / step) * step).toFixed(precision))
}

export function clampToRange(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

export function normalizeNumericValue(value: number, config: NumericLimitConfig) {
  return roundToStep(clampToRange(value, config.min, config.max), config.step)
}

export function parseNumericInput(rawValue: string, config: NumericLimitConfig, fallback: number) {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) {
    return normalizeNumericValue(fallback, config)
  }
  return normalizeNumericValue(parsed, config)
}

export function formatNumericValue(value: number, step: number) {
  const precision = getPrecision(step)
  if (precision === 0) {
    return String(Math.round(value))
  }

  return value.toFixed(precision).replace(/(?:\.0+|(\.\d+?)0+)$/, '$1')
}
