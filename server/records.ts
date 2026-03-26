import { prisma } from '@/lib/prisma'
import { Prisma, RecordStatus } from '@prisma/client'

export interface UpsertTrackingRecordInput {
  url: string
  host: string
  title: string
  companyName?: string
  location?: string
  salaryMin?: string
  salaryMax?: string
  faviconUrl?: string
  status?: RecordStatus
}

export interface UpdateTrackingRecordInput {
  url?: string
  status?: RecordStatus
  title?: string
  host?: string
  companyName?: string
  location?: string
  salaryMin?: string
  salaryMax?: string
  faviconUrl?: string
}

export interface RecordFilter {
  status?: RecordStatus
  query?: string
  limit?: number
  offset?: number
}

const OPTIONAL_RECORD_COLUMNS = ['companyName', 'location', 'salaryMin', 'salaryMax'] as const

type OptionalRecordColumn = (typeof OPTIONAL_RECORD_COLUMNS)[number]

interface TrackingRecordRow {
  id: string
  url: string
  host: string
  title: string
  faviconUrl: string | null
  status: RecordStatus
  createdAt: Date
  updatedAt: Date
  companyName?: string | null
  location?: string | null
  salaryMin?: string | null
  salaryMax?: string | null
}

async function getAvailableRecordColumns(): Promise<Set<OptionalRecordColumn>> {
  try {
    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'Record'
    `)

    return new Set(
      rows
        .map(row => row.column_name)
        .filter((columnName): columnName is OptionalRecordColumn =>
          OPTIONAL_RECORD_COLUMNS.includes(columnName as OptionalRecordColumn)
        )
    )
  } catch (error) {
    console.warn('Failed to inspect Record columns, falling back to base fields:', error)
    return new Set<OptionalRecordColumn>()
  }
}

function buildRecordSelect(columns: Set<OptionalRecordColumn>): Prisma.RecordSelect {
  return {
    id: true,
    url: true,
    host: true,
    title: true,
    faviconUrl: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    ...(columns.has('companyName') ? { companyName: true } : {}),
    ...(columns.has('location') ? { location: true } : {}),
    ...(columns.has('salaryMin') ? { salaryMin: true } : {}),
    ...(columns.has('salaryMax') ? { salaryMax: true } : {}),
  }
}

function buildRecordMetadataData(
  input: Pick<UpsertTrackingRecordInput, OptionalRecordColumn>,
  columns: Set<OptionalRecordColumn>
) {
  return {
    ...(columns.has('companyName') && input.companyName !== undefined ? { companyName: input.companyName } : {}),
    ...(columns.has('location') && input.location !== undefined ? { location: input.location } : {}),
    ...(columns.has('salaryMin') && input.salaryMin !== undefined ? { salaryMin: input.salaryMin } : {}),
    ...(columns.has('salaryMax') && input.salaryMax !== undefined ? { salaryMax: input.salaryMax } : {}),
  }
}

export async function getRecords(userId: string, filter: RecordFilter = {}) {
  const { status, query, limit = 20, offset = 0 } = filter
  const availableColumns = await getAvailableRecordColumns()

  const where: Prisma.RecordWhereInput = { userId }

  if (status) {
    where.status = status
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { host: { contains: query, mode: 'insensitive' } },
      { url: { contains: query, mode: 'insensitive' } },
    ]

    if (availableColumns.has('companyName')) {
      where.OR.unshift({ companyName: { contains: query, mode: 'insensitive' } })
    }

    if (availableColumns.has('location')) {
      where.OR.push({ location: { contains: query, mode: 'insensitive' } })
    }
  }

  const [records, total] = await Promise.all([
    prisma.record.findMany({
      where,
      select: buildRecordSelect(availableColumns),
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.record.count({ where }),
  ])

  return { records: records as TrackingRecordRow[], total, limit, offset }
}

export async function getRecord(id: string, userId: string) {
  const availableColumns = await getAvailableRecordColumns()

  return prisma.record.findFirst({
    where: { id, userId },
    select: buildRecordSelect(availableColumns),
  }) as Promise<TrackingRecordRow | null>
}

export async function createOrUpdateRecord(userId: string, input: UpsertTrackingRecordInput) {
  const availableColumns = await getAvailableRecordColumns()
  const metadata = buildRecordMetadataData(input, availableColumns)

  return prisma.record.upsert({
    where: {
      userId_url: {
        userId,
        url: input.url,
      },
    },
    create: {
      userId,
      url: input.url,
      host: input.host,
      title: input.title,
      faviconUrl: input.faviconUrl,
      status: input.status || 'pending',
      ...metadata,
    },
    update: {
      host: input.host,
      title: input.title,
      faviconUrl: input.faviconUrl,
      ...(input.status && { status: input.status }),
      ...metadata,
    },
    select: buildRecordSelect(availableColumns),
  }) as Promise<TrackingRecordRow>
}

export async function updateRecord(id: string, userId: string, input: UpdateTrackingRecordInput) {
  const availableColumns = await getAvailableRecordColumns()
  const existing = await prisma.record.findFirst({
    where: { id, userId },
    select: { id: true },
  })

  if (!existing) {
    throw new Error('Record not found')
  }

  const metadata = buildRecordMetadataData(input, availableColumns)

  return prisma.record.update({
    where: { id },
    data: {
      ...(input.url !== undefined && { url: input.url }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.host !== undefined && { host: input.host }),
      ...(input.faviconUrl !== undefined && { faviconUrl: input.faviconUrl }),
      ...metadata,
    },
    select: buildRecordSelect(availableColumns),
  }) as Promise<TrackingRecordRow>
}

export async function deleteRecord(id: string, userId: string) {
  const existing = await prisma.record.findFirst({
    where: { id, userId },
    select: { id: true },
  })

  if (!existing) {
    throw new Error('Record not found')
  }

  return prisma.record.delete({
    where: { id },
    select: { id: true },
  })
}

export async function exportRecordsCSV(userId: string, filter: RecordFilter = {}): Promise<string> {
  const { records } = await getRecords(userId, { ...filter, limit: 10000, offset: 0 })

  const headers = [
    'Company Name',
    'Position Title',
    'Location',
    'Salary Min',
    'Salary Max',
    'URL',
    'Host',
    'Status',
    'Created At',
    'Updated At',
  ]
  const rows = records.map((record) => [
    record.companyName || '',
    record.title,
    record.location || '',
    record.salaryMin || '',
    record.salaryMax || '',
    record.url,
    record.host,
    record.status,
    record.createdAt.toISOString(),
    record.updatedAt.toISOString(),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  return csvContent
}

export async function getRecordStats(userId: string) {
  const stats = await prisma.record.groupBy({
    by: ['status'],
    where: { userId },
    _count: { id: true },
  })

  const total = await prisma.record.count({ where: { userId } })

  return {
    total,
    byStatus: stats.reduce((acc, item) => {
      acc[item.status] = item._count.id
      return acc
    }, {} as Record<string, number>),
  }
}
