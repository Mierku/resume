import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

const requestSchema = z.object({
  sourceResumeId: z.string().min(1).optional(),
  saveMode: z.enum(['new_version', 'overwrite']).default('new_version'),
})

function normalizeConfirmedTitle(title: string) {
  return title.replace(/^\s*\[AI草稿\]\s*/u, '').trim() || title
}

/**
 * POST /api/ai/drafts/:draftId/confirm
 *
 * 确认保存 AI 草稿：
 * - new_version: 草稿转正式版本（保留草稿内容，不覆盖原简历）
 * - overwrite: 用草稿内容覆盖原简历，并删除草稿
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

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || '参数错误' },
        { status: 400 },
      )
    }

    const { draftId } = await params
    const { sourceResumeId, saveMode } = parsed.data

    const draft = await prisma.resume.findFirst({
      where: { id: draftId, userId: user.id },
    })

    if (!draft) {
      return NextResponse.json({ success: false, error: '草稿不存在或无权访问' }, { status: 404 })
    }

    if (saveMode === 'new_version') {
      const updatedDraft = await prisma.resume.update({
        where: { id: draft.id },
        data: {
          title: normalizeConfirmedTitle(draft.title),
        },
        select: {
          id: true,
          title: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          resumeId: updatedDraft.id,
          title: updatedDraft.title,
          saveMode,
          previewUrl: `/resume/editor/${updatedDraft.id}`,
        },
      })
    }

    if (!sourceResumeId) {
      return NextResponse.json({ success: false, error: 'overwrite 需要 sourceResumeId' }, { status: 400 })
    }

    const source = await prisma.resume.findFirst({
      where: { id: sourceResumeId, userId: user.id },
    })
    if (!source) {
      return NextResponse.json({ success: false, error: '原简历不存在或无权访问' }, { status: 404 })
    }

    if (draft.id === source.id) {
      return NextResponse.json({ success: false, error: '草稿与原简历不能相同' }, { status: 400 })
    }

    const overwritten = await prisma.$transaction(async tx => {
      const updatedSource = await tx.resume.update({
        where: { id: source.id },
        data: {
          content: draft.content as unknown as Prisma.InputJsonValue,
          templateId: draft.templateId,
          dataSourceId: draft.dataSourceId,
          mode: 'form',
        },
        select: {
          id: true,
          title: true,
        },
      })

      await tx.resume.delete({
        where: { id: draft.id },
      })

      return updatedSource
    })

    return NextResponse.json({
      success: true,
      data: {
        resumeId: overwritten.id,
        title: overwritten.title,
        saveMode,
        previewUrl: `/resume/editor/${overwritten.id}`,
      },
    })
  } catch (error) {
    console.error('[AI Draft] confirm error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '确认保存失败',
      },
      { status: 500 },
    )
  }
}
