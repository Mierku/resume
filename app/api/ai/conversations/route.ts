import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const createConversationSchema = z.object({
  resumeId: z.string().min(1).optional(),
  title: z.string().trim().max(120).optional(),
})

const PRISMA_CLIENT_NOT_READY_ERROR =
  'Prisma Client 尚未包含 AI 会话模型，请先执行 `pnpm db:generate` 并重启开发服务。'

function normalizeTitle(value?: string) {
  if (!value) return undefined
  const text = value.trim()
  return text ? text.slice(0, 120) : undefined
}

function hasAIConversationDelegates() {
  const runtime = prisma as unknown as Record<string, unknown>
  return Boolean(runtime.aiConversation)
}

function formatMessage(message: {
  id: string
  role: string
  content: string
  card: unknown
  meta: unknown
  createdAt: Date
}) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    card: message.card,
    meta: message.meta,
    createdAt: message.createdAt,
  }
}

function formatConversationSummary(conversation: {
  id: string
  resumeId: string | null
  title: string | null
  createdAt: Date
  updatedAt: Date
  _count: { messages: number }
}) {
  return {
    conversationId: conversation.id,
    resumeId: conversation.resumeId,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messageCount: conversation._count.messages,
  }
}

/**
 * GET /api/ai/conversations?conversationId=...&resumeId=...&mode=list
 * - 优先按 conversationId 读取指定会话
 * - 否则按 resumeId 读取最近会话
 * - 再否则读取用户最近会话
 * - 当 mode=list 时返回会话列表（按更新时间倒序）
 */
export async function GET(request: NextRequest) {
  try {
    if (!hasAIConversationDelegates()) {
      return NextResponse.json({ success: false, error: PRISMA_CLIENT_NOT_READY_ERROR }, { status: 500 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const conversationId = params.get('conversationId')?.trim()
    const resumeId = params.get('resumeId')?.trim()
    const mode = params.get('mode')?.trim()

    if (mode === 'list') {
      const conversations = await prisma.aiConversation.findMany({
        where: {
          userId: user.id,
          ...(resumeId ? { resumeId } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 40,
        select: {
          id: true,
          resumeId: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { messages: true },
          },
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          conversations: conversations.map(formatConversationSummary),
        },
      })
    }

    const includeMessages = {
      messages: {
        orderBy: { createdAt: 'asc' as const },
        take: 300,
      },
    }

    let conversation:
      | {
          id: string
          userId: string
          resumeId: string | null
          title: string | null
          createdAt: Date
          updatedAt: Date
          messages: Array<{
            id: string
            role: string
            content: string
            card: unknown
            meta: unknown
            createdAt: Date
          }>
        }
      | null = null

    if (conversationId) {
      conversation = await prisma.aiConversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: includeMessages,
      })
    } else if (resumeId) {
      conversation = await prisma.aiConversation.findFirst({
        where: { userId: user.id, resumeId },
        include: includeMessages,
        orderBy: { updatedAt: 'desc' },
      })
    } else {
      conversation = await prisma.aiConversation.findFirst({
        where: { userId: user.id },
        include: includeMessages,
        orderBy: { updatedAt: 'desc' },
      })
    }

    if (!conversation) {
      return NextResponse.json({ success: true, data: null })
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation.id,
        resumeId: conversation.resumeId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages.map(formatMessage),
      },
    })
  } catch (error) {
    console.error('[AI Conversation] get error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '读取会话失败' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/ai/conversations
 * 创建会话并返回 conversationId
 */
export async function POST(request: NextRequest) {
  try {
    if (!hasAIConversationDelegates()) {
      return NextResponse.json({ success: false, error: PRISMA_CLIENT_NOT_READY_ERROR }, { status: 500 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = createConversationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || '参数错误' },
        { status: 400 },
      )
    }

    const { resumeId, title } = parsed.data
    if (resumeId) {
      const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId: user.id },
        select: { id: true },
      })
      if (!resume) {
        return NextResponse.json({ success: false, error: '简历不存在或无权访问' }, { status: 404 })
      }
    }

    const conversation = await prisma.aiConversation.create({
      data: {
        userId: user.id,
        resumeId: resumeId || null,
        title: normalizeTitle(title),
      },
      select: {
        id: true,
        resumeId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation.id,
        resumeId: conversation.resumeId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    })
  } catch (error) {
    console.error('[AI Conversation] create error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '创建会话失败' },
      { status: 500 },
    )
  }
}
