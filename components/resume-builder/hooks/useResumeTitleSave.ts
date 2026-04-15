'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Message } from '@/components/resume-builder/primitives'

interface UseResumeTitleSaveOptions {
  resumeId: string
  initialTitle: string
  isGuestDraft: boolean
}

export function useResumeTitleSave({ resumeId, initialTitle, isGuestDraft }: UseResumeTitleSaveOptions) {
  const [resumeTitle, setResumeTitle] = useState(initialTitle)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const resumeTitleRef = useRef(initialTitle)

  useEffect(() => {
    setResumeTitle(initialTitle)
    resumeTitleRef.current = initialTitle
  }, [initialTitle])

  const saveResumeTitle = useCallback(async () => {
    const normalizedTitle = resumeTitle.trim()
    if (!normalizedTitle) {
      Message.warning('标题不能为空')
      setResumeTitle(resumeTitleRef.current || initialTitle)
      return false
    }

    if (normalizedTitle === resumeTitleRef.current) {
      return true
    }

    if (isGuestDraft) {
      resumeTitleRef.current = normalizedTitle
      setResumeTitle(normalizedTitle)
      return true
    }

    setIsSavingTitle(true)
    try {
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: normalizedTitle,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: '标题保存失败' }))
        throw new Error(payload.error || '标题保存失败')
      }

      resumeTitleRef.current = normalizedTitle
      setResumeTitle(normalizedTitle)
      return true
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '标题保存失败')
      return false
    } finally {
      setIsSavingTitle(false)
    }
  }, [initialTitle, isGuestDraft, resumeId, resumeTitle])

  return {
    resumeTitle,
    setResumeTitle,
    resumeTitleRef,
    isSavingTitle,
    saveResumeTitle,
  }
}
