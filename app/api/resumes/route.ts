import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { getResumes, createResume } from '@/server/resumes'

const createSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  templateId: z.string().min(1, '请选择模板'),
  dataSourceId: z.string().nullable().optional(),
  themeColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, '主题颜色格式不正确')
    .nullable()
    .optional(),
  mode: z.enum(['form', 'markdown']).optional(),
  content: z.record(z.any()).optional(),
})

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const resumes = await getResumes(user.id)
    return NextResponse.json({ resumes })
  } catch (error) {
    console.error('Get resumes error:', error)
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

    const resume = await createResume(user.id, {
      ...data,
      dataSourceId: data.dataSourceId || undefined,
      themeColor: data.themeColor || undefined,
    })
    return NextResponse.json({ resume }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create resume error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}
