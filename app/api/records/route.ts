import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { RecordStatus } from '@prisma/client'
import { getCurrentUser } from '@/lib/session'
import { createOrUpdateRecord, getRecords } from '@/server/records'

const createSchema = z.object({
  url: z.string().url('无效的URL'),
  host: z.string().min(1),
  title: z.string().min(1),
  companyName: z.string().optional(),
  location: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  faviconUrl: z.string().optional(),
  status: z.enum(['pending', 'submitted', 'recorded', 'abandoned']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as RecordStatus | null
    const query = searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await getRecords(user.id, {
      status: status || undefined,
      query: query || undefined,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get records error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const data = createSchema.parse(body)

    const record = await createOrUpdateRecord(user.id, data)
    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create record error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
