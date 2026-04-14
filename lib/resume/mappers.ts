import { resumeContentV2Schema } from './schema'
import { normalizeResumeFontFamily } from './fonts'
import {
  createDefaultResumeContentV2,
  createDefaultResumeData,
  isReactiveTemplateId,
  type CustomSection,
  type ReactiveTemplateId,
  type ResumeContentV2,
  type ResumeData,
  type SkillItem,
} from './types'
import { sanitizeHtml } from './sanitize'
import { DEFAULT_SKILL_PROFICIENCY } from './skills'

export interface ResumeDataSource {
  id: string
  name: string
  basics?: Record<string, unknown> | null
  intention?: Record<string, unknown> | null
  summaryZh?: string | null
  summaryEn?: string | null
  skillsIntroZh?: string | null
  education?: Array<Record<string, unknown>>
  work?: Array<Record<string, unknown>>
  projects?: Array<Record<string, unknown>>
  skills?: string[]
}

export function createMockResumeDataSource(): ResumeDataSource {
  return {
    id: 'mock-first-resume',
    name: '示例数据源',
    basics: {
      nameZh: '张三',
      email: 'zhangsan@example.com',
      phone: '138-0000-0000',
      location: '上海',
      website: 'https://portfolio.example.com',
      github: 'https://github.com/zhangsan',
      linkedin: 'https://linkedin.com/in/zhangsan',
    },
    intention: {
      position: '前端开发工程师',
      location: '上海',
      salaryMin: '20k-30k',
      availableDate: '随时到岗',
    },
    summaryZh:
      '5 年前端开发经验，熟悉 React / Next.js / TypeScript，关注用户体验与工程质量，具备从 0 到 1 搭建业务前端架构能力。',
    skillsIntroZh: `<ol>
<li>熟练掌握 HTML5/CSS3</li>
<li>了解 ES6/ES7、Webpack</li>
<li>开发 Node 监控平台中间件</li>
<li>了解常用的 Node 模块</li>
<li>了解 Hybrid、Electron 开发</li>
<li>React 以及 React 相关技术栈</li>
</ol>`,
    education: [
      {
        id: 'edu-1',
        school: '同济大学',
        degree: '本科',
        major: '软件工程',
        startDate: '2016.09',
        endDate: '2020.06',
        location: '上海',
        description: '主修软件工程、数据结构、计算机网络，连续两年获得校级奖学金。',
      },
    ],
    work: [
      {
        id: 'work-1',
        company: '某互联网科技有限公司',
        position: '高级前端工程师',
        startDate: '2022.07',
        endDate: '至今',
        location: '上海',
        description:
          '负责简历编辑器与投递平台核心模块建设，推动性能优化与组件体系升级，首页首屏性能提升约 35%。',
      },
      {
        id: 'work-2',
        company: '某 SaaS 创业公司',
        position: '前端工程师',
        startDate: '2020.07',
        endDate: '2022.06',
        location: '上海',
        description:
          '负责 B 端管理后台与可视化模块开发，搭建表单/表格基础能力，支持业务快速迭代。',
      },
    ],
    projects: [
      {
        id: 'project-1',
        name: '字节跳动创作者增长平台',
        role: '前端负责人',
        startDate: '2024.01',
        endDate: '2024.08',
        description: '主导创作者工作台与增长实验平台建设，统一任务流与指标看板，支撑运营快速验证增长策略。',
        responsibilities:
          '难点在于多业务线埋点口径不一致、实验配置频繁变更；设计可配置埋点协议与低代码实验面板，保障跨团队协作稳定推进。',
        achievements: '平台覆盖 6 条核心增长链路，实验发布周期由 5 天缩短至 1 天，重点场景转化率提升 18%。',
        url: '',
      },
      {
        id: 'project-2',
        name: '快手商业化投放中台',
        role: '核心开发',
        startDate: '2023.03',
        endDate: '2023.11',
        description: '负责投放策略配置、预算编排与数据报表模块，打通素材、计划、预算全流程。',
        responsibilities:
          '难点在于高并发场景下的数据一致性与复杂表单配置体验；通过分层缓存、异步校验和规则引擎重构，降低配置错误率。',
        achievements: '人效提升约 30%，异常投放率下降 24%，复杂计划配置时长由 20 分钟缩短至 8 分钟。',
        url: '',
      },
    ],
    skills: ['TypeScript', 'React', 'Next.js', 'Node.js', 'Tailwind CSS', 'Zustand'],
  }
}

interface LegacyCustomModule {
  id: string
  label: string
}

interface LegacyContent {
  styles?: {
    fontSize?: number
    lineHeight?: number
    fontFamily?: string
    photoUrl?: string
  }
  moduleOrder?: string[]
  formData?: Record<string, unknown>
  customModules?: LegacyCustomModule[]
  markdownText?: string
}

const DEFAULT_TEMPLATE: ReactiveTemplateId = 'template-1'
const REMOVED_NUMERIC_TEMPLATE_IDS = new Set([
  'template-6',
  'template-7',
  'template-8',
])
const LEGACY_REACTIVE_TEMPLATE_ALIAS_MAP: Record<string, ReactiveTemplateId> = {
  'template-9': 'template-1',
  'template-10': 'template-2',
  'template-11': 'template-3',
  'template-12': 'template-4',
}
const LEGACY_REACTIVE_HEADER_ALIAS_MAP = {
  'header-9': 'header-1',
  'header-10': 'header-2',
  'header-11': 'header-3',
  'header-12': 'header-4',
  'header-13': 'header-5',
} as const

const LEGACY_TEMPLATE_IDS = new Set([
  'azurill',
  'bronzor',
  'chikorita',
  'ditgar',
  'ditto',
  'gengar',
  'glalie',
  'kakuna',
  'lapras',
  'leafish',
  'onyx',
  'pikachu',
  'rhyhorn',
  'classic',
  'modern',
  'tech',
  'creative',
])

export type FillStrategy = 'overwrite' | 'preserve'

function applyUnifiedFontFamily(data: ResumeData) {
  const unifiedFontFamily = normalizeResumeFontFamily(
    data.metadata.typography.body.fontFamily || data.metadata.typography.heading.fontFamily,
  )
  data.metadata.typography.body.fontFamily = unifiedFontFamily
  data.metadata.typography.heading.fontFamily = unifiedFontFamily
}

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function textToHtml(text: string | null | undefined): string {
  const normalized = (text || '').trim()
  if (!normalized) return ''

  if (/<[a-z][\s\S]*>/i.test(normalized)) {
    return sanitizeHtml(normalized)
  }

  return normalized
    .split(/\n+/)
    .filter(Boolean)
    .map(line => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

function normalizeProjectDuty(project: Record<string, unknown>) {
  return String(project.role || project.responsibilities || project.duty || project.position || '').trim()
}

function composeProjectDescription(project: Record<string, unknown>) {
  const summary = String(project.description || '').trim()
  const responsibilities = String(project.responsibilities || '').trim()
  const achievements = String(project.achievements || '').trim()

  if (!responsibilities && !achievements) {
    return summary
  }

  const lines: string[] = []
  if (summary) {
    lines.push(`做了什么：${summary}`)
  }
  if (responsibilities) {
    lines.push(`难点与职责：${responsibilities}`)
  }
  if (achievements) {
    lines.push(`结果：${achievements}`)
  }
  return lines.join('\n')
}

function normalizeIntentionSalary(intention: Record<string, unknown>) {
  const direct = String(intention.salaryRange || intention.salary || intention.expectSalary || '').trim()
  if (direct) {
    return direct
  }

  const min = String(intention.salaryMin || intention.minSalary || '').trim()
  const max = String(intention.salaryMax || intention.maxSalary || '').trim()
  if (min && max) {
    return `${min}-${max}`
  }

  return min || max
}

export function isResumeContentV2(content: unknown): content is ResumeContentV2 {
  return resumeContentV2Schema.safeParse(content).success
}

export function normalizeTemplateId(value: string | undefined | null): ReactiveTemplateId {
  if (!value) {
    return DEFAULT_TEMPLATE
  }

  if (value in LEGACY_REACTIVE_TEMPLATE_ALIAS_MAP) {
    return LEGACY_REACTIVE_TEMPLATE_ALIAS_MAP[value]
  }

  if (isReactiveTemplateId(value)) {
    return value
  }

  if (REMOVED_NUMERIC_TEMPLATE_IDS.has(value)) {
    return DEFAULT_TEMPLATE
  }

  if (LEGACY_TEMPLATE_IDS.has(value)) {
    return DEFAULT_TEMPLATE
  }

  return DEFAULT_TEMPLATE
}

function normalizeTemplateAndHeaderAliases(content: unknown) {
  if (!content || typeof content !== 'object') return content
  const root = content as Record<string, unknown>
  const data = root.data
  if (!data || typeof data !== 'object') return content
  const metadata = (data as Record<string, unknown>).metadata
  if (!metadata || typeof metadata !== 'object') return content
  const meta = metadata as Record<string, unknown>

  const rawTemplate = meta.template
  if (typeof rawTemplate === 'string') {
    const normalizedTemplate = normalizeTemplateId(rawTemplate)
    if (normalizedTemplate !== rawTemplate) {
      meta.template = normalizedTemplate
    }
  }

  const design = meta.design
  if (!design || typeof design !== 'object') return content
  const designRecord = design as Record<string, unknown>
  const rawHeaderVariant = designRecord.headerVariant
  if (typeof rawHeaderVariant === 'string' && rawHeaderVariant in LEGACY_REACTIVE_HEADER_ALIAS_MAP) {
    designRecord.headerVariant = LEGACY_REACTIVE_HEADER_ALIAS_MAP[rawHeaderVariant as keyof typeof LEGACY_REACTIVE_HEADER_ALIAS_MAP]
  }
  if (typeof designRecord.skillsVariant !== 'string') {
    designRecord.skillsVariant = 'auto'
  }

  return content
}

function parseLegacyContent(content: unknown): LegacyContent {
  if (!content || typeof content !== 'object') return {}
  return content as LegacyContent
}

function mapLegacyCustomModules(
  customModules: LegacyCustomModule[] | undefined,
  formData: Record<string, unknown>,
): CustomSection[] {
  if (!Array.isArray(customModules) || customModules.length === 0) {
    return []
  }

  return customModules
    .map(module => {
      const moduleData = formData[module.id] as Record<string, unknown> | undefined
      const content = String(moduleData?.content || '').trim()

      return {
        id: module.id,
        type: 'summary' as const,
        title: module.label || '自定义板块',
        columns: 1,
        hidden: false,
        items: [
          {
            id: createId(),
            hidden: false,
            content: textToHtml(content),
          },
        ],
      }
    })
    .filter(section => {
      const content = section.items[0]
      return typeof content === 'object' && 'content' in content && stripHtml(content.content).length > 0
    })
}

function mapLegacyFormData(formData: Record<string, unknown>, data: ResumeData) {
  const basics = (formData.basics as Record<string, unknown>) || {}
  const intention = (formData.intention as Record<string, unknown>) || {}
  const summary = String(formData.summary || '').trim()
  const intentionSalary = normalizeIntentionSalary(intention)
  const intentionPosition = String(intention.position || basics.intentionPosition || basics.headline || '')

  const educationModule = (formData.education as Record<string, unknown>) || {}
  const workModule = (formData.work as Record<string, unknown>) || {}
  const projectModule = (formData.projects as Record<string, unknown>) || {}
  const skillsModule = (formData.skills as Record<string, unknown>) || {}

  data.basics.name = String(basics.nameZh || basics.nameEn || basics.name || '')
  data.basics.email = String(basics.email || '')
  data.basics.phone = String(basics.phone || '')
  data.basics.location = String(basics.location || '')
  data.basics.headline = intentionPosition
  data.basics.intentionPosition = intentionPosition
  data.basics.intentionCity = String(
    intention.location || intention.city || intention.targetCity || basics.intentionCity || basics.targetCity || '',
  )
  data.basics.intentionSalary = String(intentionSalary || basics.intentionSalary || basics.expectedSalary || '')
  data.basics.intentionAvailability = String(
    intention.availableDate ||
      intention.availability ||
      intention.arrivalDate ||
      basics.intentionAvailability ||
      basics.availableDate ||
      '',
  )
  data.basics.gender = String(basics.gender || basics.sex || '')
  data.basics.birthDate = String(basics.birthDate || basics.birthday || basics.birth || '')
  data.basics.workYears = String(basics.workYears || basics.experience || '')
  data.basics.maritalStatus = String(basics.maritalStatus || basics.marriage || '')
  data.basics.ethnicity = String(basics.ethnicity || basics.nation || '')
  data.basics.nativePlace = String(basics.nativePlace || basics.native || basics.hometown || '')
  data.basics.politicalStatus = String(basics.politicalStatus || basics.politicsStatus || '')
  data.basics.heightCm = String(basics.heightCm || basics.height || '')
  data.basics.weightKg = String(basics.weightKg || basics.weight || '')
  {
    const convertAgeRaw = basics.convertBirthToAge ?? basics.convertAge ?? basics.ageAuto
    const normalized = String(convertAgeRaw || '').toLowerCase()
    data.basics.convertBirthToAge = convertAgeRaw === true || normalized === 'true' || normalized === '1'
  }
  data.basics.website = {
    url: String(basics.website || ''),
    label: String(basics.website || ''),
  }

  if (basics.github) {
    data.basics.customFields.push({
      id: createId(),
      icon: 'github-logo',
      text: String(basics.github),
      link: String(basics.github),
    })
  }

  if (basics.linkedin) {
    data.basics.customFields.push({
      id: createId(),
      icon: 'linkedin-logo',
      text: String(basics.linkedin),
      link: String(basics.linkedin),
    })
  }

  if (summary) {
    data.summary.content = textToHtml(summary)
  }

  const educations = (educationModule.education as Array<Record<string, unknown>>) || []
  data.sections.education.items = educations.map(edu => ({
    id: String(edu.id || createId()),
    hidden: false,
    school: String(edu.school || ''),
    degree: String(edu.degree || ''),
    area: String(edu.major || ''),
    grade: '',
    location: String(edu.location || ''),
    period: `${String(edu.startDate || '')} - ${String(edu.endDate || '')}`.replace(/^\s*-\s*$/, ''),
    website: { url: '', label: '' },
    description: textToHtml(String(edu.description || '')),
  }))

  const works = (workModule.work as Array<Record<string, unknown>>) || []
  data.sections.experience.items = works.map(work => ({
    id: String(work.id || createId()),
    hidden: false,
    company: String(work.company || ''),
    position: String(work.position || ''),
    location: String(work.location || ''),
    period: `${String(work.startDate || '')} - ${String(work.endDate || '')}`.replace(/^\s*-\s*$/, ''),
    website: { url: '', label: '' },
    description: textToHtml(String(work.description || '')),
  }))

  const projects = (projectModule.projects as Array<Record<string, unknown>>) || []
  data.sections.projects.items = projects.map(project => ({
    id: String(project.id || createId()),
    hidden: false,
    name: String(project.name || ''),
    period: `${String(project.startDate || '')} - ${String(project.endDate || '')}`.replace(/^\s*-\s*$/, ''),
    website: {
      url: String(project.url || ''),
      label: normalizeProjectDuty(project),
    },
    description: textToHtml(composeProjectDescription(project)),
  }))

  const skills = (skillsModule.skills as string[]) || []
  data.sections.skills.items = skills.map(skill => ({
    id: createId(),
    hidden: false,
    icon: 'code',
    name: skill,
    proficiency: DEFAULT_SKILL_PROFICIENCY,
    level: 0,
    keywords: [],
  }))

  const intentionParts = [
    data.basics.intentionPosition ? `求职岗位: ${data.basics.intentionPosition}` : '',
    data.basics.intentionCity ? `意向城市: ${data.basics.intentionCity}` : '',
    data.basics.intentionSalary ? `期望薪资: ${data.basics.intentionSalary}` : '',
    data.basics.intentionAvailability ? `到岗时间: ${data.basics.intentionAvailability}` : '',
  ].filter(Boolean)

  if (intentionParts.length > 0) {
    data.basics.customFields.push({
      id: createId(),
      icon: 'briefcase',
      text: intentionParts.join(' | '),
      link: '',
    })
  }
}

export function mapDataSourceToResumeData(
  dataSource: ResumeDataSource,
  template: ReactiveTemplateId = DEFAULT_TEMPLATE,
): ResumeData {
  const data = createDefaultResumeData(template)

  const basics = dataSource.basics || {}
  const intention = dataSource.intention || {}
  const intentionSalary = normalizeIntentionSalary(intention)
  const intentionPosition = String(intention.position || basics.intentionPosition || basics.headline || '')

  data.basics.name = String(basics.nameZh || basics.nameEn || basics.name || '')
  data.basics.email = String(basics.email || '')
  data.basics.phone = String(basics.phone || '')
  data.basics.location = String(basics.location || '')
  data.basics.headline = intentionPosition
  data.basics.intentionPosition = intentionPosition
  data.basics.intentionCity = String(
    intention.location || intention.city || intention.targetCity || basics.intentionCity || basics.targetCity || '',
  )
  data.basics.intentionSalary = String(intentionSalary || basics.intentionSalary || basics.expectedSalary || '')
  data.basics.intentionAvailability = String(
    intention.availableDate ||
      intention.availability ||
      intention.arrivalDate ||
      basics.intentionAvailability ||
      basics.availableDate ||
      '',
  )
  data.basics.gender = String(basics.gender || basics.sex || '')
  data.basics.birthDate = String(basics.birthDate || basics.birthday || basics.birth || '')
  data.basics.workYears = String(basics.workYears || basics.experience || '')
  data.basics.maritalStatus = String(basics.maritalStatus || basics.marriage || '')
  data.basics.ethnicity = String(basics.ethnicity || basics.nation || '')
  data.basics.nativePlace = String(basics.nativePlace || basics.native || basics.hometown || '')
  data.basics.politicalStatus = String(basics.politicalStatus || basics.politicsStatus || '')
  data.basics.heightCm = String(basics.heightCm || basics.height || '')
  data.basics.weightKg = String(basics.weightKg || basics.weight || '')
  {
    const convertAgeRaw = basics.convertBirthToAge ?? basics.convertAge ?? basics.ageAuto
    const normalized = String(convertAgeRaw || '').toLowerCase()
    data.basics.convertBirthToAge = convertAgeRaw === true || normalized === 'true' || normalized === '1'
  }

  const website = String(basics.website || '')
  data.basics.website = {
    url: website,
    label: website,
  }

  if (basics.github) {
    data.basics.customFields.push({
      id: createId(),
      icon: 'github-logo',
      text: String(basics.github),
      link: String(basics.github),
    })
  }

  if (basics.linkedin) {
    data.basics.customFields.push({
      id: createId(),
      icon: 'linkedin-logo',
      text: String(basics.linkedin),
      link: String(basics.linkedin),
    })
  }

  data.summary.content = textToHtml(dataSource.summaryZh || dataSource.summaryEn || '')
  data.sections.skills.intro = textToHtml(dataSource.skillsIntroZh || '')

  data.sections.education.items = (dataSource.education || []).map(edu => ({
    id: String(edu.id || createId()),
    hidden: false,
    school: String(edu.school || ''),
    degree: String(edu.degree || ''),
    area: String(edu.major || edu.area || ''),
    grade: String(edu.grade || ''),
    location: String(edu.location || ''),
    period: `${String(edu.startDate || '')} - ${String(edu.endDate || '')}`.replace(/^\s*-\s*$/, ''),
    website: { url: String(edu.website || ''), label: String(edu.website || '') },
    description: textToHtml(String(edu.description || '')),
  }))

  data.sections.experience.items = (dataSource.work || []).map(work => ({
    id: String(work.id || createId()),
    hidden: false,
    company: String(work.company || ''),
    position: String(work.position || ''),
    location: String(work.location || ''),
    period: `${String(work.startDate || '')} - ${String(work.endDate || '')}`.replace(/^\s*-\s*$/, ''),
    website: { url: String(work.website || ''), label: String(work.website || '') },
    description: textToHtml(String(work.description || '')),
  }))

  data.sections.projects.items = (dataSource.projects || []).map(project => ({
    id: String(project.id || createId()),
    hidden: false,
    name: String(project.name || ''),
    period: `${String(project.startDate || '')} - ${String(project.endDate || '')}`.replace(/^\s*-\s*$/, ''),
    website: {
      url: String(project.url || project.website || ''),
      label: normalizeProjectDuty(project),
    },
    description: textToHtml(composeProjectDescription(project)),
  }))

  data.sections.skills.items = (dataSource.skills || []).map<SkillItem>(skill => ({
    id: createId(),
    hidden: false,
    icon: 'code',
    name: skill,
    proficiency: DEFAULT_SKILL_PROFICIENCY,
    level: 0,
    keywords: [],
  }))

  const intentionParts = [
    data.basics.intentionPosition ? `求职岗位: ${data.basics.intentionPosition}` : '',
    data.basics.intentionCity ? `意向城市: ${data.basics.intentionCity}` : '',
    data.basics.intentionSalary ? `期望薪资: ${data.basics.intentionSalary}` : '',
    data.basics.intentionAvailability ? `到岗时间: ${data.basics.intentionAvailability}` : '',
  ].filter(Boolean)

  if (intentionParts.length > 0) {
    data.basics.customFields.push({
      id: createId(),
      icon: 'briefcase',
      text: intentionParts.join(' | '),
      link: '',
    })
  }

  return data
}

export function applyDataSourceToResume(
  current: ResumeData,
  dataSource: ResumeDataSource,
  strategy: FillStrategy = 'overwrite',
): ResumeData {
  const mapped = mapDataSourceToResumeData(dataSource, current.metadata.template)

  const next: ResumeData = structuredClone(current)

  const setIfAllowed = <T>(
    getter: () => T,
    setter: (value: T) => void,
    incoming: T,
    isEmpty: (value: T) => boolean,
  ) => {
    if (strategy === 'overwrite') {
      setter(incoming)
      return
    }

    if (isEmpty(getter())) {
      setter(incoming)
    }
  }

  setIfAllowed(
    () => next.basics,
    value => {
      next.basics = value
    },
    mapped.basics,
    value => !value.name && !value.email && !value.phone,
  )

  setIfAllowed(
    () => next.summary.content,
    value => {
      next.summary.content = value
    },
    mapped.summary.content,
    value => !stripHtml(value),
  )

  const replaceSectionItems = (sectionId: keyof ResumeData['sections']) => {
    const incoming = mapped.sections[sectionId].items
    if (incoming.length === 0) return

    if (strategy === 'overwrite' || next.sections[sectionId].items.length === 0) {
      next.sections[sectionId].items = incoming as never
    }
  }

  replaceSectionItems('education')
  replaceSectionItems('experience')
  replaceSectionItems('projects')
  replaceSectionItems('skills')

  return next
}

export function mapLegacyContentToV2(
  content: unknown,
  dataSource?: ResumeDataSource | null,
  templateId: ReactiveTemplateId = DEFAULT_TEMPLATE,
): ResumeContentV2 {
  const legacy = parseLegacyContent(content)
  const data = dataSource ? mapDataSourceToResumeData(dataSource, templateId) : createDefaultResumeData(templateId)

  const formData = legacy.formData || {}
  if (Object.keys(formData).length > 0) {
    mapLegacyFormData(formData, data)
  }

  if (!stripHtml(data.summary.content) && legacy.markdownText) {
    data.summary.content = textToHtml(legacy.markdownText)
  }

  if (legacy.styles?.fontSize) {
    data.metadata.typography.body.fontSize = Math.max(10, Math.min(18, legacy.styles.fontSize))
  }

  if (legacy.styles?.lineHeight) {
    data.metadata.typography.body.lineHeight = Math.max(0.8, Math.min(3, legacy.styles.lineHeight))
  }

  if (legacy.styles?.fontFamily) {
    const legacyFontFamily = normalizeResumeFontFamily(legacy.styles.fontFamily)
    data.metadata.typography.body.fontFamily = legacyFontFamily
    data.metadata.typography.heading.fontFamily = legacyFontFamily
  }

  if (legacy.styles?.photoUrl) {
    data.picture.url = legacy.styles.photoUrl
  }

  data.customSections = mapLegacyCustomModules(legacy.customModules, formData)
  applyUnifiedFontFamily(data)

  return {
    version: 2,
    builder: 'reactive-core',
    data,
    legacyBackup: content,
    migratedAt: new Date().toISOString(),
  }
}

export function normalizeResumeContent(
  content: unknown,
  options?: {
    dataSource?: ResumeDataSource | null
    templateId?: string | null
    withBackup?: boolean
  },
): ResumeContentV2 {
  const normalizedContent = normalizeTemplateAndHeaderAliases(content)
  const parsed = resumeContentV2Schema.safeParse(normalizedContent)
  if (parsed.success) {
    applyUnifiedFontFamily(parsed.data.data)
    return parsed.data
  }

  const template = normalizeTemplateId(options?.templateId)
  const migrated = mapLegacyContentToV2(content, options?.dataSource, template)

  if (!options?.withBackup) {
    delete migrated.legacyBackup
  }

  applyUnifiedFontFamily(migrated.data)

  return migrated
}

export function createFreshResumeContent(
  templateId: string | undefined,
  dataSource?: ResumeDataSource | null,
): ResumeContentV2 {
  const template = normalizeTemplateId(templateId)

  if (dataSource) {
    return {
      version: 2,
      builder: 'reactive-core',
      data: mapDataSourceToResumeData(dataSource, template),
      migratedAt: new Date().toISOString(),
    }
  }

  return createDefaultResumeContentV2(template)
}
