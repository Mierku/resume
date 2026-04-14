import { PrismaClient } from '@prisma/client'

function printUsage() {
  console.log('Usage: node scripts/promote-admin.mjs --email <email> [--role admin|super_admin]')
}

function parseArgs(argv) {
  const result = {
    email: '',
    role: 'admin',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]

    if (current === '--email') {
      result.email = String(argv[index + 1] || '').trim().toLowerCase()
      index += 1
      continue
    }

    if (current === '--role') {
      const nextRole = String(argv[index + 1] || '').trim()
      if (nextRole === 'admin' || nextRole === 'super_admin') {
        result.role = nextRole
      }
      index += 1
    }
  }

  return result
}

const { email, role } = parseArgs(process.argv.slice(2))

if (!email) {
  printUsage()
  process.exit(1)
}

const prisma = new PrismaClient()

try {
  const user = await prisma.user.update({
    where: { email },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  console.log(`Updated ${user.email || user.id} to role=${user.role}`)
} catch (error) {
  console.error('Failed to promote admin:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
