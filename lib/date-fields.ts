export const MIN_TIME_YEAR = 1980
export const MAX_TIME_YEAR = new Date().getFullYear() + 3
export const MONTH_OPTIONS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const

export function isYearMonthValue(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function yearMonthToYear(value: string) {
  if (!isYearMonthValue(value)) return null
  return Number(value.slice(0, 4))
}

function yearMonthToDate(value: string) {
  if (!isYearMonthValue(value)) return null
  const [yearPart, monthPart] = value.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  return new Date(year, month - 1, 1)
}

export function dateToYearMonth(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
}

export function splitPeriodValue(value: string) {
  const normalized = value.trim()
  if (!normalized) {
    return { start: '', end: '' }
  }

  if (normalized === '至今') {
    return { start: '', end: '至今' }
  }

  if (isYearMonthValue(normalized)) {
    return { start: normalized, end: '' }
  }

  const rangeMatch = normalized.match(
    /^(\d{4}-(?:0[1-9]|1[0-2]))\s*(?:-|–|—|~|～|至|到)\s*(\d{4}-(?:0[1-9]|1[0-2])|至今)$/i,
  )
  if (rangeMatch) {
    return { start: rangeMatch[1], end: rangeMatch[2] }
  }

  const humanParts = normalized.split(/\s+(?:-|–|—|~|～|至|到)\s+/).filter(Boolean)
  if (humanParts.length >= 2) {
    return { start: humanParts[0], end: humanParts[1] }
  }

  return { start: normalized, end: '' }
}

export function joinPeriodValue(start: string, end: string) {
  const normalizedStart = start.trim()
  const normalizedEnd = end.trim()

  if (normalizedStart && normalizedEnd) {
    return `${normalizedStart} - ${normalizedEnd}`
  }

  if (normalizedStart) {
    return normalizedStart
  }

  return normalizedEnd
}
