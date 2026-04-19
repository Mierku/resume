import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { detectAIChatIntent, type AIChatIntent, type AIIntentSlots } from '@/server/ai-chat-intent'

const requestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .min(1),
  resumeId: z.string().min(1).optional(),
  conversationId: z.string().min(1).optional(),
  draftId: z.string().min(1).optional(),
  sourceResumeId: z.string().min(1).optional(),
  jdText: z.string().optional(),
})

type MissingSlot = 'resumeId' | 'jdText' | 'draftId'

type ChatCard = {
  type: 'draft_preview' | 'hint'
  title: string
  description: string
  href?: string
  ctaLabel?: string
}

type ChatAction =
  | {
      type: 'generate_draft'
      intent: 'translate_resume' | 'polish_resume' | 'adapt_to_jd'
      resumeId: string
      endpoint: '/api/ai/drafts/generate'
      payload: {
        resumeId: string
        intent: 'translate_resume' | 'polish_resume' | 'adapt_to_jd'
        targetLanguage?: 'zh' | 'en'
      }
    }
  | { type: 'open_preview'; draftId: string }
  | {
      type: 'confirm_save'
      draftId: string
      saveMode: 'new_version' | 'overwrite'
      endpoint: string
      payload: {
        sourceResumeId?: string
        saveMode: 'new_version' | 'overwrite'
      }
    }
  | { type: 'discard_draft'; draftId: string; endpoint: string }
  | { type: 'none' }

function getLastUserMessage(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      return messages[index].content
    }
  }
  return ''
}

function getIntentLabel(intent: AIChatIntent) {
  if (intent === 'translate_resume') return '生成英文简历草稿'
  if (intent === 'polish_resume') return '简历润色'
  if (intent === 'adapt_to_jd') return 'JD 适配'
  if (intent === 'open_draft_preview') return '打开草稿预览'
  if (intent === 'confirm_save_draft') return '确认保存草稿'
  if (intent === 'discard_draft') return '放弃草稿'
  return '通用对话'
}

function resolveDefaultSaveMode(slots: AIIntentSlots): 'new_version' | 'overwrite' {
  return slots.saveMode || 'new_version'
}

function buildResponsePayload({
  intent,
  slots,
  resumeId,
  resumeTitle,
  draftId,
  sourceResumeId,
  jdText,
}: {
  intent: AIChatIntent
  slots: AIIntentSlots
  resumeId?: string
  resumeTitle?: string
  draftId?: string
  sourceResumeId?: string
  jdText?: string
}) {
  const missingSlots: MissingSlot[] = []
  let reply = ''
  let card: ChatCard | undefined
  let nextAction: ChatAction = { type: 'none' }

  if (intent === 'translate_resume' || intent === 'polish_resume' || intent === 'adapt_to_jd') {
    if (!resumeId) missingSlots.push('resumeId')
    if (intent === 'adapt_to_jd' && !jdText?.trim()) missingSlots.push('jdText')

    if (missingSlots.length > 0) {
      reply = `已识别为「${getIntentLabel(intent)}」。请先补充：${missingSlots.join('、')}。`
      card = {
        type: 'hint',
        title: '缺少必要参数',
        description: '生成草稿前需要先确定目标简历；JD 适配还需要岗位描述文本。',
      }
    } else {
      reply = `已识别为「${getIntentLabel(intent)}」。建议先生成 AI 草稿，预览确认后再保存，避免直接覆盖原简历。`
      card = {
        type: 'draft_preview',
        title: '即将生成草稿',
        description: `目标简历：${resumeTitle || resumeId}。生成完成后会返回可点击的预览地址。`,
        href: `/builder/editor/${encodeURIComponent(resumeId || '')}?panel=ai&intent=${intent}`,
        ctaLabel: '打开编辑器',
      }
      nextAction = {
        type: 'generate_draft',
        intent,
        resumeId: resumeId || '',
        endpoint: '/api/ai/drafts/generate',
        payload: {
          resumeId: resumeId || '',
          intent,
          ...(slots.targetLanguage ? { targetLanguage: slots.targetLanguage } : {}),
        },
      }
    }
  } else if (intent === 'open_draft_preview') {
    if (!draftId) {
      missingSlots.push('draftId')
      reply = '已识别为「打开草稿预览」，但当前缺少 draftId。'
      card = {
        type: 'hint',
        title: '缺少 draftId',
        description: '请先传入草稿标识，再返回可点击的预览链接。',
      }
    } else {
      reply = '已识别为「打开草稿预览」。'
      card = {
        type: 'draft_preview',
        title: '草稿预览地址',
        description: '点击后跳转到编辑器继续查看草稿内容。',
        href: `/builder/editor/${encodeURIComponent(draftId)}?panel=ai&previewDraft=1`,
        ctaLabel: '去预览',
      }
      nextAction = { type: 'open_preview', draftId }
    }
  } else if (intent === 'confirm_save_draft') {
    if (!draftId) {
      missingSlots.push('draftId')
      reply = '已识别为「确认保存草稿」，但当前缺少 draftId。'
      card = {
        type: 'hint',
        title: '缺少 draftId',
        description: '请在确认动作里附带草稿标识。',
      }
    } else {
      const saveMode = resolveDefaultSaveMode(slots)
      reply = `已识别为「确认保存草稿」，保存策略：${saveMode === 'overwrite' ? '覆盖原简历' : '保存为新版本'}。`
      nextAction = {
        type: 'confirm_save',
        draftId,
        saveMode,
        endpoint: `/api/ai/drafts/${encodeURIComponent(draftId)}/confirm`,
        payload: {
          ...(sourceResumeId ? { sourceResumeId } : {}),
          saveMode,
        },
      }
    }
  } else if (intent === 'discard_draft') {
    if (!draftId) {
      missingSlots.push('draftId')
      reply = '已识别为「放弃草稿」，但当前缺少 draftId。'
      card = {
        type: 'hint',
        title: '缺少 draftId',
        description: '请在放弃动作里附带草稿标识。',
      }
    } else {
      reply = '已识别为「放弃草稿」，可直接执行删除草稿动作。'
      nextAction = {
        type: 'discard_draft',
        draftId,
        endpoint: `/api/ai/drafts/${encodeURIComponent(draftId)}/discard`,
      }
    }
  } else {
    reply = '已识别为通用对话。当前支持：翻译简历、润色、JD 适配、草稿预览、确认保存、放弃草稿。'
  }

  return {
    missingSlots,
    reply,
    card,
    nextAction,
  }
}

/**
 * POST /api/ai/chat
 *
 * 统一对话入口（意图识别层）：
 * - 识别 intent
 * - 抽取 slots
 * - 返回 nextAction 和 card 协议供前端执行
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || '参数错误' },
        { status: 400 },
      )
    }

    const { messages, resumeId, conversationId, draftId, sourceResumeId, jdText } = parsed.data
    const latestUserMessage = getLastUserMessage(messages)
    if (!latestUserMessage) {
      return NextResponse.json({ success: false, error: '缺少用户消息' }, { status: 400 })
    }

    let resumeTitle: string | undefined
    if (resumeId) {
      const resume = await prisma.resume.findFirst({
        where: { id: resumeId, userId: user.id },
        select: { id: true, title: true },
      })
      if (!resume) {
        return NextResponse.json({ success: false, error: '简历不存在或无权访问' }, { status: 404 })
      }
      resumeTitle = resume.title
    }

    const decision = await detectAIChatIntent({
      message: latestUserMessage,
      hasDraftId: Boolean(draftId),
      hasJdText: Boolean(jdText && jdText.trim()),
    })

    const routed = buildResponsePayload({
      intent: decision.intent,
      slots: decision.slots,
      resumeId,
      resumeTitle,
      draftId,
      sourceResumeId,
      jdText,
    })

    return NextResponse.json({
      success: true,
      data: {
        decision: {
          intent: decision.intent,
          intentLabel: getIntentLabel(decision.intent),
          confidence: decision.confidence,
          needsConfirmation: decision.needsConfirmation,
          slots: decision.slots,
          missingSlots: routed.missingSlots,
        },
        reply: routed.reply,
        card: routed.card || null,
        nextAction: routed.nextAction,
        conversationId: conversationId || null,
      },
    })
  } catch (error) {
    console.error('[AI Chat] route error:', error)
    return NextResponse.json({ success: false, error: 'AI 对话路由失败' }, { status: 500 })
  }
}
