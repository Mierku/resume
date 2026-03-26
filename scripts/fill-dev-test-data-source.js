const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return

  const content = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separatorIndex = line.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = line.slice(0, separatorIndex).trim()
    if (process.env[key] !== undefined) continue

    let value = line.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

function buildDevTestDataSource(email) {
  const fixture = require('../lib/dev-test-data-source.json')
  return {
    ...fixture,
    basics: {
      ...fixture.basics,
      email,
    },
  }
}

async function main() {
  loadEnvFile()

  const prisma = new PrismaClient()
  const defaultEmail = process.env.DEV_TEST_USER_EMAIL || 'dev@immersive.local'
  const defaultName = process.env.DEV_TEST_USER_NAME || '开发测试账号'
  const payload = buildDevTestDataSource(defaultEmail)

  try {
    const result = await prisma.$transaction(async tx => {
      const user = await tx.user.upsert({
        where: { email: defaultEmail },
        update: {
          name: defaultName,
          emailVerified: new Date(),
          onboardingCompleted: true,
        },
        create: {
          email: defaultEmail,
          name: defaultName,
          emailVerified: new Date(),
          onboardingCompleted: true,
        },
      })

      const existing = await tx.dataSource.findFirst({
        where: {
          userId: user.id,
          name: payload.name,
        },
      })

      const dataSource = existing
        ? await tx.dataSource.update({
            where: { id: existing.id },
            data: {
              name: payload.name,
              langMode: payload.langMode,
              basics: payload.basics,
              intention: payload.intention,
              education: payload.education,
              work: payload.work,
              projects: payload.projects,
              skills: payload.skills,
              summaryZh: payload.summaryZh,
              summaryEn: payload.summaryEn,
            },
          })
        : await tx.dataSource.create({
            data: {
              userId: user.id,
              name: payload.name,
              langMode: payload.langMode,
              basics: payload.basics,
              intention: payload.intention,
              education: payload.education,
              work: payload.work,
              projects: payload.projects,
              skills: payload.skills,
              summaryZh: payload.summaryZh,
              summaryEn: payload.summaryEn,
            },
          })

      await tx.user.update({
        where: { id: user.id },
        data: {
          defaultDataSourceId: dataSource.id,
          onboardingCompleted: true,
        },
      })

      return {
        userId: user.id,
        dataSourceId: dataSource.id,
        email: defaultEmail,
      }
    })

    console.log(
      JSON.stringify(
        {
          ok: true,
          ...result,
        },
        null,
        2,
      ),
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
