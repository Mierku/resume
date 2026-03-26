import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { getDataSource, updateDataSource, deleteDataSource } from '@/server/dataSources'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
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
    const dataSource = await getDataSource(id, user.id)
    
    if (!dataSource) {
      return NextResponse.json({ error: '数据源不存在' }, { status: 404 })
    }

    return NextResponse.json({ dataSource })
  } catch (error) {
    console.error('Get data source error:', error)
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

    const dataSource = await updateDataSource(id, user.id, data)
    return NextResponse.json({ dataSource })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error instanceof Error && error.message === 'Data source not found') {
      return NextResponse.json({ error: '数据源不存在' }, { status: 404 })
    }
    console.error('Update data source error:', error)
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
    await deleteDataSource(id, user.id)
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    if (error instanceof Error && error.message === 'Data source not found') {
      return NextResponse.json({ error: '数据源不存在' }, { status: 404 })
    }
    console.error('Delete data source error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
