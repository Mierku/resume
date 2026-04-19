'use client'

import { type MutableRefObject, useCallback, useEffect } from 'react'
import { Message } from '@/components/resume-builder/primitives'
import { useResumeBuilderStore } from '@/components/resume-builder/store/useResumeBuilderStore'

interface UseManualSaveOptions {
  ensureAuthForAction: () => Promise<boolean>
  saveResumeTitle: () => Promise<boolean>
  isGuestDraft: boolean
  resumeTitleRef: MutableRefObject<string>
  onGuestResumeCreated: (resumeId: string) => void
}

export function useManualSave({
  ensureAuthForAction,
  saveResumeTitle,
  isGuestDraft,
  resumeTitleRef,
  onGuestResumeCreated,
}: UseManualSaveOptions) {
  const saveNow = useResumeBuilderStore((state) => state.saveNow)

  const handleManualSave = useCallback(async () => {
    if (!(await ensureAuthForAction())) {
      return
    }

    const titleSaved = await saveResumeTitle()
    if (!titleSaved) return

    if (isGuestDraft) {
      try {
        const state = useResumeBuilderStore.getState()
        const title = resumeTitleRef.current.trim() || '未命名简历'
        const response = await fetch('/api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            templateId: state.data.metadata.template,
            mode: 'form',
            content: {
              version: 2,
              builder: 'reactive-core',
              data: state.data,
              migratedAt: new Date().toISOString(),
            },
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: '创建云端简历失败' }))
          throw new Error(payload.error || '创建云端简历失败')
        }

        const payload = await response.json()
        const resumeId = payload?.resume?.id
        if (!resumeId) {
          throw new Error('创建云端简历失败')
        }

        Message.success('已创建云端简历，正在进入可保存版本')
        onGuestResumeCreated(resumeId)
        return
      } catch (error) {
        Message.error(error instanceof Error ? error.message : '保存失败')
        return
      }
    }

    await saveNow()
    const state = useResumeBuilderStore.getState()
    if (state.save.status === 'saved') {
      Message.success('保存成功')
      return
    }

    if (state.save.status === 'error') {
      Message.error(state.save.error || '保存失败')
      return
    }

    Message.success('当前已是最新内容')
  }, [ensureAuthForAction, isGuestDraft, onGuestResumeCreated, resumeTitleRef, saveNow, saveResumeTitle])

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() !== 's' && event.code !== 'KeyS') return
      event.preventDefault()
      void handleManualSave()
    }

    window.addEventListener('keydown', onKeydown, { capture: true })
    return () => window.removeEventListener('keydown', onKeydown, { capture: true })
  }, [handleManualSave])

  return {
    handleManualSave,
  }
}
