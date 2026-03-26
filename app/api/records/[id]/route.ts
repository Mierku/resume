import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/session'
import { getRecord, updateRecord, deleteRecord } from '@/server/records'

const updateSchema = z.object({
  url: z.string().url('无效的链接').optional(),
  status: z.enum(['pending', 'submitted', 'recorded', 'abandoned']).optional(),
  title: z.string().optional(),
  host: z.string().optional(),
  companyName: z.string().optional(),
  location: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  faviconUrl: z.string().optional(),
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
    const record = await getRecord(id, user.id)
    
    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }

    return NextResponse.json({ record })
  } catch (error) {
    console.error('Get record error:', error)
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

    const record = await updateRecord(id, user.id, data)
    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: '该链接已存在，不能重复保存' }, { status: 409 })
    }
    if (error instanceof Error && error.message === 'Record not found') {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }
    console.error('Update record error:', error)
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
    await deleteRecord(id, user.id)
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Record not found') {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 })
    }
    console.error('Delete record error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
