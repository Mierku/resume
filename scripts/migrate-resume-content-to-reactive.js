#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const isDryRun = process.argv.includes('--dry')

const REACTIVE_TEMPLATE_IDS = new Set([
  'template-1',
  'template-2',
  'template-3',
  'template-4',
  'template-5',
  'template-6',
  'template-7',
])

function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function textToHtml(text) {
  const normalized = String(text || '').trim()
  if (!normalized) return ''

  return normalized
    .split(/\n+/)
    .filter(Boolean)
    .map(line => `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
    .join('')
}

function defaultResumeData() {
  return {
    picture: {
      hidden: false,
      url: '',
      size: 80,
      rotation: 0,
      aspectRatio: 1,
      borderRadius: 0,
      borderColor: 'rgba(0, 0, 0, 0.5)',
      borderWidth: 0,
      shadowColor: 'rgba(0, 0, 0, 0.5)',
      shadowWidth: 0,
    },
    basics: {
      name: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      website: { url: '', label: '' },
      customFields: [],
    },
    summary: {
      title: '',
      columns: 1,
      hidden: false,
      content: '',
    },
    sections: {
      profiles: { title: '', columns: 1, hidden: false, items: [] },
      experience: { title: '', columns: 1, hidden: false, items: [] },
      education: { title: '', columns: 1, hidden: false, items: [] },
      projects: { title: '', columns: 1, hidden: false, items: [] },
      skills: { title: '', columns: 1, hidden: false, items: [] },
      languages: { title: '', columns: 1, hidden: false, items: [] },
      interests: { title: '', columns: 1, hidden: false, items: [] },
      awards: { title: '', columns: 1, hidden: false, items: [] },
      certifications: { title: '', columns: 1, hidden: false, items: [] },
      publications: { title: '', columns: 1, hidden: false, items: [] },
      volunteer: { title: '', columns: 1, hidden: false, items: [] },
      references: { title: '', columns: 1, hidden: false, items: [] },
    },
    customSections: [],
    metadata: {
      template: 'template-1',
      layout: {
        sidebarWidth: 35,
        pages: [
          {
            fullWidth: false,
            main: ['profiles', 'summary', 'education', 'experience', 'projects', 'volunteer', 'references'],
            sidebar: ['skills', 'certifications', 'awards', 'languages', 'interests', 'publications'],
          },
        ],
      },
      css: { enabled: false, value: '' },
      page: {
        gapX: 4,
        gapY: 6,
        marginX: 14,
        marginY: 12,
        format: 'a4',
        locale: 'zh-CN',
        hideIcons: false,
      },
      design: {
        colors: {
          primary: 'rgba(220, 38, 38, 1)',
          text: 'rgba(0, 0, 0, 1)',
          background: 'rgba(255, 255, 255, 1)',
        },
        level: {
          icon: 'star',
          type: 'circle',
        },
      },
      typography: {
        body: {
          fontFamily: 'Noto Sans SC',
          fontWeights: ['400', '500'],
          fontSize: 10,
          lineHeight: 1.5,
        },
        heading: {
          fontFamily: 'Noto Sans SC',
          fontWeights: ['600'],
          fontSize: 14,
          lineHeight: 1.5,
        },
      },
      notes: '',
    },
  }
}

function fromDataSource(dataSource, data) {
  if (!dataSource) return

  const basics = dataSource.basics || {}
  const intention = dataSource.intention || {}

  data.basics.name = String(basics.nameZh || basics.nameEn || basics.name || '')
  data.basics.email = String(basics.email || '')
  data.basics.phone = String(basics.phone || '')
  data.basics.location = String(basics.location || '')
  data.basics.headline = String(intention.position || basics.headline || '')

  const website = String(basics.website || '')
  data.basics.website = { url: website, label: website }

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

  data.sections.education.items = (dataSource.education || []).map(item => ({
    id: String(item.id || createId()),
    hidden: false,
    school: String(item.school || ''),
    degree: String(item.degree || ''),
    area: String(item.major || ''),
    grade: String(item.grade || ''),
    location: String(item.location || ''),
    period: `${String(item.startDate || '')} - ${String(item.endDate || '')}`.replace(/^\s*-\s*$/, ''),
    website: { url: String(item.website || ''), label: String(item.website || '') },
    description: textToHtml(item.description || ''),
  }))

  data.sections.experience.items = (dataSource.work || []).map(item => ({
    id: String(item.id || createId()),
    hidden: false,
    company: String(item.company || ''),
    position: String(item.position || ''),
    location: String(item.location || ''),
    period: `${String(item.startDate || '')} - ${String(item.endDate || '')}`.replace(/^\s*-\s*$/, ''),
    website: { url: String(item.website || ''), label: String(item.website || '') },
    description: textToHtml(item.description || ''),
  }))

  data.sections.projects.items = (dataSource.projects || []).map(item => ({
    id: String(item.id || createId()),
    hidden: false,
    name: String(item.name || ''),
    period: `${String(item.startDate || '')} - ${String(item.endDate || '')}`.replace(/^\s*-\s*$/, ''),
    website: { url: String(item.url || item.website || ''), label: String(item.url || item.website || '') },
    description: textToHtml(item.description || ''),
  }))

  data.sections.skills.items = (dataSource.skills || []).map(skill => ({
    id: createId(),
    hidden: false,
    icon: 'code',
    name: String(skill || ''),
    proficiency: '',
    level: 0,
    keywords: [],
  }))
}

function fromLegacyContent(content, data) {
  if (!content || typeof content !== 'object') return

  const styles = content.styles || {}
  const formData = content.formData || {}

  if (styles.photoUrl) {
    data.picture.url = String(styles.photoUrl)
  }

  if (styles.fontSize) {
    data.metadata.typography.body.fontSize = Math.max(6, Math.min(24, Number(styles.fontSize)))
  }

  if (styles.lineHeight) {
    data.metadata.typography.body.lineHeight = Math.max(0.8, Math.min(3, Number(styles.lineHeight)))
  }

  if (styles.fontFamily) {
    data.metadata.typography.body.fontFamily = String(styles.fontFamily)
    data.metadata.typography.heading.fontFamily = String(styles.fontFamily)
  }

  const basics = formData.basics || {}
  const intention = formData.intention || {}

  if (Object.keys(basics).length > 0 || Object.keys(intention).length > 0) {
    data.basics.name = String(basics.nameZh || basics.nameEn || basics.name || data.basics.name)
    data.basics.email = String(basics.email || data.basics.email)
    data.basics.phone = String(basics.phone || data.basics.phone)
    data.basics.location = String(basics.location || data.basics.location)
    data.basics.headline = String(intention.position || basics.headline || data.basics.headline)

    if (basics.website) {
      const website = String(basics.website)
      data.basics.website = { url: website, label: website }
    }
  }

  if (formData.summary) {
    data.summary.content = textToHtml(formData.summary)
  } else if (content.markdownText) {
    data.summary.content = textToHtml(content.markdownText)
  }

  const education = ((formData.education || {}).education || [])
  if (Array.isArray(education) && education.length > 0) {
    data.sections.education.items = education.map(item => ({
      id: String(item.id || createId()),
      hidden: false,
      school: String(item.school || ''),
      degree: String(item.degree || ''),
      area: String(item.major || ''),
      grade: '',
      location: String(item.location || ''),
      period: `${String(item.startDate || '')} - ${String(item.endDate || '')}`.replace(/^\s*-\s*$/, ''),
      website: { url: '', label: '' },
      description: textToHtml(item.description || ''),
    }))
  }

  const work = ((formData.work || {}).work || [])
  if (Array.isArray(work) && work.length > 0) {
    data.sections.experience.items = work.map(item => ({
      id: String(item.id || createId()),
      hidden: false,
      company: String(item.company || ''),
      position: String(item.position || ''),
      location: String(item.location || ''),
      period: `${String(item.startDate || '')} - ${String(item.endDate || '')}`.replace(/^\s*-\s*$/, ''),
      website: { url: '', label: '' },
      description: textToHtml(item.description || ''),
    }))
  }

  const projects = ((formData.projects || {}).projects || [])
  if (Array.isArray(projects) && projects.length > 0) {
    data.sections.projects.items = projects.map(item => ({
      id: String(item.id || createId()),
      hidden: false,
      name: String(item.name || ''),
      period: `${String(item.startDate || '')} - ${String(item.endDate || '')}`.replace(/^\s*-\s*$/, ''),
      website: { url: String(item.url || ''), label: String(item.url || '') },
      description: textToHtml(item.description || ''),
    }))
  }

  const skills = ((formData.skills || {}).skills || [])
  if (Array.isArray(skills) && skills.length > 0) {
    data.sections.skills.items = skills.map(skill => ({
      id: createId(),
      hidden: false,
      icon: 'code',
      name: String(skill || ''),
      proficiency: '',
      level: 0,
      keywords: [],
    }))
  }

  const customModules = content.customModules || []
  if (Array.isArray(customModules) && customModules.length > 0) {
    data.customSections = customModules
      .map(module => {
        const moduleData = formData[module.id] || {}
        const text = String(moduleData.content || '').trim()
        if (!text) return null

        return {
          id: String(module.id || createId()),
          type: 'summary',
          title: String(module.label || '自定义板块'),
          columns: 1,
          hidden: false,
          items: [
            {
              id: createId(),
              hidden: false,
              content: textToHtml(text),
            },
          ],
        }
      })
      .filter(Boolean)
  }
}

function convertToV2(content, dataSource) {
  const data = defaultResumeData()

  fromDataSource(dataSource, data)
  fromLegacyContent(content, data)

  return {
    version: 2,
    builder: 'reactive-core',
    data,
    legacyBackup: content,
    migratedAt: new Date().toISOString(),
  }
}

async function run() {
  console.log(`\n[resume:migrate] start (${isDryRun ? 'dry-run' : 'apply'})\n`)

  const resumes = await prisma.resume.findMany({
    include: { dataSource: true },
    orderBy: { createdAt: 'asc' },
  })

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const resume of resumes) {
    try {
      const content = resume.content
      const isV2 = !!(
        content &&
        typeof content === 'object' &&
        content.version === 2 &&
        content.builder === 'reactive-core'
      )

      if (isV2 && REACTIVE_TEMPLATE_IDS.has(resume.templateId) && resume.mode === 'form') {
        skipped += 1
        continue
      }

      const migratedContent = isV2 ? content : convertToV2(content, resume.dataSource)

      if (isV2) {
        migratedContent.data.metadata.template = 'template-1'
      }

      if (isDryRun) {
        console.log(`[dry] ${resume.id} | ${resume.title}`)
      } else {
        await prisma.resume.update({
          where: { id: resume.id },
          data: {
            templateId: 'template-1',
            mode: 'form',
            content: migratedContent,
          },
        })
      }

      migrated += 1
    } catch (error) {
      failed += 1
      console.error(`[error] ${resume.id} | ${resume.title}`, error)
    }
  }

  console.log('\n[resume:migrate] done')
  console.log(`  total:    ${resumes.length}`)
  console.log(`  migrated: ${migrated}`)
  console.log(`  skipped:  ${skipped}`)
  console.log(`  failed:   ${failed}\n`)
}

run()
  .catch(error => {
    console.error('[resume:migrate] fatal', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
