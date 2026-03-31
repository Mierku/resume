import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const appendMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().trim().min(1),
  card: z.unknown().optional(),
  meta: z.unknown().optional(),
})

const PRISMA_CLIENT_NOT_READY_ERROR =
  'Prisma Client 尚未包含 AI 会话模型，请先执行 `pnpm db:generate` 并重启开发服务。'

function buildConversationTitleFromContent(content: string) {
  const text = content.trim().replace(/\s+/g, ' ')
  if (!text) return 'AI 对话'
  return text.length <= 40 ? text : `${text.slice(0, 40)}...`
}

function hasAIConversationDelegates() {
  const runtime = prisma as unknown as Record<string, unknown>
  return Boolean(runtime.aiConversation && runtime.aiConversationMessage)
}

/**
 * POST /api/ai/conversations/:conversationId/messages
 * 向会话追加一条消息
 */
export async function POST(
  request: NextRequest,
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
      select: {
        id: true,
        title: true,
      },
    })

    if (!conversation) {
      return NextResponse.json({ success: false, error: '会话不存在或无权访问' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)
    const parsed = appendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || '参数错误' },
        { status: 400 },
      )
    }

    const { role, content, card, meta } = parsed.data
    const now = new Date()

    const message = await prisma.$transaction(async tx => {
      const created = await tx.aiConversationMessage.create({
        data: {
          conversationId: conversation.id,
          role,
          content,
          createdAt: now,
          ...(card !== undefined ? { card: card as Prisma.InputJsonValue } : {}),
          ...(meta !== undefined ? { meta: meta as Prisma.InputJsonValue } : {}),
        },
        select: {
          id: true,
          role: true,
          content: true,
          card: true,
          meta: true,
          createdAt: true,
        },
      })

      await tx.aiConversation.update({
        where: { id: conversation.id },
        data: {
          updatedAt: now,
          ...(conversation.title || role !== 'user'
            ? {}
            : { title: buildConversationTitleFromContent(content) }),
        },
      })

      return created
    })

    return NextResponse.json({
      success: true,
      data: {
        id: message.id,
        role: message.role,
        content: message.content,
        card: message.card,
        meta: message.meta,
        createdAt: message.createdAt,
      },
    })
  } catch (error) {
    console.error('[AI Conversation] append message error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '追加消息失败' },
      { status: 500 },
    )
  }
}
