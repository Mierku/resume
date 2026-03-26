import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { exportResume } from '@/server/resumes'

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
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') as 'md' | 'pdf' | 'docx' | 'img' || 'md'

    const result = await exportResume(id, user.id, format)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === 'Resume not found') {
      return NextResponse.json({ error: '简历不存在' }, { status: 404 })
    }
    console.error('Export resume error:', error)
    return NextResponse.json({ error: '导出失败' }, { status: 500 })
  }
}
