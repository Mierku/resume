import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const PRISMA_CLIENT_NOT_READY_ERROR =
  'Prisma Client 尚未包含 AI 会话模型，请先执行 `pnpm db:generate` 并重启开发服务。'

function hasAIConversationDelegates() {
  const runtime = prisma as unknown as Record<string, unknown>
  return Boolean(runtime.aiConversation)
}

/**
 * DELETE /api/ai/conversations/:conversationId
 * 删除当前会话（消息将级联删除）
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    if (!hasAIConversationDelegates()) {
      return NextResponse.json({ success: false, error: PRISMA_CLIENT_NOT_READY_ERROR }, { status: 500 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const { conversationId } = await params
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId: user.id },
      select: { id: true },
    })

    if (!conversation) {
      return NextResponse.json({ success: false, error: '会话不存在或无权访问' }, { status: 404 })
    }

    await prisma.aiConversation.delete({
      where: { id: conversation.id },
      select: { id: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation.id,
      },
    })
  } catch (error) {
    console.error('[AI Conversation] delete error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '删除会话失败' },
      { status: 500 },
    )
  }
}
