import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { deleteJobSite } from '@/server/jobs'

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
    await deleteJobSite(id, user.id)
    return NextResponse.json({ message: '删除成功' })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Cannot delete built-in job site') {
        return NextResponse.json({ error: '不能删除内置网站' }, { status: 400 })
      }
      if (error.message === 'Job site not found') {
        return NextResponse.json({ error: '网站不存在' }, { status: 404 })
      }
    }
    console.error('Delete job site error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
