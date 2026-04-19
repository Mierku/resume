import { prisma } from '@/lib/prisma'
import {
  ResumeMode,
  type Prisma,
  type ResumeShareVisibility,
} from '@prisma/client'
import { RESUME_TEMPLATES } from '@/lib/constants'
import { getResumeStorageLimit } from '@/lib/membership'
import {
  createFreshResumeContent,
  isResumeContentV2,
  normalizeResumeContent,
  normalizeTemplateId,
} from '@/lib/resume/mappers'
import type { ResumeContentV2, ResumeData, StandardSectionType } from '@/lib/resume/types'

type ResumeContent = ResumeContentV2

interface CreateResumeInput {
  title: string
  templateId: string
  themeColor?: string
  mode?: ResumeMode
  content?: unknown
  shareVisibility?: ResumeShareVisibility
  shareWithRecruiters?: boolean
}

interface UpdateResumeInput {
  title?: string
  templateId?: string
  mode?: ResumeMode
  content?: unknown
  shareVisibility?: ResumeShareVisibility
  shareWithRecruiters?: boolean
}

interface ResumeShareSettings {
  shareVisibility: ResumeShareVisibility
  shareWithRecruiters: boolean
}

interface PublicResumeHiddenResult {
  status: 'hidden'
  resumeId: string
  title: string
}

interface PublicResumeVisibleResult {
  status: 'visible'
  canDownload: boolean
  resume: {
    id: string
    title: string
    templateId: string
    content: unknown
  }
}

export type PublicResumeViewResult =
  | PublicResumeHiddenResult
  | PublicResumeVisibleResult

const RESUME_SHARE_VISIBILITY_PRIVATE: ResumeShareVisibility = 'private'
const RESUME_SHARE_VISIBILITY_PUBLIC: ResumeShareVisibility = 'public'

export class ResumeCreationLimitError extends Error {
  constructor(limit: number) {
    super(`基础版最多可创建 ${limit} 份简历，请升级 Pro 后继续新建。`)
    this.name = 'ResumeCreationLimitError'
  }
}

function getTemplates() {
  return RESUME_TEMPLATES
}

function getTemplate(id: string) {
  return RESUME_TEMPLATES.find(t => t.id === id)
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

type ResumeLimitClient = Pick<typeof prisma, 'user' | 'resume'>

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim()
}

function isHexColor(value: string | undefined): value is string {
  return Boolean(value && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value))
}

function normalizeShareSettings(
  input: {
    shareVisibility?: ResumeShareVisibility
    shareWithRecruiters?: boolean
  },
  fallback?: ResumeShareSettings,
): ResumeShareSettings {
  const shareVisibility =
    input.shareVisibility || fallback?.shareVisibility || RESUME_SHARE_VISIBILITY_PRIVATE

  const desiredRecruiterVisibility =
    input.shareWithRecruiters ??
    fallback?.shareWithRecruiters ??
    false

  return {
    shareVisibility,
    shareWithRecruiters:
      shareVisibility === RESUME_SHARE_VISIBILITY_PUBLIC
        ? Boolean(desiredRecruiterVisibility)
        : false,
  }
}

export function canPublicResumeBeViewed(settings: ResumeShareSettings): boolean {
  return settings.shareVisibility === RESUME_SHARE_VISIBILITY_PUBLIC
}

export function canPublicResumeBeDownloaded(settings: ResumeShareSettings): boolean {
  return (
    settings.shareVisibility === RESUME_SHARE_VISIBILITY_PUBLIC &&
    settings.shareWithRecruiters
  )
}

async function assertCanCreateResume(client: ResumeLimitClient, userId: string) {
  const [user, resumeCount] = await Promise.all([
    client.user.findUnique({
      where: { id: userId },
      select: { membershipPlan: true, role: true },
    }),
    client.resume.count({ where: { userId } }),
  ])

  const limit = getResumeStorageLimit(user?.membershipPlan, user?.role)
  if (limit !== null && resumeCount >= limit) {
    throw new ResumeCreationLimitError(limit)
  }
}

function itemMarkdown(item: Record<string, unknown>, keys: string[]): string {
  return keys
    .map(key => String(item[key] || '').trim())
    .filter(Boolean)
    .join(' | ')
}

function richToMarkdown(html: string): string {
  const plain = stripHtml(html)
  return plain || ''
}

function sectionToMarkdown(data: ResumeData, section: StandardSectionType, title: string): string {
  const sectionData = data.sections[section]
  if (sectionData.hidden || sectionData.items.length === 0) {
    return ''
  }

  const lines: string[] = [`## ${sectionData.title || title}`]

  sectionData.items.forEach(item => {
    if (item.hidden) return

    if (section === 'experience') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['company', 'position', 'period', 'location'])
      if (row) lines.push(`- ${row}`)
      const desc = richToMarkdown(String((item as { description?: string }).description || ''))
      if (desc) lines.push(`  - ${desc}`)
      return
    }

    if (section === 'education') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['school', 'degree', 'area', 'period'])
      if (row) lines.push(`- ${row}`)
      const desc = richToMarkdown(String((item as { description?: string }).description || ''))
      if (desc) lines.push(`  - ${desc}`)
      return
    }

    if (section === 'projects') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['name', 'period'])
      if (row) lines.push(`- ${row}`)
      const desc = richToMarkdown(String((item as { description?: string }).description || ''))
      if (desc) lines.push(`  - ${desc}`)
      return
    }

    if (section === 'skills') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['name', 'proficiency'])
      const keywords = (item as { keywords?: string[] }).keywords || []
      const suffix = keywords.length > 0 ? ` (${keywords.join(', ')})` : ''
      if (row) lines.push(`- ${row}${suffix}`)
      return
    }

    if (section === 'languages') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['language', 'fluency'])
      if (row) lines.push(`- ${row}`)
      return
    }

    if (section === 'interests') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['name'])
      const keywords = (item as { keywords?: string[] }).keywords || []
      const suffix = keywords.length > 0 ? ` (${keywords.join(', ')})` : ''
      if (row) lines.push(`- ${row}${suffix}`)
      return
    }

    if (section === 'profiles') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['network', 'username'])
      const website = (item as { website?: { url?: string } }).website?.url || ''
      if (row) lines.push(`- ${website ? `${row} (${website})` : row}`)
      return
    }

    if (section === 'awards') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['title', 'awarder', 'date'])
      if (row) lines.push(`- ${row}`)
      const desc = richToMarkdown(String((item as { description?: string }).description || ''))
      if (desc) lines.push(`  - ${desc}`)
      return
    }

    if (section === 'certifications') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['title', 'issuer', 'date'])
      if (row) lines.push(`- ${row}`)
      const desc = richToMarkdown(String((item as { description?: string }).description || ''))
      if (desc) lines.push(`  - ${desc}`)
      return
    }

    if (section === 'publications') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['title', 'publisher', 'date'])
      if (row) lines.push(`- ${row}`)
      const desc = richToMarkdown(String((item as { description?: string }).description || ''))
      if (desc) lines.push(`  - ${desc}`)
      return
    }

    if (section === 'volunteer') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['organization', 'period', 'location'])
      if (row) lines.push(`- ${row}`)
      const desc = richToMarkdown(String((item as { description?: string }).description || ''))
      if (desc) lines.push(`  - ${desc}`)
      return
    }

    if (section === 'references') {
      const row = itemMarkdown(item as unknown as Record<string, unknown>, ['name', 'position', 'phone'])
      if (row) lines.push(`- ${row}`)
      const desc = richToMarkdown(String((item as { description?: string }).description || ''))
      if (desc) lines.push(`  - ${desc}`)
    }
  })

  if (lines.length === 1) {
    return ''
  }

  return lines.join('\n')
}

function generateMarkdownFromContent(title: string, content: ResumeContentV2): string {
  const data = content.data
  const lines: string[] = []

  lines.push(`# ${data.basics.name || title}`)

  const contact = [data.basics.email, data.basics.phone, data.basics.location].filter(Boolean).join(' | ')
  if (contact) {
    lines.push(contact)
  }

  const website = data.basics.website?.url
  if (website) {
    lines.push(website)
  }

  if (stripHtml(data.summary.content)) {
    lines.push('\n## 个人简介')
    lines.push(richToMarkdown(data.summary.content))
  }

  const standardSections: Array<[StandardSectionType, string]> = [
    ['experience', '工作经历'],
    ['education', '教育经历'],
    ['projects', '项目经历'],
    ['skills', '技能'],
    ['profiles', '社交资料'],
    ['languages', '语言'],
    ['interests', '兴趣'],
    ['awards', '奖项'],
    ['certifications', '证书'],
    ['publications', '出版物'],
    ['volunteer', '志愿经历'],
    ['references', '推荐人'],
  ]

  standardSections.forEach(([sectionId, fallbackTitle]) => {
    const sectionMarkdown = sectionToMarkdown(data, sectionId, fallbackTitle)
    if (sectionMarkdown) {
      lines.push(`\n${sectionMarkdown}`)
    }
  })

  if (data.customSections.length > 0) {
    data.customSections.forEach(customSection => {
      if (customSection.hidden || customSection.items.length === 0) return

      lines.push(`\n## ${customSection.title}`)
      customSection.items.forEach(item => {
        if (item.hidden) return

        if ('content' in item) {
          const text = richToMarkdown(String(item.content || ''))
          if (text) lines.push(`- ${text}`)
          return
        }

        if ('recipient' in item) {
          const coverLetterItem = item as unknown as { recipient?: string; content?: string }
          const recipient = richToMarkdown(String(coverLetterItem.recipient || ''))
          const body = richToMarkdown(String(coverLetterItem.content || ''))
          if (recipient) lines.push(`- ${recipient}`)
          if (body) lines.push(`  - ${body}`)
          return
        }

        const generic = itemMarkdown(item as unknown as Record<string, unknown>, [
          'title',
          'name',
          'company',
          'school',
          'organization',
          'position',
          'period',
          'date',
        ])
        if (generic) {
          lines.push(`- ${generic}`)
        }

        if ('description' in item) {
          const description = richToMarkdown(String((item as { description?: string }).description || ''))
          if (description) {
            lines.push(`  - ${description}`)
          }
        }
      })
    })
  }

  return lines.join('\n')
}

async function migrateResumeIfNeeded(resume: {
  id: string
  userId: string
  title: string
  templateId: string
  mode: ResumeMode
  shareVisibility: ResumeShareVisibility
  shareWithRecruiters: boolean
  content: unknown
  createdAt: Date
  updatedAt: Date
}) {
  const normalized = normalizeResumeContent(resume.content, {
    templateId: resume.templateId,
    withBackup: true,
  })

  const normalizedTemplateId = normalizeTemplateId(resume.templateId)
  normalized.data.metadata.template = normalizedTemplateId

  const needsMigration =
    !isResumeContentV2(resume.content) ||
    resume.templateId !== normalizedTemplateId ||
    resume.mode !== 'form'

  if (!needsMigration) {
    return {
      ...resume,
      templateId: normalizedTemplateId,
      mode: 'form' as ResumeMode,
      content: normalized,
    }
  }

  return prisma.resume.update({
    where: { id: resume.id },
    data: {
      templateId: normalizedTemplateId,
      mode: 'form',
      content: toInputJsonValue(normalized),
    },
  })
}

export async function getResumes(userId: string) {
  return prisma.resume.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getResume(id: string, userId: string) {
  const resume = await prisma.resume.findFirst({
    where: { id, userId },
  })

  if (!resume) {
    return null
  }

  return migrateResumeIfNeeded(resume)
}

export async function createResume(userId: string, input: CreateResumeInput) {
  const normalizedInputTemplate = normalizeTemplateId(input.templateId)
  const template = getTemplate(normalizedInputTemplate)
  if (!template) {
    throw new Error('Template not found')
  }

  return prisma.$transaction(async tx => {
    await assertCanCreateResume(tx, userId)

    const content = input.content
      ? normalizeResumeContent(input.content, {
          templateId: input.templateId,
          withBackup: true,
        })
      : createFreshResumeContent(input.templateId)

    const templateId = normalizedInputTemplate
    content.data.metadata.template = templateId
    if (isHexColor(input.themeColor)) {
      content.data.metadata.design.colors.primary = input.themeColor
    }

    const shareSettings = normalizeShareSettings({
      shareVisibility: input.shareVisibility,
      shareWithRecruiters: input.shareWithRecruiters,
    })

    return tx.resume.create({
      data: {
        userId,
        title: input.title,
        templateId,
        mode: 'form',
        shareVisibility: shareSettings.shareVisibility,
        shareWithRecruiters: shareSettings.shareWithRecruiters,
        content: toInputJsonValue(content),
      },
    })
  })
}

export async function updateResume(id: string, userId: string, input: UpdateResumeInput) {
  const existing = await prisma.resume.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new Error('Resume not found')
  }

  if (input.templateId) {
    const template = getTemplate(normalizeTemplateId(input.templateId))
    if (!template) {
      throw new Error('Template not found')
    }
  }

  const templateId = normalizeTemplateId(input.templateId || existing.templateId)

  const shareSettings = normalizeShareSettings(
    {
      shareVisibility: input.shareVisibility,
      shareWithRecruiters: input.shareWithRecruiters,
    },
    {
      shareVisibility: existing.shareVisibility,
      shareWithRecruiters: existing.shareWithRecruiters,
    },
  )

  let content: ResumeContentV2 | undefined

  if (input.content !== undefined) {
    content = normalizeResumeContent(input.content, {
      templateId,
      withBackup: true,
    })
    content.data.metadata.template = templateId
  } else if (input.templateId !== undefined) {
    content = normalizeResumeContent(existing.content, {
      templateId,
      withBackup: true,
    })
    content.data.metadata.template = templateId
  }

  return prisma.resume.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.templateId !== undefined && { templateId }),
      ...(input.mode !== undefined && { mode: 'form' }),
      ...((input.shareVisibility !== undefined || input.shareWithRecruiters !== undefined)
        ? {
            shareVisibility: shareSettings.shareVisibility,
            shareWithRecruiters: shareSettings.shareWithRecruiters,
          }
        : {}),
      ...(content !== undefined && { content: toInputJsonValue(content) }),
    },
  })
}

export async function duplicateResume(id: string, userId: string) {
  return prisma.$transaction(async tx => {
    const existing = await tx.resume.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      throw new Error('Resume not found')
    }

    await assertCanCreateResume(tx, userId)

    const normalized = normalizeResumeContent(existing.content, {
      templateId: existing.templateId,
      withBackup: true,
    })

    return tx.resume.create({
      data: {
        userId,
        title: `${existing.title} - 副本`,
        templateId: normalizeTemplateId(existing.templateId),
        mode: 'form',
        shareVisibility: RESUME_SHARE_VISIBILITY_PRIVATE,
        shareWithRecruiters: false,
        content: toInputJsonValue(normalized),
      },
    })
  })
}

export async function deleteResume(id: string, userId: string) {
  const existing = await prisma.resume.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new Error('Resume not found')
  }

  return prisma.resume.delete({ where: { id } })
}

export async function exportResume(
  id: string,
  userId: string,
  format: 'md' | 'pdf' | 'docx' | 'img',
): Promise<{ data: string; mimeType: string; filename: string }> {
  const resume = await prisma.resume.findFirst({
    where: { id, userId },
  })

  if (!resume) {
    throw new Error('Resume not found')
  }

  const normalized = await migrateResumeIfNeeded(resume)
  const content = normalizeResumeContent(normalized.content, {
    templateId: normalized.templateId,
    withBackup: true,
  })

  switch (format) {
    case 'md': {
      const markdown = generateMarkdownFromContent(normalized.title, content)
      return {
        data: markdown,
        mimeType: 'text/markdown',
        filename: `${normalized.title}.md`,
      }
    }
    case 'pdf':
      return {
        data: '请在简历编辑页使用“导出 PDF”按钮进行浏览器打印导出。',
        mimeType: 'application/json',
        filename: `${normalized.title}.pdf`,
      }
    case 'docx':
      return {
        data: 'DOCX export coming soon',
        mimeType: 'application/json',
        filename: `${normalized.title}.docx`,
      }
    case 'img':
      return {
        data: '请在简历编辑页使用“导出图片”按钮进行前端导出。',
        mimeType: 'application/json',
        filename: `${normalized.title}.png`,
      }
    default:
      throw new Error('Unsupported format')
  }
}

export async function getPublicResumeView(id: string): Promise<PublicResumeViewResult> {
  const resume = await prisma.resume.findFirst({
    where: { id },
  })

  if (!resume) {
    return {
      status: 'hidden',
      resumeId: id,
      title: '未知简历',
    }
  }

  const shareSettings = normalizeShareSettings(
    {},
    {
      shareVisibility: resume.shareVisibility,
      shareWithRecruiters: resume.shareWithRecruiters,
    },
  )

  if (!canPublicResumeBeViewed(shareSettings)) {
    return {
      status: 'hidden',
      resumeId: resume.id,
      title: resume.title,
    }
  }

  const normalizedResume = await migrateResumeIfNeeded(resume)
  return {
    status: 'visible',
    canDownload: canPublicResumeBeDownloaded(shareSettings),
    resume: {
      id: normalizedResume.id,
      title: normalizedResume.title,
      templateId: normalizedResume.templateId,
      content: normalizedResume.content,
    },
  }
}
