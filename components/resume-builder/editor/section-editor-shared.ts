import {
  type NumericLimitConfig,
} from '@/lib/resume/editor-limits'
import {
  STANDARD_SECTION_IDS,
  type ResumeData,
  type StandardSectionType,
} from '@/lib/resume/types'
import { splitPeriodValue } from '@/lib/date-fields'
import { DEFAULT_SKILL_PROFICIENCY, resolveSkillPercent } from '@/lib/resume/skills'

export { DEFAULT_SKILL_PROFICIENCY }

export const GENDER_OPTIONS = [
  { value: '', label: '不填' },
  { value: '男', label: '男' },
  { value: '女', label: '女' },
]

export const WORK_YEAR_OPTIONS = [
  { value: '', label: '不填' },
  { value: '应届生', label: '应届生' },
  { value: '1年经验', label: '1年经验' },
  { value: '2年经验', label: '2年经验' },
  { value: '3年经验', label: '3年经验' },
  { value: '4年经验', label: '4年经验' },
  { value: '5年经验', label: '5年经验' },
  { value: '6年经验', label: '6年经验' },
  { value: '7年经验', label: '7年经验' },
  { value: '8年经验', label: '8年经验' },
  { value: '9年经验', label: '9年经验' },
  { value: '10年以上', label: '10年以上' },
]

export const MARITAL_STATUS_OPTIONS = [
  { value: '', label: '不填' },
  { value: '未婚', label: '未婚' },
  { value: '已婚', label: '已婚' },
]

export const SKILL_PROFICIENCY_OPTIONS = [
  { value: DEFAULT_SKILL_PROFICIENCY, label: DEFAULT_SKILL_PROFICIENCY },
  { value: '熟悉', label: '熟悉' },
  { value: '精通', label: '精通' },
]

export const POLITICAL_STATUS_OPTIONS = [
  { value: '', label: '不填' },
  { value: '中共党员', label: '中共党员' },
  { value: '共青团员', label: '共青团员' },
  { value: '群众', label: '群众' },
  { value: '民主党派', label: '民主党派' },
]

export const BASICS_HEIGHT_LIMIT: NumericLimitConfig = {
  min: 120,
  max: 230,
  step: 1,
  defaultValue: 170,
  presets: [150, 160, 170, 175, 180, 185, 190, 200],
}

export const BASICS_WEIGHT_LIMIT: NumericLimitConfig = {
  min: 35,
  max: 180,
  step: 1,
  defaultValue: 60,
  presets: [45, 50, 55, 60, 65, 70, 75, 80],
}

export function toSingleSelectValue(value: string | string[]) {
  return Array.isArray(value) ? value[0] || '' : value
}

export const STANDARD_SECTION_LABELS: Record<StandardSectionType, string> = {
  profiles: '社交资料',
  experience: '工作经历',
  education: '教育经历',
  projects: '项目经历',
  skills: '技能',
  languages: '语言能力',
  interests: '兴趣爱好',
  awards: '奖项',
  certifications: '证书',
  publications: '出版物',
  volunteer: '志愿经历',
  references: '推荐人',
}

export const SECTION_FIELD_CONFIG: Record<
  StandardSectionType,
  Array<
    | { key: string; label: string; type?: 'text' | 'number' }
    | { key: string; label: string; type: 'rich' }
    | { key: string; label: string; type: 'keywords' }
  >
> = {
  profiles: [
    { key: 'network', label: '平台' },
    { key: 'username', label: '用户名' },
    { key: 'website.url', label: '链接' },
    { key: 'website.label', label: '显示文本' },
  ],
  experience: [
    { key: 'company', label: '公司' },
    { key: 'position', label: '职位' },
    { key: 'location', label: '地点' },
    { key: 'period', label: '时间段' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  education: [
    { key: 'school', label: '学校' },
    { key: 'degree', label: '学历' },
    { key: 'area', label: '专业方向' },
    { key: 'grade', label: '成绩' },
    { key: 'period', label: '时间段' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  projects: [
    { key: 'name', label: '项目名称' },
    { key: 'period', label: '时间段' },
    { key: 'website.label', label: '职责' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  skills: [
    { key: 'name', label: '技能名称' },
    { key: 'proficiency', label: '熟练度' },
    { key: 'level', label: '等级', type: 'number' },
    { key: 'keywords', label: '关键字', type: 'keywords' },
  ],
  languages: [
    { key: 'language', label: '语言' },
    { key: 'fluency', label: '熟练度' },
    { key: 'level', label: '等级', type: 'number' },
  ],
  interests: [
    { key: 'name', label: '兴趣' },
    { key: 'keywords', label: '关键字', type: 'keywords' },
  ],
  awards: [
    { key: 'title', label: '奖项名称' },
    { key: 'awarder', label: '颁发机构' },
    { key: 'date', label: '日期' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  certifications: [
    { key: 'title', label: '证书名称' },
    { key: 'issuer', label: '签发机构' },
    { key: 'date', label: '日期' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  publications: [
    { key: 'title', label: '标题' },
    { key: 'publisher', label: '发布方' },
    { key: 'date', label: '日期' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  volunteer: [
    { key: 'organization', label: '组织' },
    { key: 'location', label: '地点' },
    { key: 'period', label: '时间段' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  references: [
    { key: 'name', label: '姓名' },
    { key: 'position', label: '职位' },
    { key: 'phone', label: '电话' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
}

export function getNestedValue(target: Record<string, unknown>, key: string) {
  const keys = key.split('.')
  let current: unknown = target
  for (const item of keys) {
    if (!current || typeof current !== 'object') return ''
    current = (current as Record<string, unknown>)[item]
  }
  return current
}

function setNestedValue(target: Record<string, unknown>, key: string, value: unknown) {
  const keys = key.split('.')
  const lastKey = keys[keys.length - 1]
  let current = target

  keys.slice(0, -1).forEach(item => {
    if (!current[item] || typeof current[item] !== 'object') {
      current[item] = {}
    }
    current = current[item] as Record<string, unknown>
  })

  current[lastKey] = value
}

export function createNestedPatch(target: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const keys = key.split('.')
  if (keys.length === 1) {
    return { [key]: value }
  }

  const root = keys[0]
  const nested = { ...((target[root] as Record<string, unknown> | undefined) || {}) }
  setNestedValue(nested, keys.slice(1).join('.'), value)
  return { [root]: nested }
}

interface StandardSectionItemSummaryConfig {
  primaryKey: string
  secondaryKey: string
  primaryFallback: string
  secondaryFallback: string
}

const STANDARD_SECTION_ITEM_SUMMARY_CONFIG: Partial<Record<StandardSectionType, StandardSectionItemSummaryConfig>> = {
  experience: {
    primaryKey: 'company',
    secondaryKey: 'period',
    primaryFallback: '公司',
    secondaryFallback: '时间',
  },
  education: {
    primaryKey: 'school',
    secondaryKey: 'period',
    primaryFallback: '学校',
    secondaryFallback: '时间',
  },
  projects: {
    primaryKey: 'name',
    secondaryKey: 'period',
    primaryFallback: '项目',
    secondaryFallback: '时间',
  },
  awards: {
    primaryKey: 'title',
    secondaryKey: 'date',
    primaryFallback: '奖项',
    secondaryFallback: '时间',
  },
  volunteer: {
    primaryKey: 'organization',
    secondaryKey: 'period',
    primaryFallback: '组织',
    secondaryFallback: '时间',
  },
}

export function supportsStandardSectionItemSummary(sectionId: StandardSectionType) {
  return Boolean(STANDARD_SECTION_ITEM_SUMMARY_CONFIG[sectionId])
}

function toSummaryText(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

export function resolveStandardSectionItemSummary(sectionId: StandardSectionType, record: Record<string, unknown>) {
  const config = STANDARD_SECTION_ITEM_SUMMARY_CONFIG[sectionId]
  if (!config) return null

  const primary = toSummaryText(getNestedValue(record, config.primaryKey))
  const secondary = toSummaryText(getNestedValue(record, config.secondaryKey))
  if (!primary && !secondary) return null

  return { primary, secondary }
}

export function isStandardSectionId(sectionId: string): sectionId is StandardSectionType {
  return STANDARD_SECTION_IDS.includes(sectionId as StandardSectionType)
}

export function getSectionDisplayTitle(data: ResumeData, sectionId: string) {
  if (sectionId === 'summary') {
    return data.summary.title || '个人总结'
  }

  if (isStandardSectionId(sectionId)) {
    return data.sections[sectionId].title || STANDARD_SECTION_LABELS[sectionId]
  }

  const custom = data.customSections.find(section => section.id === sectionId)
  if (custom) {
    return custom.title || '自定义板块'
  }

  return sectionId
}

function getWorkbenchSectionTitle(data: ResumeData, sectionId: string) {
  if (sectionId === 'basics') return '基本信息'
  if (sectionId === 'intention') return '求职意向'
  return getSectionDisplayTitle(data, sectionId)
}

function getSectionItemCount(data: ResumeData, sectionId: string) {
  if (sectionId === 'basics' || sectionId === 'intention') {
    return null
  }

  if (sectionId === 'summary') {
    return typeof data.summary.content === 'string' && data.summary.content.trim() ? 1 : 0
  }

  if (isStandardSectionId(sectionId)) {
    return Array.isArray(data.sections[sectionId].items) ? data.sections[sectionId].items.length : 0
  }

  const custom = data.customSections.find(section => section.id === sectionId)
  return custom ? custom.items.length : 0
}

export function isSectionHidden(data: ResumeData, sectionId: string) {
  if (sectionId === 'summary') return data.summary.hidden
  if (isStandardSectionId(sectionId)) return data.sections[sectionId].hidden
  const custom = data.customSections.find(section => section.id === sectionId)
  return custom?.hidden ?? false
}

type SectionItemSortMode = 'date' | 'name' | 'proficiency'

const SECTION_ITEM_SORT_OPTIONS: Array<{ mode: SectionItemSortMode; label: string }> = [
  { mode: 'date', label: '按日期' },
  { mode: 'name', label: '按名称' },
  { mode: 'proficiency', label: '按熟练度' },
]

const DATE_SORT_SECTION_TYPES = new Set<StandardSectionType>([
  'experience',
  'education',
  'projects',
  'awards',
  'certifications',
  'publications',
  'volunteer',
])

const NAME_SORT_SECTION_TYPES = new Set<StandardSectionType>(STANDARD_SECTION_IDS)
const PROFICIENCY_SORT_SECTION_TYPES = new Set<StandardSectionType>(['skills', 'languages'])

function parseDateSortScore(rawValue: unknown) {
  const value = String(rawValue || '').trim()
  if (!value) return Number.NEGATIVE_INFINITY
  if (/(至今|现在|present|current)/i.test(value)) return 999912

  const normalized = value
    .replace(/[./年]/g, '-')
    .replace(/月/g, '')
    .replace(/日/g, '')
    .replace(/\s+/g, '')
  const match = normalized.match(/(\d{4})(?:-(\d{1,2}))?/)
  if (!match) return Number.NEGATIVE_INFINITY

  const year = Number(match[1] || 0)
  const month = Number(match[2] || 12)
  if (!Number.isFinite(year) || year <= 0) return Number.NEGATIVE_INFINITY
  return year * 100 + Math.max(1, Math.min(12, month || 12))
}

function resolvePeriodSortScore(period: unknown) {
  const { start, end } = splitPeriodValue(String(period || ''))
  return Math.max(parseDateSortScore(end), parseDateSortScore(start))
}

function resolveNameSortValue(sectionType: StandardSectionType, record: Record<string, unknown>) {
  switch (sectionType) {
    case 'profiles':
      return toSummaryText(record.network) || toSummaryText(record.username)
    case 'experience':
      return toSummaryText(record.company) || toSummaryText(record.position)
    case 'education':
      return toSummaryText(record.school) || toSummaryText(record.degree)
    case 'projects':
      return toSummaryText(record.name)
    case 'skills':
      return toSummaryText(record.name)
    case 'languages':
      return toSummaryText(record.language)
    case 'interests':
      return toSummaryText(record.name)
    case 'awards':
    case 'certifications':
    case 'publications':
      return toSummaryText(record.title)
    case 'volunteer':
      return toSummaryText(record.organization)
    case 'references':
      return toSummaryText(record.name)
    default:
      return ''
  }
}

function resolveDateSortValue(sectionType: StandardSectionType, record: Record<string, unknown>) {
  switch (sectionType) {
    case 'experience':
    case 'education':
    case 'projects':
    case 'volunteer':
      return resolvePeriodSortScore(record.period)
    case 'awards':
    case 'certifications':
    case 'publications':
      return parseDateSortScore(record.date)
    default:
      return Number.NEGATIVE_INFINITY
  }
}

function resolveProficiencySortValue(sectionType: StandardSectionType, record: Record<string, unknown>) {
  if (sectionType === 'skills') {
    return resolveSkillPercent(record.level, String(record.proficiency || ''))
  }

  if (sectionType === 'languages') {
    return resolveSkillPercent(record.level, String(record.fluency || ''))
  }

  return Number.NEGATIVE_INFINITY
}

function supportsSectionItemSortMode(sectionType: StandardSectionType, mode: SectionItemSortMode) {
  if (mode === 'date') return DATE_SORT_SECTION_TYPES.has(sectionType)
  if (mode === 'name') return NAME_SORT_SECTION_TYPES.has(sectionType)
  return PROFICIENCY_SORT_SECTION_TYPES.has(sectionType)
}

function resolveSectionSortType(data: ResumeData, sectionId: string): StandardSectionType | null {
  if (isStandardSectionId(sectionId)) return sectionId
  const custom = data.customSections.find(section => section.id === sectionId)
  if (!custom || custom.type === 'summary' || custom.type === 'cover-letter') return null
  return custom.type as StandardSectionType
}

function sortSectionItemsInPlace(items: Record<string, unknown>[], sectionType: StandardSectionType, mode: SectionItemSortMode) {
  if (!supportsSectionItemSortMode(sectionType, mode)) return

  const getNumberValue = (record: Record<string, unknown>) => {
    if (mode === 'date') return resolveDateSortValue(sectionType, record)
    return resolveProficiencySortValue(sectionType, record)
  }

  const getTextValue = (record: Record<string, unknown>) => resolveNameSortValue(sectionType, record)

  const decorated = items.map((item, index) => ({ item, index }))
  decorated.sort((left, right) => {
    if (mode === 'name') {
      const leftValue = getTextValue(left.item)
      const rightValue = getTextValue(right.item)
      const leftEmpty = !leftValue
      const rightEmpty = !rightValue
      if (leftEmpty !== rightEmpty) return leftEmpty ? 1 : -1
      const compare = leftValue.localeCompare(rightValue, 'zh-Hans-CN')
      return compare !== 0 ? compare : left.index - right.index
    }

    const leftValue = getNumberValue(left.item)
    const rightValue = getNumberValue(right.item)
    if (leftValue !== rightValue) return rightValue - leftValue
    return left.index - right.index
  })

  items.splice(0, items.length, ...decorated.map(entry => entry.item))
}

export function dedupeSectionIds(sectionIds: string[]) {
  return Array.from(new Set(sectionIds.filter(Boolean)))
}
