'use client'

import { useCallback, useState } from 'react'
import type { ResumeDataSource } from '@/lib/resume/mappers'
import { normalizeResumeContent } from '@/lib/resume/mappers'
import type { ResumeData } from '@/lib/resume/types'
import { Message } from '@/components/resume-builder/primitives'

export type AIPreviewIntent = 'translate_resume' | 'polish_resume' | 'adapt_to_jd'

export interface AIPreviewState {
  data: ResumeData
  intent: AIPreviewIntent
  draftId?: string
  sourceResumeId?: string
  title?: string
  previewUrl?: string
}

interface PreviewDraftPayload {
  draftId: string
  sourceResumeId: string
  title: string
  previewUrl: string
  draftData: ResumeData
  intent: AIPreviewIntent
}

interface CardPreviewPayload {
  draftId: string
  sourceResumeId?: string
  intent?: AIPreviewIntent
}

interface UseAIPreviewDraftOptions {
  dataSources: ResumeDataSource[]
  initialTemplateId: string
}

export function useAIPreviewDraft({ dataSources, initialTemplateId }: UseAIPreviewDraftOptions) {
  const [aiPreviewState, setAiPreviewState] = useState<AIPreviewState | null>(null)
  const [aiPreviewActionLoading, setAiPreviewActionLoading] = useState<
    'new_version' | 'overwrite' | 'discard' | null
  >(null)
  const [resolvedDraftId, setResolvedDraftId] = useState<string | null>(null)

  const activeAIDraftId = aiPreviewState?.draftId

  const handlePreviewDraftInCanvas = useCallback((payload: PreviewDraftPayload) => {
    setResolvedDraftId(null)
    setAiPreviewState({
      data: structuredClone(payload.draftData),
      intent: payload.intent,
      draftId: payload.draftId,
      sourceResumeId: payload.sourceResumeId,
      title: payload.title,
      previewUrl: payload.previewUrl,
    })
  }, [])

  const handleCardPreviewRequest = useCallback(
    async (payload: CardPreviewPayload) => {
      try {
        const response = await fetch(`/api/resumes/${encodeURIComponent(payload.draftId)}`)
        const result = (await response.json().catch(() => null)) as {
          error?: string
          resume?: {
            id: string
            title?: string
            templateId?: string
            dataSourceId?: string | null
            content?: unknown
          }
        } | null

        if (!response.ok || !result?.resume) {
          Message.error(result?.error || '加载草稿预览失败')
          return
        }

        const draftResume = result.resume
        const normalized = normalizeResumeContent(draftResume.content, {
          dataSource: dataSources.find((item) => item.id === draftResume.dataSourceId) || null,
          templateId: draftResume.templateId || initialTemplateId,
          withBackup: true,
        })

        setResolvedDraftId(null)
        setAiPreviewState({
          data: structuredClone(normalized.data),
          intent: payload.intent || 'polish_resume',
          draftId: payload.draftId,
          sourceResumeId: payload.sourceResumeId,
          title: draftResume.title || 'AI 草稿',
          previewUrl: `/builder/editor/${payload.draftId}?panel=ai&previewDraft=1`,
        })
      } catch {
        Message.error('加载草稿预览失败')
      }
    },
    [dataSources, initialTemplateId],
  )

  const runPreviewDraftAction = useCallback(
    async (action: 'new_version' | 'overwrite' | 'discard') => {
      if (!activeAIDraftId || aiPreviewActionLoading) return
      if (action === 'overwrite' && !aiPreviewState?.sourceResumeId) {
        Message.warning('当前草稿缺少原简历 ID，暂时无法覆盖原版')
        return
      }

      setAiPreviewActionLoading(action)
      try {
        if (action === 'discard') {
          const response = await fetch(`/api/ai/drafts/${encodeURIComponent(activeAIDraftId)}/discard`, {
            method: 'POST',
          })
          const result = (await response.json().catch(() => null)) as {
            success?: boolean
            error?: string
          } | null
          if (!response.ok || !result?.success) {
            Message.error(result?.error || '放弃草稿失败')
            return
          }
          Message.success('草稿已放弃')
        } else {
          const response = await fetch(`/api/ai/drafts/${encodeURIComponent(activeAIDraftId)}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              saveMode: action,
              sourceResumeId: aiPreviewState?.sourceResumeId,
            }),
          })
          const result = (await response.json().catch(() => null)) as {
            success?: boolean
            error?: string
          } | null
          if (!response.ok || !result?.success) {
            Message.error(result?.error || '保存失败')
            return
          }
          Message.success(action === 'overwrite' ? '已覆盖原简历' : '已保存为新版本')
        }

        setResolvedDraftId(activeAIDraftId)
        setAiPreviewState((previous) =>
          previous && previous.draftId === activeAIDraftId
            ? {
                ...previous,
                draftId: undefined,
                sourceResumeId: undefined,
              }
            : previous,
        )
      } finally {
        setAiPreviewActionLoading(null)
      }
    },
    [activeAIDraftId, aiPreviewActionLoading, aiPreviewState?.sourceResumeId],
  )

  const clearAIPreviewOverlay = useCallback(() => {
    setAiPreviewState(null)
    setAiPreviewActionLoading(null)
  }, [])

  const resetAIPreview = useCallback(() => {
    setAiPreviewState(null)
    setAiPreviewActionLoading(null)
    setResolvedDraftId(null)
  }, [])

  return {
    aiPreviewState,
    aiPreviewActionLoading,
    resolvedDraftId,
    activeAIDraftId,
    handlePreviewDraftInCanvas,
    handleCardPreviewRequest,
    runPreviewDraftAction,
    clearAIPreviewOverlay,
    resetAIPreview,
  }
}
