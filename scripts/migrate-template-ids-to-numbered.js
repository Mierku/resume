#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const isDryRun = process.argv.includes('--dry')

const ACTIVE_TEMPLATE_IDS = new Set([
  'template-1',
  'template-2',
  'template-3',
  'template-4',
  'template-5',
])

const LEGACY_TO_NUMBERED_TEMPLATE_MAP = new Map([
  ['azurill', 'template-1'],
  ['bronzor', 'template-1'],
  ['chikorita', 'template-1'],
  ['ditgar', 'template-1'],
  ['ditto', 'template-1'],
  ['gengar', 'template-1'],
  ['glalie', 'template-1'],
  ['kakuna', 'template-1'],
  ['lapras', 'template-1'],
  ['leafish', 'template-1'],
  ['onyx', 'template-1'],
  ['pikachu', 'template-1'],
  ['rhyhorn', 'template-1'],
  ['classic', 'template-1'],
  ['modern', 'template-1'],
  ['tech', 'template-1'],
  ['creative', 'template-1'],
])

function normalizeTemplateId(input) {
  if (typeof input !== 'string' || !input.trim()) {
    return 'template-1'
  }

  if (ACTIVE_TEMPLATE_IDS.has(input)) {
    return input
  }

  if (LEGACY_TO_NUMBERED_TEMPLATE_MAP.has(input)) {
    return LEGACY_TO_NUMBERED_TEMPLATE_MAP.get(input)
  }

  return 'template-1'
}

function normalizeV2ContentTemplate(content, fallbackTemplateId) {
  if (!content || typeof content !== 'object') {
    return {
      changed: false,
      content,
    }
  }

  if (content.version !== 2 || content.builder !== 'reactive-core') {
    return {
      changed: false,
      content,
    }
  }

  const metadataTemplate = content?.data?.metadata?.template
  const normalizedTemplate = normalizeTemplateId(metadataTemplate || fallbackTemplateId)

  if (metadataTemplate === normalizedTemplate) {
    return {
      changed: false,
      content,
    }
  }

  const next = structuredClone(content)
  next.data.metadata.template = normalizedTemplate

  return {
    changed: true,
    content: next,
  }
}

async function run() {
  console.log(`\n[resume:template:migrate] start (${isDryRun ? 'dry-run' : 'apply'})\n`)

  const resumes = await prisma.resume.findMany({
    orderBy: { createdAt: 'asc' },
  })

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const resume of resumes) {
    try {
      const normalizedTemplateId = normalizeTemplateId(resume.templateId)
      const normalizedContentResult = normalizeV2ContentTemplate(resume.content, normalizedTemplateId)

      const needsTemplateUpdate = resume.templateId !== normalizedTemplateId
      const needsContentUpdate = normalizedContentResult.changed

      if (!needsTemplateUpdate && !needsContentUpdate) {
        skipped += 1
        continue
      }

      if (isDryRun) {
        const changeType = [needsTemplateUpdate ? 'templateId' : '', needsContentUpdate ? 'content.metadata.template' : '']
          .filter(Boolean)
          .join(' + ')
        console.log(`[dry] ${resume.id} | ${resume.title} | ${changeType}`)
      } else {
        await prisma.resume.update({
          where: { id: resume.id },
          data: {
            templateId: normalizedTemplateId,
            ...(needsContentUpdate ? { content: normalizedContentResult.content } : {}),
          },
        })
      }

      migrated += 1
    } catch (error) {
      failed += 1
      console.error(`[error] ${resume.id} | ${resume.title}`, error)
    }
  }

  console.log('\n[resume:template:migrate] done')
  console.log(`  total:    ${resumes.length}`)
  console.log(`  migrated: ${migrated}`)
  console.log(`  skipped:  ${skipped}`)
  console.log(`  failed:   ${failed}\n`)
}

run()
  .catch(error => {
    console.error('[resume:template:migrate] fatal', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
