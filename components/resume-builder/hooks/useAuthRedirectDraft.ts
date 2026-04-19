'use client'

import { type MutableRefObject, useCallback, useEffect, useRef } from 'react'
import type { ResumeData } from '@/lib/resume/types'
import { useResumeBuilderStore } from '@/components/resume-builder/store/useResumeBuilderStore'

const AUTH_REDIRECT_DRAFT_CACHE_KEY = 'resume:auth-redirect-draft'
const AUTH_REDIRECT_DRAFT_MAX_AGE_MS = 30 * 60 * 1000
const AUTH_REDIRECT_RUNTIME_DRAFT_MAX_AGE_MS = 15 * 1000

interface AuthRedirectDraftCachePayload {
  version: number
  resumeId: string
  path: string
  savedAt: number
  resumeTitle: string
  data: ResumeData
}

let authRedirectRuntimeDraft: {
  payload: AuthRedirectDraftCachePayload
  cachedAt: number
} | null = null

interface UseAuthRedirectDraftOptions {
  resumeId: string
  resumeTitle: string
  resumeTitleRef: MutableRefObject<string>
  setResumeTitle: (value: string) => void
  initialized: boolean
  updateResumeData: (updater: (draft: ResumeData) => void) => void
}

export function useAuthRedirectDraft({
  resumeId,
  resumeTitle,
  resumeTitleRef,
  setResumeTitle,
  initialized,
  updateResumeData,
}: UseAuthRedirectDraftOptions) {
  const restoredAuthDraftRef = useRef(false)

  const cacheDraftBeforeLoginRedirect = useCallback(async () => {
    if (typeof window === 'undefined') return

    const flushPendingInputs = () => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return
      if (
        !active.matches('input, textarea, [contenteditable="true"]') &&
        !active.closest('[contenteditable="true"]')
      ) {
        return
      }
      active.blur()
    }

    flushPendingInputs()
    await Promise.resolve()
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })

    try {
      const state = useResumeBuilderStore.getState()
      if (!state.initialized) return

      const payload: AuthRedirectDraftCachePayload = {
        version: 1,
        resumeId,
        path: `${window.location.pathname}${window.location.search}`,
        savedAt: Date.now(),
        resumeTitle,
        data: state.data,
      }

      window.sessionStorage.setItem(AUTH_REDIRECT_DRAFT_CACHE_KEY, JSON.stringify(payload))
      authRedirectRuntimeDraft = {
        payload,
        cachedAt: Date.now(),
      }
    } catch {
      // ignore caching failures before login redirect
    }
  }, [resumeId, resumeTitle])

  useEffect(() => {
    if (!initialized || restoredAuthDraftRef.current) return
    if (typeof window === 'undefined') return

    const now = Date.now()
    const runtimePayload =
      authRedirectRuntimeDraft && now - authRedirectRuntimeDraft.cachedAt <= AUTH_REDIRECT_RUNTIME_DRAFT_MAX_AGE_MS
        ? authRedirectRuntimeDraft.payload
        : null
    if (authRedirectRuntimeDraft && !runtimePayload) {
      authRedirectRuntimeDraft = null
    }

    const raw = window.sessionStorage.getItem(AUTH_REDIRECT_DRAFT_CACHE_KEY)
    let payload: Partial<AuthRedirectDraftCachePayload> | null = null
    let source: 'storage' | 'runtime' | null = null

    if (raw) {
      try {
        payload = JSON.parse(raw) as Partial<AuthRedirectDraftCachePayload>
        source = 'storage'
      } catch {
        window.sessionStorage.removeItem(AUTH_REDIRECT_DRAFT_CACHE_KEY)
      }
    }

    if (!payload && runtimePayload) {
      payload = runtimePayload
      source = 'runtime'
    }

    if (!payload) return

    const isExpired = typeof payload.savedAt !== 'number' || now - payload.savedAt > AUTH_REDIRECT_DRAFT_MAX_AGE_MS
    if (isExpired) {
      window.sessionStorage.removeItem(AUTH_REDIRECT_DRAFT_CACHE_KEY)
      authRedirectRuntimeDraft = null
      return
    }

    const currentPath = `${window.location.pathname}${window.location.search}`
    const currentPathname = window.location.pathname
    const payloadPathname =
      typeof payload.path === 'string' && payload.path
        ? new URL(payload.path, window.location.origin).pathname
        : ''
    const sameResume = payload.resumeId === resumeId
    const samePath = payload.path === currentPath
    const samePathname = payloadPathname === currentPathname
    const guestToAuthedEditorFlow =
      typeof payload.resumeId === 'string' &&
      payload.resumeId.startsWith('guest-') &&
      !resumeId.startsWith('guest-') &&
      payloadPathname.startsWith('/builder/editor/') &&
      currentPathname.startsWith('/builder/editor/')

    if ((!sameResume && !samePath && !samePathname && !guestToAuthedEditorFlow) || !payload.data || typeof payload.data !== 'object') {
      return
    }

    restoredAuthDraftRef.current = true
    const restoredData = structuredClone(payload.data as ResumeData)
    const resolvedResumeTitle =
      typeof payload.resumeTitle === 'string' && payload.resumeTitle.trim() ? payload.resumeTitle : resumeTitleRef.current
    updateResumeData((draft) => {
      Object.assign(draft, restoredData)
    })

    if (resolvedResumeTitle.trim()) {
      setResumeTitle(resolvedResumeTitle)
      resumeTitleRef.current = resolvedResumeTitle
    }

    window.sessionStorage.removeItem(AUTH_REDIRECT_DRAFT_CACHE_KEY)
    if (process.env.NODE_ENV !== 'production' && source === 'storage') {
      authRedirectRuntimeDraft = {
        payload: {
          version: typeof payload.version === 'number' ? payload.version : 1,
          resumeId: typeof payload.resumeId === 'string' ? payload.resumeId : resumeId,
          path: typeof payload.path === 'string' && payload.path ? payload.path : currentPath,
          savedAt: typeof payload.savedAt === 'number' ? payload.savedAt : now,
          resumeTitle: resolvedResumeTitle,
          data: restoredData,
        },
        cachedAt: now,
      }
    } else {
      authRedirectRuntimeDraft = null
    }
  }, [
    initialized,
    resumeId,
    resumeTitleRef,
    setResumeTitle,
    updateResumeData,
  ])

  return {
    cacheDraftBeforeLoginRedirect,
  }
}
