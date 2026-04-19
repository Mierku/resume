'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useParams, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { ResumeBuilderClient } from '@/components/resume-builder/ResumeBuilderClient'
import {
  createFreshResumeContent,
  createMockResumeDataSource,
  normalizeTemplateId,
  type ResumeDataSource,
} from '@/lib/resume/mappers'

const HEX_COLOR_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

type EditorPayload = {
  initialResume: {
    id: string
    title: string
    templateId: string
    dataSourceId?: string | null
    shareVisibility?: 'private' | 'public'
    shareWithRecruiters?: boolean
    content: unknown
  }
  dataSources: ResumeDataSource[]
}

type EditorLoadState =
  | { status: 'loading' }
  | { status: 'ready'; payload: EditorPayload }
  | { status: 'error'; message: string }

type ResolveResult =
  | { kind: 'ready'; payload: EditorPayload }
  | { kind: 'redirect'; to: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function mapDataSourceToBuilderInput(value: unknown): ResumeDataSource | null {
  if (!isRecord(value)) return null

  const id = typeof value.id === 'string' ? value.id : ''
  const name = typeof value.name === 'string' ? value.name : ''
  if (!id || !name) return null

  const skills = Array.isArray(value.skills)
    ? value.skills.filter(item => typeof item === 'string')
    : []

  return {
    id,
    name,
    basics: isRecord(value.basics) ? value.basics : {},
    intention: isRecord(value.intention) ? value.intention : null,
    summaryZh: typeof value.summaryZh === 'string' ? value.summaryZh : null,
    summaryEn: typeof value.summaryEn === 'string' ? value.summaryEn : null,
    education: Array.isArray(value.education) ? (value.education as Array<Record<string, unknown>>) : [],
    work: Array.isArray(value.work) ? (value.work as Array<Record<string, unknown>>) : [],
    projects: Array.isArray(value.projects) ? (value.projects as Array<Record<string, unknown>>) : [],
    skills: skills as string[],
  }
}

function buildLoginRedirect(pathname: string, search: string) {
  const next = search ? `${pathname}?${search}` : pathname
  return `/login?next=${encodeURIComponent(next)}`
}

function buildGuestPayload(searchParams: URLSearchParams): EditorPayload {
  const template = normalizeTemplateId(searchParams.get('template'))
  const title = String(searchParams.get('title') || '').trim() || '未命名简历'
  const guestContent = createFreshResumeContent(template, createMockResumeDataSource())
  const theme = searchParams.get('theme')

  if (theme && HEX_COLOR_PATTERN.test(theme)) {
    guestContent.data.metadata.design.colors.primary = theme
  }

  return {
    initialResume: {
      id: 'guest-new',
      title,
      templateId: template,
      dataSourceId: null,
      content: guestContent,
    },
    dataSources: [],
  }
}

async function resolveEditorPayload({
  resumeId,
  pathname,
  search,
  signal,
}: {
  resumeId: string
  pathname: string
  search: string
  signal: AbortSignal
}): Promise<ResolveResult> {
  if (resumeId === 'new') {
    const guestParams = new URLSearchParams(search)
    return { kind: 'ready', payload: buildGuestPayload(guestParams) }
  }

  const resumeRes = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}`, { cache: 'no-store', signal })
  if (resumeRes.status === 401) {
    return { kind: 'redirect', to: buildLoginRedirect(pathname, search) }
  }

  if (resumeRes.status === 404) {
    return { kind: 'redirect', to: '/dashboard' }
  }

  if (!resumeRes.ok) {
    throw new Error('简历加载失败，请稍后重试')
  }

  const resumePayload = await resumeRes.json()
  if (!isRecord(resumePayload) || !isRecord(resumePayload.resume)) {
    throw new Error('简历数据格式不正确')
  }

  const resume = resumePayload.resume
  const resumeRecord: EditorPayload['initialResume'] = {
    id: typeof resume.id === 'string' ? resume.id : '',
    title: typeof resume.title === 'string' ? resume.title : '未命名简历',
    templateId: typeof resume.templateId === 'string' ? resume.templateId : 'template-1',
    dataSourceId: typeof resume.dataSourceId === 'string' ? resume.dataSourceId : null,
    shareVisibility: resume.shareVisibility === 'public' ? 'public' : 'private',
    shareWithRecruiters: Boolean(resume.shareWithRecruiters),
    content: resume.content,
  }

  if (!resumeRecord.id) {
    throw new Error('简历数据缺少标识')
  }

  let dataSources: ResumeDataSource[] = []
  const dataSourcesRes = await fetch('/api/data-sources', { cache: 'no-store', signal })
  if (dataSourcesRes.status === 401) {
    return { kind: 'redirect', to: buildLoginRedirect(pathname, search) }
  }

  if (dataSourcesRes.ok) {
    const dataSourcePayload = await dataSourcesRes.json()
    const rawList = isRecord(dataSourcePayload) && Array.isArray(dataSourcePayload.dataSources)
      ? dataSourcePayload.dataSources
      : []

    dataSources = rawList
      .map(mapDataSourceToBuilderInput)
      .filter((item): item is ResumeDataSource => Boolean(item))
  }

  return {
    kind: 'ready',
    payload: {
      initialResume: resumeRecord,
      dataSources,
    },
  }
}

function EditorLoadingState() {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-10 w-1/2 mx-auto" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mx-auto" />
        <p className="text-center text-sm text-muted-foreground">正在加载编辑器...</p>
      </div>
    </div>
  )
}

function EditorErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[12px] border border-border bg-background p-5 text-center space-y-3">
        <h2 className="text-base font-medium text-foreground">编辑器加载失败</h2>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={onRetry}>
            重试
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign('/builder/templates')}>
            返回模板页
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ResumeEditorPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams<{ resumeId: string }>()
  const searchParams = useSearchParams()
  const search = useMemo(() => searchParams.toString(), [searchParams])
  const [reloadKey, setReloadKey] = useState(0)
  const [state, setState] = useState<EditorLoadState>({ status: 'loading' })

  const resumeId = typeof params.resumeId === 'string' ? params.resumeId : ''

  useEffect(() => {
    if (!resumeId) return

    const controller = new AbortController()
    let cancelled = false

    async function load() {
      setState({ status: 'loading' })
      try {
        const result = await resolveEditorPayload({
          resumeId,
          pathname,
          search,
          signal: controller.signal,
        })

        if (cancelled) return

        if (result.kind === 'redirect') {
          router.replace(result.to)
          return
        }

        setState({ status: 'ready', payload: result.payload })
      } catch (error) {
        if (cancelled || controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '加载失败，请稍后重试',
        })
      }
    }

    void load()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [pathname, reloadKey, resumeId, router, search])

  if (!resumeId) {
    return (
      <EditorErrorState
        message="缺少简历标识"
        onRetry={() => router.replace('/dashboard')}
      />
    )
  }

  if (state.status === 'loading') {
    return <EditorLoadingState />
  }

  if (state.status === 'error') {
    return (
      <EditorErrorState
        message={state.message}
        onRetry={() => setReloadKey(value => value + 1)}
      />
    )
  }

  return (
    <ResumeBuilderClient
      initialResume={state.payload.initialResume}
      dataSources={state.payload.dataSources}
    />
  )
}
