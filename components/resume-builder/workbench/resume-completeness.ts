import type { ResumeData, StandardSectionType } from '@/lib/resume/types'
import { getNestedValue, SECTION_FIELD_CONFIG } from '../editor/section-editor-shared'
import { hasRenderableCustomItem, hasRenderableStandardItem, stripHtml } from '@/components/resume-reactive-preview/templates/estimate-current-template-height'

export type ResumeCompletenessTone = 'low' | 'medium' | 'high'

export interface ResumeCompletenessResult {
  score: number
  label: string
  tone: ResumeCompletenessTone
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function topAverage(values: number[], count: number) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => right - left)
  return average(sorted.slice(0, count))
}

function toPlainText(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return stripHtml(String(value || ''))
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasText(value: unknown) {
  return toPlainText(value).length > 0
}

function hasKeywordList(value: unknown) {
  return Array.isArray(value) && value.some(item => hasText(item))
}

function isFilledField(
  value: unknown,
  type?: 'text' | 'number' | 'rich' | 'keywords',
) {
  if (type === 'keywords') {
    return hasKeywordList(value)
  }

  if (type === 'number') {
    return Number(value || 0) > 0
  }

  return hasText(value)
}

function computeStandardItemCompleteness(sectionType: StandardSectionType, item: Record<string, unknown>) {
  const fields = SECTION_FIELD_CONFIG[sectionType]
  if (!Array.isArray(fields) || fields.length === 0) return 0

  const filledCount = fields.reduce((count, field) => {
    return count + (isFilledField(getNestedValue(item, field.key), field.type) ? 1 : 0)
  }, 0)

  return clamp01(filledCount / fields.length)
}

function collectVisibleItemsByType(data: ResumeData, sectionType: StandardSectionType) {
  const visibleItems: Array<Record<string, unknown>> = []
  const standardSection = data.sections[sectionType]

  if (!standardSection.hidden) {
    standardSection.items.forEach(item => {
      const record = item as unknown as Record<string, unknown>
      if (hasRenderableStandardItem(sectionType, record)) {
        visibleItems.push(record)
      }
    })
  }

  data.customSections.forEach(section => {
    if (section.hidden || section.type !== sectionType) return

    section.items.forEach(item => {
      const record = item as unknown as Record<string, unknown>
      if (hasRenderableCustomItem(section.type, record)) {
        visibleItems.push(record)
      }
    })
  })

  return visibleItems
}

function computeBasicsScore(data: ResumeData) {
  const basics = data.basics
  const checks: Array<[boolean, number]> = [
    [hasText(basics.name), 6],
    [hasText(basics.headline), 5],
    [hasText(basics.phone), 4],
    [hasText(basics.email), 4],
    [hasText(basics.location), 3],
    [hasText(basics.intentionPosition), 4],
    [hasText(basics.intentionCity), 2],
    [hasText(basics.workYears), 1],
    [
      hasText(basics.website.url) ||
      hasText(basics.website.label) ||
      basics.customFields.some(field => hasText(field.text) || hasText(field.link)),
      1,
    ],
  ]

  return checks.reduce((sum, [filled, weight]) => sum + (filled ? weight : 0), 0)
}

function computeSummaryBucket(data: ResumeData) {
  const summaryTexts: string[] = []

  if (!data.summary.hidden && hasText(data.summary.content)) {
    summaryTexts.push(toPlainText(data.summary.content))
  }

  data.customSections.forEach(section => {
    if (section.hidden || section.type !== 'summary') return

    section.items.forEach(item => {
      const record = item as unknown as Record<string, unknown>
      if (!hasRenderableCustomItem('summary', record)) return
      const content = toPlainText(record.content)
      if (content) {
        summaryTexts.push(content)
      }
    })
  })

  const available = !data.summary.hidden || summaryTexts.length > 0 ? 10 : 0
  const contentLength = summaryTexts.reduce((sum, text) => sum + text.length, 0)
  return {
    available,
    earned: available > 0 ? 10 * clamp01(contentLength / 120) : 0,
  }
}

function hasVisibleSectionGroup(data: ResumeData, sectionTypes: StandardSectionType[]) {
  return sectionTypes.some(sectionType => {
    if (!data.sections[sectionType].hidden) {
      return true
    }

    return data.customSections.some(section => !section.hidden && section.type === sectionType)
  })
}

function computePracticeBucket(data: ResumeData) {
  const practiceSections: StandardSectionType[] = ['experience', 'projects', 'volunteer']
  const itemScores = practiceSections.flatMap(sectionType => {
    return collectVisibleItemsByType(data, sectionType).map(item => computeStandardItemCompleteness(sectionType, item))
  })

  const quantityFactor =
    itemScores.length === 0
      ? 0
      : itemScores.length === 1
        ? 0.65
        : itemScores.length === 2
          ? 0.85
          : 1

  return {
    available: hasVisibleSectionGroup(data, practiceSections) ? 28 : 0,
    earned: 28 * topAverage(itemScores, 3) * quantityFactor,
  }
}

function computeEducationBucket(data: ResumeData) {
  const itemScores = collectVisibleItemsByType(data, 'education').map(item => computeStandardItemCompleteness('education', item))
  return {
    available: hasVisibleSectionGroup(data, ['education']) ? 16 : 0,
    earned: 16 * topAverage(itemScores, 2),
  }
}

function computeSkillSignalCount(skillItems: Array<Record<string, unknown>>, languageItems: Array<Record<string, unknown>>) {
  const skillSignals = skillItems.reduce((sum, item) => {
    const keywordCount = Array.isArray(item.keywords) ? item.keywords.filter(keyword => hasText(keyword)).length : 0
    return sum + Math.max(1, keywordCount)
  }, 0)

  return skillSignals + languageItems.length
}

function computeSkillsBucket(data: ResumeData) {
  const skillItems = collectVisibleItemsByType(data, 'skills')
  const languageItems = collectVisibleItemsByType(data, 'languages')
  const skillScores = skillItems.map(item => computeStandardItemCompleteness('skills', item))
  const languageScores = languageItems.map(item => computeStandardItemCompleteness('languages', item))
  const depthFactor = clamp01(computeSkillSignalCount(skillItems, languageItems) / 3)
  return {
    available: hasVisibleSectionGroup(data, ['skills', 'languages']) ? 16 : 0,
    earned: 16 * topAverage([...skillScores, ...languageScores], 4) * depthFactor,
  }
}

export function computeResumeCompleteness(data: ResumeData): ResumeCompletenessResult {
  const summaryBucket = computeSummaryBucket(data)
  const practiceBucket = computePracticeBucket(data)
  const educationBucket = computeEducationBucket(data)
  const skillsBucket = computeSkillsBucket(data)

  const earned =
    computeBasicsScore(data) +
    summaryBucket.earned +
    practiceBucket.earned +
    educationBucket.earned +
    skillsBucket.earned

  const available = 30 + summaryBucket.available + practiceBucket.available + educationBucket.available + skillsBucket.available
  const score = available > 0 ? Math.round((earned / available) * 100) : 0

  if (score >= 85) {
    return { score, label: '内容完整', tone: 'high' }
  }

  if (score >= 60) {
    return { score, label: '较完整', tone: 'medium' }
  }

  return { score, label: '待完善', tone: 'low' }
}
