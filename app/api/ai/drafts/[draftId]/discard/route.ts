import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/ai/drafts/:draftId/discard
 *
 * 放弃 AI 草稿（删除草稿记录）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const { draftId } = await params

    const draft = await prisma.resume.findFirst({
      where: { id: draftId, userId: user.id },
      select: { id: true },
    })
    if (!draft) {
      return NextResponse.json({ success: false, error: '草稿不存在或无权访问' }, { status: 404 })
    }

    await prisma.resume.delete({
      where: { id: draft.id },
    })

    return NextResponse.json({
      success: true,
      data: {
        draftId: draft.id,
      },
    })
  } catch (error) {
    console.error('[AI Draft] discard error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '放弃草稿失败',
      },
      { status: 500 },
    )
  }
}
