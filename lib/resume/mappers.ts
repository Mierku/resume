import { resumeContentV2Schema } from './schema'
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

export interface ResumeDataSource {
  id: string
  name: string
  basics?: Record<string, unknown> | null
  intention?: Record<string, unknown> | null
  summaryZh?: string | null
  summaryEn?: string | null
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
        name: '智能简历 Builder',
        startDate: '2024.01',
        endDate: '2024.08',
        url: 'https://example.com/resume-builder',
        description:
          '设计并实现简历模块化编辑与模板引擎，支持拖拽排序、实时预览、导出打印。',
      },
      {
        id: 'project-2',
        name: '岗位投递自动化平台',
        startDate: '2023.03',
        endDate: '2023.11',
        url: 'https://example.com/autofill',
        description:
          '实现多站点表单自动填充与投递记录收录，减少重复操作，提升投递效率。',
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

  if (isReactiveTemplateId(value)) {
    return value
  }

  if (LEGACY_TEMPLATE_IDS.has(value)) {
    return DEFAULT_TEMPLATE
  }

  return DEFAULT_TEMPLATE
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
      label: String(project.url || ''),
    },
    description: textToHtml(String(project.description || '')),
  }))

  const skills = (skillsModule.skills as string[]) || []
  data.sections.skills.items = skills.map(skill => ({
    id: createId(),
    hidden: false,
    icon: 'code',
    name: skill,
    proficiency: '',
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
      label: String(project.url || project.website || ''),
    },
    description: textToHtml(String(project.description || '')),
  }))

  data.sections.skills.items = (dataSource.skills || []).map<SkillItem>(skill => ({
    id: createId(),
    hidden: false,
    icon: 'code',
    name: skill,
    proficiency: '',
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
    data.metadata.typography.body.fontSize = Math.max(6, Math.min(24, legacy.styles.fontSize))
  }

  if (legacy.styles?.lineHeight) {
    data.metadata.typography.body.lineHeight = Math.max(0.8, Math.min(3, legacy.styles.lineHeight))
  }

  if (legacy.styles?.fontFamily) {
    data.metadata.typography.body.fontFamily = legacy.styles.fontFamily
    data.metadata.typography.heading.fontFamily = legacy.styles.fontFamily
  }

  if (legacy.styles?.photoUrl) {
    data.picture.url = legacy.styles.photoUrl
  }

  data.customSections = mapLegacyCustomModules(legacy.customModules, formData)

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
  const parsed = resumeContentV2Schema.safeParse(content)
  if (parsed.success) {
    return parsed.data
  }

  const template = normalizeTemplateId(options?.templateId)
  const migrated = mapLegacyContentToV2(content, options?.dataSource, template)

  if (!options?.withBackup) {
    delete migrated.legacyBackup
  }

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
