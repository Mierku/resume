import { prisma } from '@/lib/prisma'
import { LangMode, type Prisma } from '@prisma/client'

export interface DataSourceBasics {
  nameZh?: string
  nameEn?: string
  email?: string
  phone?: string
  location?: string
  website?: string
  linkedin?: string
  github?: string
}

export interface DataSourceIntention {
  position?: string
  location?: string
  salaryMin?: number
  salaryMax?: number
  availableDate?: string
}

export interface EducationEntry {
  id: string
  school: string
  degree: string
  major: string
  startDate: string
  endDate: string
  description?: string
}

export interface WorkEntry {
  id: string
  company: string
  position: string
  startDate: string
  endDate: string
  description: string
}

export interface ProjectEntry {
  id: string
  name: string
  role?: string
  startDate?: string
  endDate?: string
  description: string
  technologies?: string[]
  url?: string
}

export interface CreateDataSourceInput {
  name: string
  langMode?: LangMode
  basics?: DataSourceBasics
  intention?: DataSourceIntention
  education?: EducationEntry[]
  work?: WorkEntry[]
  projects?: ProjectEntry[]
  skills?: string[]
  summaryZh?: string
  summaryEn?: string
}

export type UpdateDataSourceInput = Partial<CreateDataSourceInput>

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

export async function getDataSources(userId: string) {
  return prisma.dataSource.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getDataSource(id: string, userId: string) {
  return prisma.dataSource.findFirst({
    where: { id, userId },
  })
}

export async function createDataSource(userId: string, input: CreateDataSourceInput) {
  const dataSource = await prisma.dataSource.create({
    data: {
      userId,
      name: input.name,
      langMode: input.langMode || 'zh',
      basics: toInputJsonValue(input.basics || {}),
      intention: toInputJsonValue(input.intention || null),
      education: toInputJsonValue(input.education || []),
      work: toInputJsonValue(input.work || []),
      projects: toInputJsonValue(input.projects || []),
      skills: toInputJsonValue(input.skills || []),
      summaryZh: input.summaryZh,
      summaryEn: input.summaryEn,
    },
  })

  // If this is the first data source, set it as default
  const count = await prisma.dataSource.count({ where: { userId } })
  if (count === 1) {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultDataSourceId: dataSource.id },
    })
  }

  return dataSource
}

export async function updateDataSource(id: string, userId: string, input: UpdateDataSourceInput) {
  // Verify ownership
  const existing = await prisma.dataSource.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new Error('Data source not found')
  }

  return prisma.dataSource.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.langMode !== undefined && { langMode: input.langMode }),
      ...(input.basics !== undefined && { basics: toInputJsonValue(input.basics) }),
      ...(input.intention !== undefined && { intention: toInputJsonValue(input.intention) }),
      ...(input.education !== undefined && { education: toInputJsonValue(input.education) }),
      ...(input.work !== undefined && { work: toInputJsonValue(input.work) }),
      ...(input.projects !== undefined && { projects: toInputJsonValue(input.projects) }),
      ...(input.skills !== undefined && { skills: toInputJsonValue(input.skills) }),
      ...(input.summaryZh !== undefined && { summaryZh: input.summaryZh }),
      ...(input.summaryEn !== undefined && { summaryEn: input.summaryEn }),
    },
  })
}

export async function deleteDataSource(id: string, userId: string) {
  // Verify ownership
  const existing = await prisma.dataSource.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new Error('Data source not found')
  }

  // If this was the default, clear default
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.defaultDataSourceId === id) {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultDataSourceId: null },
    })
  }

  return prisma.dataSource.delete({ where: { id } })
}

export async function setDefaultDataSource(id: string, userId: string) {
  // Verify ownership
  const existing = await prisma.dataSource.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    throw new Error('Data source not found')
  }

  return prisma.user.update({
    where: { id: userId },
    data: { defaultDataSourceId: id },
  })
}

export async function getDefaultDataSource(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { dataSources: true },
  })

  if (!user) return null

  if (user.defaultDataSourceId) {
    return user.dataSources.find(ds => ds.id === user.defaultDataSourceId) || null
  }

  // Return first data source if no default set
  return user.dataSources[0] || null
}
