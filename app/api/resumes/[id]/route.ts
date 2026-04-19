import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { getResume, updateResume, deleteResume } from '@/server/resumes'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  templateId: z.string().optional(),
  dataSourceId: z.string().nullable().optional(),
  mode: z.enum(['form', 'markdown']).optional(),
  shareVisibility: z.enum(['private', 'public']).optional(),
  shareWithRecruiters: z.boolean().optional(),
  content: z.record(z.any()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const resume = await getResume(id, user.id)
    
    if (!resume) {
      return NextResponse.json({ error: '简历不存在' }, { status: 404 })
    }

    return NextResponse.json({ resume })
  } catch (error) {
    console.error('Get resume error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateSchema.parse(body)

    const resume = await updateResume(id, user.id, data)
    return NextResponse.json({ resume })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Resume not found') {
      return NextResponse.json({ error: '简历不存在' }, { status: 404 })
    }
    console.error('Update resume error:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    await deleteResume(id, user.id)
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Resume not found') {
      return NextResponse.json({ error: '简历不存在' }, { status: 404 })
    }
    console.error('Delete resume error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
