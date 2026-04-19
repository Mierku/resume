import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { buildAIDraftTitle, generateAIDraftContent, type AIDraftIntent } from '@/server/ai-drafts'

const requestSchema = z.object({
  resumeId: z.string().min(1),
  intent: z.enum(['translate_resume', 'polish_resume', 'adapt_to_jd']),
  targetLanguage: z.enum(['zh', 'en']).optional(),
  jdText: z.string().optional(),
})

/**
 * POST /api/ai/drafts/generate
 *
 * 基于现有简历生成 AI 草稿（先预览再确认保存）
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

    const { resumeId, intent, targetLanguage, jdText } = parsed.data
    if (intent === 'adapt_to_jd' && !jdText?.trim()) {
      return NextResponse.json({ success: false, error: 'JD 适配需要 jdText' }, { status: 400 })
    }

    const sourceResume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: user.id },
      select: {
        id: true,
        title: true,
        templateId: true,
        content: true,
      },
    })

    if (!sourceResume) {
      return NextResponse.json({ success: false, error: '简历不存在或无权访问' }, { status: 404 })
    }

    const draftContent = await generateAIDraftContent({
      sourceContent: sourceResume.content,
      sourceResumeId: sourceResume.id,
      intent: intent as AIDraftIntent,
      targetLanguage: targetLanguage || 'en',
      jdText: jdText?.trim() || undefined,
    })

    const draftResume = await prisma.resume.create({
      data: {
        userId: user.id,
        title: buildAIDraftTitle(sourceResume.title, intent as AIDraftIntent),
        templateId: sourceResume.templateId,
        mode: 'form',
        content: draftContent as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        draftId: draftResume.id,
        sourceResumeId: sourceResume.id,
        title: draftResume.title,
        intent,
        draftData: draftContent.data,
        previewUrl: `/builder/editor/${draftResume.id}?panel=ai&previewDraft=1`,
      },
    })
  } catch (error) {
    console.error('[AI Draft] generate error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成草稿失败',
      },
      { status: 500 },
    )
  }
}
