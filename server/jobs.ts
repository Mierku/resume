import { prisma } from '@/lib/prisma'
import { BUILT_IN_JOB_SITES } from '@/lib/constants'

interface CreateJobSiteInput {
  name: string
  url: string
  description?: string
  region?: string
}

export async function getJobSites(userId: string) {
  // Get user's custom sites
  const customSites = await prisma.jobSite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  // Combine with built-in sites
  const builtInWithFlag = BUILT_IN_JOB_SITES.map(site => ({
    ...site,
    id: `builtin-${site.name}`,
    userId,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  return [...builtInWithFlag, ...customSites]
}

async function getJobSite(id: string, userId: string) {
  if (id.startsWith('builtin-')) {
    const name = id.replace('builtin-', '')
    const site = BUILT_IN_JOB_SITES.find(s => s.name === name)
    if (site) {
      return {
        ...site,
        id,
        userId,
        isBuiltIn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
    return null
  }

  return prisma.jobSite.findFirst({
    where: { id, userId },
  })
}

export async function createJobSite(userId: string, input: CreateJobSiteInput) {
  return prisma.jobSite.create({
    data: {
      userId,
      name: input.name,
      url: input.url,
      description: input.description,
      region: input.region,
      isBuiltIn: false,
    },
  })
}

async function updateJobSite(id: string, userId: string, input: Partial<CreateJobSiteInput>) {
  // Can't update built-in sites
  if (id.startsWith('builtin-')) {
    throw new Error('Cannot update built-in job site')
  }

  const existing = await prisma.jobSite.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new Error('Job site not found')
  }

  return prisma.jobSite.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.url !== undefined && { url: input.url }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.region !== undefined && { region: input.region }),
    },
  })
}

export async function deleteJobSite(id: string, userId: string) {
  // Can't delete built-in sites
  if (id.startsWith('builtin-')) {
    throw new Error('Cannot delete built-in job site')
  }

  const existing = await prisma.jobSite.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new Error('Job site not found')
  }

  return prisma.jobSite.delete({ where: { id } })
}

function getRegions() {
  const regions = new Set<string>()
  BUILT_IN_JOB_SITES.forEach(site => {
    if (site.region) regions.add(site.region)
  })
  return Array.from(regions)
}
