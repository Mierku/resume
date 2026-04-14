import {
  layout,
  layoutNextLine,
  prepare,
  prepareWithSegments,
  type PreparedText,
  type PreparedTextWithSegments,
} from '@chenglou/pretext'
import { isRenderableSkillItem, resolveSkillsVariant } from '@/lib/resume/skills'
import { resolveResumeFontFamilyStack } from '@/lib/resume/fonts'
import type { ResumeData, StandardSectionType } from '@/lib/resume/types'
import { estimateSkills1Height } from './skills/skills-1'
import { estimateSkills2Height } from './skills/skills-2'
import { estimateSkills3Height } from './skills/skills-3'
import { estimateSkills4Height } from './skills/skills-4'

export interface ComposedBlockStyle {
  marginBottom: number
  paddingX: number
  paddingY: number
  paddingTop?: number
  paddingBottom?: number
  sectionHeaderPaddingX: number
  sectionHeaderPaddingY: number
  inlineGap: number
  sectionHeaderGap: number
  borderWidth: number
  borderColor: string
  borderRadius: number
  backgroundColor: string
  boxShadow: string
  titleColor: string
  bodyColor: string
  titleFontSize: number
  titleLineHeight: number
  bodyFontSize: number
  bodyLineHeight: number
  paragraphGap: number
}

export interface ComposedHeroStyle extends ComposedBlockStyle {
  nameFontSize: number
  nameLineHeight: number
  headlineFontSize: number
  headlineLineHeight: number
  metaFontSize: number
  metaLineHeight: number
  metaGap: number
}

export interface ComposedPreset {
  hero: ComposedHeroStyle
  section: ComposedBlockStyle
}

export interface ComposedMetaLine {
  text: string
  fieldKey: string
}

export interface ComposedTextRow {
  kind: 'text'
  text: string
  fieldKey?: string
  itemId?: string
}

export interface ComposedTripletRow {
  kind: 'triplet'
  layout: 'single' | 'pair' | 'triplet'
  left: string
  center?: string
  right?: string
  itemId?: string
  fieldKeys?: {
    left?: string
    center?: string
    right?: string
  }
}

export type ComposedRow = ComposedTextRow | ComposedTripletRow

interface ComposedRowGroup {
  key: string
  itemId?: string
  rows: ComposedRow[]
  startRowIndex: number
  endRowIndex: number
}

function resolveIntraItemRowGap(paragraphGap: number) {
  return Math.max(2, Math.round(paragraphGap * 0.55))
}

export function resolveComposedRowGap(
  previousRow: ComposedRow | null,
  currentRow: ComposedRow,
  paragraphGap: number,
) {
  if (!previousRow) return paragraphGap
  const previousItemId = String(previousRow.itemId || '').trim()
  const currentItemId = String(currentRow.itemId || '').trim()
  if (previousItemId && currentItemId && previousItemId === currentItemId) {
    return resolveIntraItemRowGap(paragraphGap)
  }
  return paragraphGap
}

function buildComposedRowGroups(rows: ComposedRow[]): ComposedRowGroup[] {
  const groups: ComposedRowGroup[] = []

  rows.forEach((row, rowIndex) => {
    const itemId = String(row.itemId || '').trim()

    if (itemId) {
      const lastGroup = groups[groups.length - 1]
      if (lastGroup?.itemId === itemId) {
        lastGroup.rows.push(row)
        lastGroup.endRowIndex = rowIndex + 1
        return
      }

      groups.push({
        key: `${itemId}-${rowIndex}`,
        itemId,
        rows: [row],
        startRowIndex: rowIndex,
        endRowIndex: rowIndex + 1,
      })
      return
    }

    groups.push({
      key: `row-${rowIndex}`,
      rows: [row],
      startRowIndex: rowIndex,
      endRowIndex: rowIndex + 1,
    })
  })

  return groups
}

interface ComposedHeaderCell {
  text: string
  fieldKey?: string
}

export interface ComposedHeroBlock {
  kind: 'hero'
  id: 'hero'
  sectionId: 'basics'
  style: ComposedHeroStyle
  name: string
  headline: string
  headlineFieldKey: string
  meta: ComposedMetaLine[]
}

export interface ComposedSectionBlock {
  kind: 'section'
  id: string
  sectionId: string
  title: string
  style: ComposedBlockStyle
  rows: ComposedRow[]
}

type ComposedBlock = ComposedHeroBlock | ComposedSectionBlock

interface ComposedEstimateInput {
  data: ResumeData
  sectionIds: string[]
  contentWidthPx: number
  preset?: ComposedPreset
}

export interface ComposedBlockHeightDebug {
  id: string
  sectionId: string
  textHeightPx: number
  paddingPx: number
  borderPx: number
  marginPx: number
  contentHeightPx: number
  totalHeightPx: number
  marginBottomPx: number
}

export interface ComposedHeightEstimate {
  predictedHeightPx: number
  blockHeights: ComposedBlockHeightDebug[]
}

const STANDARD_SECTION_TITLE_MAP: Record<StandardSectionType, string> = {
  profiles: '社交资料',
  experience: '工作经历',
  education: '教育经历',
  projects: '项目经历',
  skills: '技能专长',
  languages: '语言能力',
  interests: '兴趣爱好',
  awards: '奖项荣誉',
  certifications: '证书',
  publications: '出版成果',
  volunteer: '志愿经历',
  references: '推荐人',
}

export const DEFAULT_COMPOSED_PRESET: ComposedPreset = {
  hero: {
    marginBottom: 18,
    paddingX: 24,
    paddingY: 20,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 0,
    inlineGap: 8,
    sectionHeaderGap: 0,
    borderWidth: 1,
    borderColor: '#ca5b2f',
    borderRadius: 14,
    backgroundColor: 'linear-gradient(135deg, #fff5ee 0%, #fffdf8 100%)',
    boxShadow: '0 8px 18px rgba(138, 72, 42, 0.08)',
    titleColor: '#7d3317',
    bodyColor: '#4f382e',
    titleFontSize: 14,
    titleLineHeight: 1.4,
    bodyFontSize: 12,
    bodyLineHeight: 1.58,
    paragraphGap: 8,
    nameFontSize: 36,
    nameLineHeight: 1.06,
    headlineFontSize: 16,
    headlineLineHeight: 1.3,
    metaFontSize: 12,
    metaLineHeight: 1.38,
    metaGap: 10,
  },
  section: {
    marginBottom: 14,
    paddingX: 20,
    paddingY: 16,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 0,
    inlineGap: 8,
    sectionHeaderGap: 4,
    borderWidth: 1,
    borderColor: '#dfc9bc',
    borderRadius: 12,
    backgroundColor: '#fffefd',
    boxShadow: '0 5px 12px rgba(24, 12, 8, 0.04)',
    titleColor: '#8d3e20',
    bodyColor: '#34302e',
    titleFontSize: 14,
    titleLineHeight: 1.35,
    bodyFontSize: 12,
    bodyLineHeight: 1.56,
    paragraphGap: 8,
  },
}

const preparedCache = new Map<string, PreparedText>()
const preparedSegmentsCache = new Map<string, PreparedTextWithSegments>()
const HERO_CONTENT_MIN_HEIGHT_PX = 124

function hasMeaningfulText(value: unknown) {
  return String(value || '').trim().length > 0
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function htmlToPlainText(input: string) {
  const normalized = input
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|blockquote)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '• ')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  return decodeEntities(normalized)
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
}

function normalizeParagraphs(text: string) {
  return text
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function toText(value: unknown) {
  return String(value || '').trim()
}

function buildFontString(fontFamily: string, fontSize: number, fontWeight: number) {
  const safeFamily = fontFamily.includes(',') ? fontFamily : `"${fontFamily}"`
  return `${fontWeight} ${fontSize}px ${safeFamily}`
}

function measureTextHeight({
  text,
  widthPx,
  lineHeightPx,
  fontFamily,
  fontSizePx,
  fontWeight,
}: {
  text: string
  widthPx: number
  lineHeightPx: number
  fontFamily: string
  fontSizePx: number
  fontWeight: number
}) {
  if (!hasMeaningfulText(text)) return 0
  if (!Number.isFinite(widthPx) || widthPx <= 1) return lineHeightPx

  const normalized = text.replace(/\s+/g, ' ').trim()
  const font = buildFontString(fontFamily, fontSizePx, fontWeight)
  const cacheKey = `${font}::${normalized}`
  let prepared = preparedCache.get(cacheKey)
  if (!prepared) {
    prepared = prepare(normalized, font)
    preparedCache.set(cacheKey, prepared)
  }

  return layout(prepared, widthPx, lineHeightPx).height
}

function measureSingleLineWidth({
  text,
  fontFamily,
  fontSizePx,
  fontWeight,
}: {
  text: string
  fontFamily: string
  fontSizePx: number
  fontWeight: number
}) {
  if (!hasMeaningfulText(text)) return 0

  const normalized = text.replace(/\s+/g, ' ').trim()
  const font = buildFontString(fontFamily, fontSizePx, fontWeight)
  const cacheKey = `${font}::${normalized}`
  let prepared = preparedSegmentsCache.get(cacheKey)
  if (!prepared) {
    prepared = prepareWithSegments(normalized, font)
    preparedSegmentsCache.set(cacheKey, prepared)
  }

  const line = layoutNextLine(prepared, { segmentIndex: 0, graphemeIndex: 0 }, Number.MAX_SAFE_INTEGER)
  return line?.width || 0
}

function resolveTripletRightWidth({
  contentWidth,
  leftWidth,
  centerWidth,
  inlineGap,
  layout,
}: {
  contentWidth: number
  leftWidth: number
  centerWidth: number
  inlineGap: number
  layout: ComposedTripletRow['layout']
}) {
  if (layout === 'single') return 0
  if (layout === 'pair') {
    return Math.max(1, contentWidth - leftWidth - inlineGap)
  }
  if (layout === 'triplet') {
    return Math.max(1, (contentWidth - centerWidth - inlineGap * 2) / 2)
  }
  return Math.max(1, contentWidth)
}

function joinParts(parts: unknown[], separator = ' · ') {
  return parts.map(toText).filter(Boolean).join(separator)
}

function createTextRow(text: string, itemId?: string, fieldKey?: string): ComposedTextRow | null {
  return hasMeaningfulText(text)
    ? {
        kind: 'text',
        text,
        itemId,
        fieldKey,
      }
    : null
}

function createTripletRow({
  left,
  center,
  right,
  itemId,
  fieldKeys,
}: {
  left: string
  center?: string
  right?: string
  itemId?: string
  fieldKeys?: ComposedTripletRow['fieldKeys']
}): ComposedTripletRow | null {
  if (!hasMeaningfulText(left) && !hasMeaningfulText(center) && !hasMeaningfulText(right)) return null

  return {
    kind: 'triplet',
    layout: hasMeaningfulText(center) && hasMeaningfulText(right) ? 'triplet' : hasMeaningfulText(right) ? 'pair' : 'single',
    left: toText(left),
    center: toText(center),
    right: toText(right),
    itemId,
    fieldKeys,
  }
}

function createHeaderCells(cells: Array<ComposedHeaderCell | null | undefined>) {
  return cells.filter((cell): cell is ComposedHeaderCell => Boolean(cell && hasMeaningfulText(cell.text)))
}

function buildAdaptiveHeaderRows({
  cells,
  itemId,
}: {
  cells: ComposedHeaderCell[]
  itemId?: string
}) {
  const visibleCells = createHeaderCells(cells)
  const rows: ComposedTripletRow[] = []

  if (visibleCells.length === 0) return rows

  if (visibleCells.length === 1) {
    const [first] = visibleCells
    const row = createTripletRow({
      left: first.text,
      itemId,
      fieldKeys: {
        left: first.fieldKey,
      },
    })
    if (row) rows.push(row)
    return rows
  }

  if (visibleCells.length === 2) {
    const [first, second] = visibleCells
    const row = createTripletRow({
      left: first.text,
      right: second.text,
      itemId,
      fieldKeys: {
        left: first.fieldKey,
        right: second.fieldKey,
      },
    })
    if (row) rows.push(row)
    return rows
  }

  if (visibleCells.length === 3) {
    const [first, second, third] = visibleCells
    const row = createTripletRow({
      left: first.text,
      center: second.text,
      right: third.text,
      itemId,
      fieldKeys: {
        left: first.fieldKey,
        center: second.fieldKey,
        right: third.fieldKey,
      },
    })
    if (row) rows.push(row)
    return rows
  }

  const [first, second, third, fourth] = visibleCells
  const topRow = createTripletRow({
    left: first.text,
    right: second.text,
    itemId,
    fieldKeys: {
      left: first.fieldKey,
      right: second.fieldKey,
    },
  })
  const bottomRow = createTripletRow({
    left: third.text,
    right: fourth.text,
    itemId,
    fieldKeys: {
      left: third.fieldKey,
      right: fourth.fieldKey,
    },
  })
  if (topRow) rows.push(topRow)
  if (bottomRow) rows.push(bottomRow)
  return rows
}

function appendTextRows(rows: ComposedRow[], lines: string[], itemId?: string, fieldKey?: string) {
  lines.forEach(line => {
    const row = createTextRow(line, itemId, fieldKey)
    if (row) rows.push(row)
  })
}

function collectStandardItemRows(sectionId: StandardSectionType, item: Record<string, unknown>) {
  const website = (item.website as { url?: string; label?: string } | undefined) || {}
  const itemId = toText(item.id)
  const rows: ComposedRow[] = []

  switch (sectionId) {
    case 'profiles': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.network), fieldKey: 'network' },
          { text: toText(item.username), fieldKey: 'username' },
          { text: toText(website.label || website.url), fieldKey: website.label ? 'website.label' : 'website.url' },
        ],
      }))
      return rows
    }
    case 'experience': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.company), fieldKey: 'company' },
          { text: toText(item.period), fieldKey: 'period' },
          { text: toText(item.position), fieldKey: 'position' },
          { text: toText(item.location), fieldKey: 'location' },
        ],
      }))
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(item.description))), itemId, 'description')
      return rows
    }
    case 'education': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.school), fieldKey: 'school' },
          { text: toText(item.period), fieldKey: 'period' },
          { text: toText(item.degree), fieldKey: 'degree' },
          { text: toText(item.area), fieldKey: 'area' },
        ],
      }))
      appendTextRows(rows, [joinParts([item.grade, item.location], ' · ')], itemId, hasMeaningfulText(item.grade) ? 'grade' : 'location')
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(item.description))), itemId, 'description')
      return rows
    }
    case 'projects': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.name), fieldKey: 'name' },
          { text: toText(item.period), fieldKey: 'period' },
          { text: toText(website.label || website.url), fieldKey: website.label ? 'website.label' : 'website.url' },
        ],
      }))
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(item.description))), itemId, 'description')
      return rows
    }
    case 'skills': {
      const keywords = Array.isArray(item.keywords) ? item.keywords.map(toText).filter(Boolean).join(', ') : ''
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.name), fieldKey: 'name' },
          { text: toText(item.proficiency), fieldKey: 'proficiency' },
          { text: keywords, fieldKey: 'keywords' },
        ],
      }))
      return rows
    }
    case 'languages': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.language), fieldKey: 'language' },
          { text: toText(item.fluency), fieldKey: 'fluency' },
          { text: item.level ? `等级 ${toText(item.level)}` : '', fieldKey: 'level' },
        ],
      }))
      return rows
    }
    case 'interests': {
      const keywords = Array.isArray(item.keywords) ? item.keywords.map(toText).filter(Boolean).join(', ') : ''
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.name), fieldKey: 'name' },
          { text: keywords, fieldKey: 'keywords' },
        ],
      }))
      return rows
    }
    case 'awards': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.title), fieldKey: 'title' },
          { text: toText(item.date), fieldKey: 'date' },
          { text: toText(item.awarder), fieldKey: 'awarder' },
        ],
      }))
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(item.description))), itemId, 'description')
      return rows
    }
    case 'certifications': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.title), fieldKey: 'title' },
          { text: toText(item.date), fieldKey: 'date' },
          { text: toText(item.issuer), fieldKey: 'issuer' },
        ],
      }))
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(item.description))), itemId, 'description')
      return rows
    }
    case 'publications': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.title), fieldKey: 'title' },
          { text: toText(item.date), fieldKey: 'date' },
          { text: toText(item.publisher), fieldKey: 'publisher' },
        ],
      }))
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(item.description))), itemId, 'description')
      return rows
    }
    case 'volunteer': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.organization), fieldKey: 'organization' },
          { text: toText(item.period), fieldKey: 'period' },
          { text: toText(item.location), fieldKey: 'location' },
        ],
      }))
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(item.description))), itemId, 'description')
      return rows
    }
    case 'references': {
      rows.push(...buildAdaptiveHeaderRows({
        itemId,
        cells: [
          { text: toText(item.name), fieldKey: 'name' },
          { text: toText(item.phone), fieldKey: 'phone' },
          { text: toText(item.position), fieldKey: 'position' },
        ],
      }))
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(item.description))), itemId, 'description')
      return rows
    }
    default:
      return rows
  }
}

function buildHeroBlock(data: ResumeData, preset: ComposedPreset): ComposedHeroBlock {
  const headline = toText(data.basics.intentionPosition || data.basics.headline)
  const headlineFieldKey = data.basics.intentionPosition ? 'intentionPosition' : 'headline'
  const meta: ComposedMetaLine[] = [
    { text: toText(data.basics.phone), fieldKey: 'phone' },
    { text: toText(data.basics.email), fieldKey: 'email' },
    { text: toText(data.basics.location || data.basics.nativePlace), fieldKey: data.basics.nativePlace ? 'nativePlace' : 'location' },
    { text: toText(data.basics.website.label || data.basics.website.url), fieldKey: data.basics.website.label ? 'website.label' : 'website.url' },
  ].filter(item => hasMeaningfulText(item.text))

  return {
    kind: 'hero',
    id: 'hero',
    sectionId: 'basics',
    style: preset.hero,
    name: toText(data.basics.name) || '未命名候选人',
    headline,
    headlineFieldKey,
    meta,
  }
}

function buildSummaryBlock(data: ResumeData, preset: ComposedPreset): ComposedSectionBlock | null {
  if (data.summary.hidden) return null
  const rows = normalizeParagraphs(htmlToPlainText(data.summary.content))
    .map(text => createTextRow(text, undefined, 'content'))
    .filter((row): row is ComposedTextRow => Boolean(row))
  if (rows.length === 0) return null

  return {
    kind: 'section',
    id: 'summary',
    sectionId: 'summary',
    title: toText(data.summary.title) || '个人总结',
    style: preset.section,
    rows,
  }
}

function buildStandardSectionBlock(
  data: ResumeData,
  sectionId: StandardSectionType,
  preset: ComposedPreset,
): ComposedSectionBlock | null {
  const section = data.sections[sectionId]
  if (!section || section.hidden) return null

  const rows: ComposedRow[] = []
  appendTextRows(rows, normalizeParagraphs(htmlToPlainText(section.intro)), undefined, 'intro')

  section.items.forEach(item => {
    const record = item as unknown as Record<string, unknown>
    if (record.hidden) return
    rows.push(...collectStandardItemRows(sectionId, record))
  })

  if (rows.length === 0) return null
  return {
    kind: 'section',
    id: sectionId,
    sectionId,
    title: toText(section.title) || STANDARD_SECTION_TITLE_MAP[sectionId],
    style: preset.section,
    rows,
  }
}

function buildCustomSectionBlock(
  data: ResumeData,
  customSectionId: string,
  preset: ComposedPreset,
): ComposedSectionBlock | null {
  const custom = data.customSections.find(section => section.id === customSectionId)
  if (!custom || custom.hidden) return null

  const rows: ComposedRow[] = []
  custom.items.forEach(item => {
    const record = item as unknown as Record<string, unknown>
    if (record.hidden) return
    const itemId = toText(record.id)

    if (custom.type === 'summary') {
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(record.content))), itemId, 'content')
      return
    }

    if (custom.type === 'cover-letter') {
      const recipient = toText(record.recipient)
      appendTextRows(rows, recipient ? [`收件人：${recipient}`] : [], itemId, 'recipient')
      appendTextRows(rows, normalizeParagraphs(htmlToPlainText(toText(record.content))), itemId, 'content')
      return
    }

    rows.push(...collectStandardItemRows(custom.type as StandardSectionType, record))
  })

  if (rows.length === 0) return null
  return {
    kind: 'section',
    id: custom.id,
    sectionId: custom.id,
    title: toText(custom.title) || '自定义板块',
    style: preset.section,
    rows,
  }
}

export function buildComposedBlocks(
  data: ResumeData,
  sectionIds: string[],
  preset: ComposedPreset = DEFAULT_COMPOSED_PRESET,
): ComposedBlock[] {
  const blocks: ComposedBlock[] = [buildHeroBlock(data, preset)]
  const visited = new Set<string>()

  sectionIds.forEach(sectionId => {
    if (visited.has(sectionId)) return
    visited.add(sectionId)

    if (sectionId === 'summary') {
      const summaryBlock = buildSummaryBlock(data, preset)
      if (summaryBlock) blocks.push(summaryBlock)
      return
    }

    if ((Object.keys(STANDARD_SECTION_TITLE_MAP) as StandardSectionType[]).includes(sectionId as StandardSectionType)) {
      const standardBlock = buildStandardSectionBlock(data, sectionId as StandardSectionType, preset)
      if (standardBlock) blocks.push(standardBlock)
      return
    }

    const customBlock = buildCustomSectionBlock(data, sectionId, preset)
    if (customBlock) blocks.push(customBlock)
  })

  return blocks
}

function measureHeroBlockHeight(
  block: ComposedHeroBlock,
  widthPx: number,
  data: ResumeData,
) {
  const style = block.style
  const contentWidth = Math.max(1, widthPx - style.paddingX * 2 - style.borderWidth * 2)
  const headingFontFamily = resolveResumeFontFamilyStack(
    data.metadata.typography.heading.fontFamily || data.metadata.typography.body.fontFamily,
  )
  const bodyFontFamily = resolveResumeFontFamilyStack(data.metadata.typography.body.fontFamily)

  const nameHeight = measureTextHeight({
    text: block.name,
    widthPx: contentWidth,
    lineHeightPx: style.nameFontSize * style.nameLineHeight,
    fontFamily: headingFontFamily,
    fontSizePx: style.nameFontSize,
    fontWeight: 700,
  })

  const headlineHeight = hasMeaningfulText(block.headline)
    ? measureTextHeight({
        text: block.headline,
        widthPx: contentWidth,
        lineHeightPx: style.headlineFontSize * style.headlineLineHeight,
        fontFamily: bodyFontFamily,
        fontSizePx: style.headlineFontSize,
        fontWeight: 500,
      })
    : 0

  const metaText = block.meta.map(item => item.text).join(' · ')
  const metaHeight = hasMeaningfulText(metaText)
    ? measureTextHeight({
        text: metaText,
        widthPx: contentWidth,
        lineHeightPx: style.metaFontSize * style.metaLineHeight,
        fontFamily: bodyFontFamily,
        fontSizePx: style.metaFontSize,
        fontWeight: 400,
      })
    : 0

  const contentHeight =
    nameHeight +
    (headlineHeight ? style.paragraphGap + headlineHeight : 0) +
    (metaHeight ? style.metaGap + metaHeight : 0)

  return Math.max(contentHeight, HERO_CONTENT_MIN_HEIGHT_PX)
}

function measureRowsHeight(
  rows: ComposedRow[],
  contentWidth: number,
  style: ComposedBlockStyle,
  bodyFontFamily: string,
) {
  const bodyLineHeightPx = style.bodyFontSize * style.bodyLineHeight
  const rowHeights = rows.map(row => {
    if (row.kind === 'text') {
      return measureTextHeight({
        text: row.text,
        widthPx: contentWidth,
        lineHeightPx: bodyLineHeightPx,
        fontFamily: bodyFontFamily,
        fontSizePx: style.bodyFontSize,
        fontWeight: 400,
      })
    }

    const leftWidth = measureSingleLineWidth({
      text: row.left,
      fontFamily: bodyFontFamily,
      fontSizePx: style.bodyFontSize,
      fontWeight: 400,
    })
    const centerWidth = measureSingleLineWidth({
      text: row.center || '',
      fontFamily: bodyFontFamily,
      fontSizePx: style.bodyFontSize,
      fontWeight: 400,
    })
    const hasRight = hasMeaningfulText(row.right)
    const rightWidthPx = resolveTripletRightWidth({
      contentWidth,
      leftWidth,
      centerWidth,
      inlineGap: style.inlineGap,
      layout: row.layout,
    })
    const rightHeight = hasRight
      ? measureTextHeight({
          text: row.right || '',
          widthPx: rightWidthPx,
          lineHeightPx: bodyLineHeightPx,
          fontFamily: bodyFontFamily,
          fontSizePx: style.bodyFontSize,
          fontWeight: 400,
        })
      : 0

    return Math.max(bodyLineHeightPx, rightHeight)
  })

  const bodyHeight = rowHeights.reduce((sum, height) => sum + height, 0)
  const rowGapHeight = rowHeights.reduce((sum, _height, index) => {
    if (index === 0) return sum
    const previousRow = rows[index - 1]
    const currentRow = rows[index]
    if (!previousRow || !currentRow) return sum + style.paragraphGap
    return sum + resolveComposedRowGap(previousRow, currentRow, style.paragraphGap)
  }, 0)

  return bodyHeight + rowGapHeight
}

function measureSkillsSectionBodyHeight(
  block: ComposedSectionBlock,
  contentWidth: number,
  data: ResumeData,
) {
  const skillsVariantIntroGap = 10
  const style = block.style
  const bodyFontFamily = resolveResumeFontFamilyStack(data.metadata.typography.body.fontFamily)
  const introRows = block.rows.filter(row => !toText(row.itemId))
  const introHeight = measureRowsHeight(introRows, contentWidth, style, bodyFontFamily)
  const estimateInput = {
    items: data.sections.skills.items,
    contentWidthPx: contentWidth,
    style,
    fontFamily: bodyFontFamily,
    measureTextHeight,
    measureSingleLineWidth,
  }
  const skillsVariant = resolveSkillsVariant(data.metadata.design.skillsVariant)

  let skillsHeight = 0
  if (skillsVariant === 'skills-1') {
    skillsHeight = estimateSkills1Height(estimateInput)
  } else if (skillsVariant === 'skills-2') {
    skillsHeight = estimateSkills2Height(estimateInput)
  } else if (skillsVariant === 'skills-3') {
    skillsHeight = estimateSkills3Height(estimateInput)
  } else {
    skillsHeight = estimateSkills4Height(estimateInput)
  }

  if (introHeight > 0 && skillsHeight > 0) {
    return introHeight + skillsVariantIntroGap + skillsHeight
  }

  return introHeight + skillsHeight
}

function measureSectionBlockContentHeight(
  block: ComposedSectionBlock,
  widthPx: number,
  data: ResumeData,
  options: { showHeader?: boolean } = {},
) {
  const style = block.style
  const showHeader = options.showHeader !== false
  const contentWidth = Math.max(1, widthPx - style.paddingX * 2 - style.borderWidth * 2)
  const headerContentWidth = Math.max(1, contentWidth - style.sectionHeaderPaddingX * 2)
  const headingFontFamily = resolveResumeFontFamilyStack(
    data.metadata.typography.heading.fontFamily || data.metadata.typography.body.fontFamily,
  )
  const bodyFontFamily = resolveResumeFontFamilyStack(data.metadata.typography.body.fontFamily)

  const titleHeight = showHeader
    ? measureTextHeight({
        text: block.title,
        widthPx: headerContentWidth,
        lineHeightPx: style.titleFontSize * style.titleLineHeight,
        fontFamily: headingFontFamily,
        fontSizePx: style.titleFontSize,
        fontWeight: 700,
      })
    : 0
  const sectionHeaderHeight = showHeader ? titleHeight + style.sectionHeaderPaddingY * 2 : 0
  const bodyHeight =
    block.sectionId === 'skills'
      ? measureSkillsSectionBodyHeight(block, contentWidth, data)
      : measureRowsHeight(block.rows, contentWidth, style, bodyFontFamily)
  const hasRenderableSkillsVariant =
    block.sectionId === 'skills' && data.sections.skills.items.some(item => isRenderableSkillItem(item))
  const hasSkillIntroRows =
    block.sectionId === 'skills' && block.rows.some(row => String(row.itemId || '').trim().length === 0)
  const bodyTopGapPx =
    hasRenderableSkillsVariant && !hasSkillIntroRows ? 0 : style.paragraphGap
  const headerGapPx = showHeader && bodyHeight > 0 ? style.sectionHeaderGap : 0

  return sectionHeaderHeight + (bodyHeight > 0 ? headerGapPx + bodyTopGapPx + bodyHeight : 0)
}

function resolveVerticalPadding(style: ComposedBlockStyle) {
  return {
    top: typeof style.paddingTop === 'number' ? style.paddingTop : style.paddingY,
    bottom: typeof style.paddingBottom === 'number' ? style.paddingBottom : style.paddingY,
  }
}

export function estimateSectionBlockShellHeight(
  block: ComposedSectionBlock,
  widthPx: number,
  data: ResumeData,
  options: { showHeader?: boolean } = {},
) {
  const textHeightPx = measureSectionBlockContentHeight(block, widthPx, data, options)
  const verticalPadding = resolveVerticalPadding(block.style)
  const paddingPx = verticalPadding.top + verticalPadding.bottom
  const borderPx = block.style.borderWidth * 2

  return {
    textHeightPx,
    paddingPx,
    borderPx,
    shellHeightPx: textHeightPx + paddingPx + borderPx,
  }
}

export function estimateComposedHeight({
  data,
  sectionIds,
  contentWidthPx,
  preset,
}: ComposedEstimateInput): ComposedHeightEstimate {
  const activePreset = preset || DEFAULT_COMPOSED_PRESET
  const blocks = buildComposedBlocks(data, sectionIds, activePreset)
  if (!Number.isFinite(contentWidthPx) || contentWidthPx <= 1 || blocks.length === 0) {
    return {
      predictedHeightPx: 0,
      blockHeights: [],
    }
  }

  const blockHeights: ComposedBlockHeightDebug[] = blocks.map((block, index) => {
    const isLast = index === blocks.length - 1
    const marginBottomPx = isLast ? 0 : block.style.marginBottom
    const textHeightPx =
      block.kind === 'hero'
        ? measureHeroBlockHeight(block, contentWidthPx, data)
        : measureSectionBlockContentHeight(block, contentWidthPx, data)
    const verticalPadding = resolveVerticalPadding(block.style)
    const paddingPx = verticalPadding.top + verticalPadding.bottom
    const borderPx = block.style.borderWidth * 2
    const marginPx = marginBottomPx
    const totalHeightPx = textHeightPx + paddingPx + borderPx + marginPx
    return {
      id: block.id,
      sectionId: block.sectionId,
      textHeightPx,
      paddingPx,
      borderPx,
      marginPx,
      contentHeightPx: textHeightPx,
      totalHeightPx,
      marginBottomPx,
    }
  })

  return {
    predictedHeightPx: blockHeights.reduce((sum, block) => sum + block.totalHeightPx, 0),
    blockHeights,
  }
}
