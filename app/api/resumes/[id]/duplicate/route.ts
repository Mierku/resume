import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { duplicateResume } from '@/server/resumes'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id } = await params
    const resume = await duplicateResume(id, user.id)
    return NextResponse.json({ resume }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'Resume not found') {
      return NextResponse.json({ error: '简历不存在' }, { status: 404 })
    }
    console.error('Duplicate resume error:', error)
    return NextResponse.json({ error: '复制失败' }, { status: 500 })
  }
}
