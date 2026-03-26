import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { getDataSources, createDataSource } from '@/server/dataSources'

const createSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  langMode: z.enum(['zh', 'en']).optional(),
  basics: z.record(z.any()).optional(),
  intention: z.record(z.any()).optional(),
  education: z.array(z.any()).optional(),
  work: z.array(z.any()).optional(),
  projects: z.array(z.any()).optional(),
  skills: z.array(z.string()).optional(),
  summaryZh: z.string().optional(),
  summaryEn: z.string().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const dataSources = await getDataSources(user.id)
    return NextResponse.json({ dataSources })
  } catch (error) {
    console.error('Get data sources error:', error)
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

    const dataSource = await createDataSource(user.id, data)
    return NextResponse.json({ dataSource }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create data source error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
