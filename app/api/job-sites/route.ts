import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { getJobSites, createJobSite } from '@/server/jobs'

const createSchema = z.object({
  name: z.string().min(1, '名称不能为空'),
  url: z.string().url('请输入有效的URL'),
  description: z.string().optional(),
  region: z.string().optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const sites = await getJobSites(user.id)
    return NextResponse.json({ sites })
  } catch (error) {
    console.error('Get job sites error:', error)
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

    const site = await createJobSite(user.id, data)
    return NextResponse.json({ site }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create job site error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
