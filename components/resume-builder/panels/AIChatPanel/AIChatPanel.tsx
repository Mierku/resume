'use client'

import {
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  FileText,
  History,
  Languages,
  Plus,
  SendHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ResumeData } from '@/lib/resume/types'
import styles from './AIChatPanel.module.css'

type ChatRole = 'user' | 'assistant'

interface PanelCard {
  title: string
  description: string
  href?: string
  ctaLabel?: string
  openInNewTab?: boolean
  draftId?: string
  sourceResumeId?: string
  badge?: string
  status?: string
  intent?: 'translate_resume' | 'polish_resume' | 'adapt_to_jd'
}

interface PanelMessage {
  id: string
  role: ChatRole
  content: string
  time: string
  card?: PanelCard
}

interface AIChatPanelProps {
  resumeId: string
  resumeTitle: string
  isGuestDraft: boolean
  resolvedDraftId?: string | null
  onClose?: () => void
  onPreviewDraftInCanvas?: (payload: {
    draftId: string
    sourceResumeId: string
    title: string
    previewUrl: string
    draftData: ResumeData
    intent: 'translate_resume' | 'polish_resume' | 'adapt_to_jd'
  }) => void
  onCardPreviewRequest?: (payload: {
    draftId: string
    sourceResumeId?: string
    intent?: 'translate_resume' | 'polish_resume' | 'adapt_to_jd'
  }) => void
}

interface ChatRouteActionGenerate {
  type: 'generate_draft'
  intent: 'translate_resume' | 'polish_resume' | 'adapt_to_jd'
  endpoint: '/api/ai/drafts/generate'
  payload: {
    resumeId: string
    intent: 'translate_resume' | 'polish_resume' | 'adapt_to_jd'
    targetLanguage?: 'zh' | 'en'
  }
}

interface ChatRouteActionConfirm {
  type: 'confirm_save'
  draftId: string
  saveMode: 'new_version' | 'overwrite'
  endpoint: string
  payload: {
    sourceResumeId?: string
    saveMode: 'new_version' | 'overwrite'
  }
}

interface ChatRouteActionDiscard {
  type: 'discard_draft'
  draftId: string
  endpoint: string
}

type ChatRouteAction =
  | ChatRouteActionGenerate
  | ChatRouteActionConfirm
  | ChatRouteActionDiscard
  | { type: 'open_preview'; draftId: string }
  | { type: 'none' }

interface ChatRouteResponse {
  success: boolean
  error?: string
  data?: {
    reply: string
    card: {
      title: string
      description: string
      href?: string
      ctaLabel?: string
    } | null
    nextAction: ChatRouteAction
    conversationId?: string | null
  }
}

interface ConversationHistoryResponse {
  success: boolean
  error?: string
  data?: {
    conversationId: string
    resumeId?: string | null
    title?: string | null
    createdAt?: string
    updatedAt?: string
    messages: Array<{
      id: string
      role: string
      content: string
      card?: unknown
      meta?: unknown
      createdAt: string
    }>
  } | null
}

interface ConversationCreateResponse {
  success: boolean
  error?: string
  data?: {
    conversationId: string
  }
}

interface ConversationSummary {
  conversationId: string
  resumeId?: string | null
  title?: string | null
  createdAt?: string
  updatedAt?: string
  messageCount?: number
}

interface ConversationListResponse {
  success: boolean
  error?: string
  data?: {
    conversations: ConversationSummary[]
  }
}

interface ConversationDeleteResponse {
  success: boolean
  error?: string
  data?: {
    conversationId: string
  }
}

function extractLikelyJdText(input: string): string | undefined {
  const value = input.trim()
  if (!value) return undefined

  const hasKeyword =
    /jd|岗位描述|职位描述|任职要求|岗位职责|工作内容|任职资格|qualification|responsibilit|job description/i.test(
      value,
    )
  const hasMultiLine = value.includes('\n')
  const looksLongEnough = value.length >= 120

  if ((hasKeyword && (hasMultiLine || looksLongEnough)) || value.length >= 220) {
    return value
  }

  return undefined
}

const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const conversationTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatMessageTime(value?: Date | string) {
  if (!value) return timeFormatter.format(new Date())
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return timeFormatter.format(new Date())
  return timeFormatter.format(date)
}

function formatConversationTime(value?: Date | string) {
  if (!value) return '--'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return conversationTimeFormatter.format(date)
}

function createMessage(role: ChatRole, content: string, card?: PanelCard): PanelMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    time: formatMessageTime(),
    card,
  }
}

const emptyStateActions = [
  {
    id: 'generate-english',
    label: '生成英文简历草稿',
    prompt: '请基于当前简历生成英文简历草稿。',
    icon: Languages,
    tone: 'is-blue',
  },
  {
    id: 'polish-experience',
    label: '润色项目经验描述',
    prompt: '请先润色我的项目经验描述，并保持量化结果导向。',
    icon: Sparkles,
    tone: 'is-violet',
  },
  {
    id: 'adapt-jd',
    label: '针对特定 JD 适配简历',
    prompt: '请根据我接下来提供的 JD 进行简历适配。',
    icon: BriefcaseBusiness,
    tone: 'is-amber',
  },
  {
    id: 'translate-zh-resume',
    label: '翻译现有的中文简历',
    prompt: '请把当前中文简历翻译成英文，并保持专业语气。',
    icon: FileText,
    tone: 'is-emerald',
  },
] as const

function resolveProgressLabel(intent?: ChatRouteActionGenerate['intent']) {
  if (intent === 'translate_resume') return '翻译中...'
  if (intent === 'polish_resume') return '润色中...'
  if (intent === 'adapt_to_jd') return '匹配 JD 中...'
  return '处理中...'
}

function mergeReply(primary: string, secondary: string) {
  const first = primary.trim()
  const second = secondary.trim()
  if (!first) return second
  if (!second) return first
  if (first.includes(second)) return first
  if (second.includes(first)) return second
  return `${first}\n\n${second}`
}

function resolveDraftCardMeta(intent: ChatRouteActionGenerate['intent']) {
  if (intent === 'translate_resume') {
    return { title: '翻译草稿已生成', badge: '翻译', status: '已完成' }
  }
  if (intent === 'polish_resume') {
    return { title: '润色草稿已生成', badge: '润色', status: '已完成' }
  }
  return { title: 'JD 适配草稿已生成', badge: 'JD 适配', status: '已完成' }
}

function resolveCardIntent(card: PanelCard): 'translate_resume' | 'polish_resume' | 'adapt_to_jd' | undefined {
  if (card.intent) return card.intent
  if (card.badge === '翻译') return 'translate_resume'
  if (card.badge === '润色') return 'polish_resume'
  if (card.badge === 'JD 适配') return 'adapt_to_jd'
  return undefined
}

function resolveCardLayerCode(card: PanelCard) {
  const intent = resolveCardIntent(card)
  if (intent === 'translate_resume') return 'DOC.EN'
  if (intent === 'polish_resume') return 'DOC.PO'
  if (intent === 'adapt_to_jd') return 'DOC.JD'
  return 'DOC.AI'
}

export function AIChatPanel({
  resumeId,
  isGuestDraft,
  resolvedDraftId,
  onClose,
  onPreviewDraftInCanvas,
  onCardPreviewRequest,
}: AIChatPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<PanelMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<ConversationSummary[]>([])
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false)
  const [historyMenuLoading, setHistoryMenuLoading] = useState(false)
  const [historyMenuError, setHistoryMenuError] = useState<string | null>(null)
  const [switchingConversation, setSwitchingConversation] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [draftContext, setDraftContext] = useState<{ draftId?: string; sourceResumeId?: string }>({})
  const latestJdTextRef = useRef<string | undefined>(undefined)
  const conversationIdRef = useRef<string | null>(null)
  const creatingConversationRef = useRef<Promise<string | null> | null>(null)
  const messageViewportRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const historyPanelRef = useRef<HTMLDivElement | null>(null)

  const disabled = isGuestDraft || !resumeId || loading || !historyLoaded || switchingConversation
  const showEmptyState = historyLoaded && messages.length === 0

  const apiMessages = useMemo(
    () =>
      messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
    [messages],
  )

  const parseStoredCard = (value: unknown): PanelCard | undefined => {
    if (!value || typeof value !== 'object') return undefined
    const raw = value as Record<string, unknown>
    const title = typeof raw.title === 'string' ? raw.title : ''
    const description = typeof raw.description === 'string' ? raw.description : ''
    if (!title || !description) return undefined

    return {
      title,
      description,
      href: typeof raw.href === 'string' ? raw.href : undefined,
      ctaLabel: typeof raw.ctaLabel === 'string' ? raw.ctaLabel : undefined,
      openInNewTab: Boolean(raw.openInNewTab),
      draftId: typeof raw.draftId === 'string' ? raw.draftId : undefined,
      sourceResumeId: typeof raw.sourceResumeId === 'string' ? raw.sourceResumeId : undefined,
      badge: typeof raw.badge === 'string' ? raw.badge : undefined,
      status: typeof raw.status === 'string' ? raw.status : undefined,
      intent:
        raw.intent === 'translate_resume' || raw.intent === 'polish_resume' || raw.intent === 'adapt_to_jd'
          ? raw.intent
          : undefined,
    }
  }

  const getOrCreateConversationId = async () => {
    if (conversationIdRef.current) return conversationIdRef.current
    if (creatingConversationRef.current) return creatingConversationRef.current

    creatingConversationRef.current = (async () => {
      const response = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId }),
      })
      const result = (await response.json().catch(() => null)) as ConversationCreateResponse | null
      if (!response.ok || !result?.success || !result.data?.conversationId) {
        return null
      }
      const nextId = result.data.conversationId
      conversationIdRef.current = nextId
      setConversationId(nextId)
      return nextId
    })().finally(() => {
      creatingConversationRef.current = null
    })

    return creatingConversationRef.current
  }

  const persistMessage = async (role: ChatRole, content: string, card?: PanelCard) => {
    try {
      const id = await getOrCreateConversationId()
      if (!id) return
      await fetch(`/api/ai/conversations/${encodeURIComponent(id)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          content,
          ...(card ? { card } : {}),
        }),
      })
    } catch {
      // 历史持久化失败不影响当前对话
    }
  }

  const appendAssistantMessage = (content: string, card?: PanelCard) => {
    setMessages(previous => [...previous, createMessage('assistant', content, card)])
    void persistMessage('assistant', content, card)
  }

  const appendUserMessage = (content: string) => {
    setMessages(previous => [...previous, createMessage('user', content)])
    void persistMessage('user', content)
  }

  const resizeComposer = () => {
    const composer = composerRef.current
    if (!composer) return
    composer.style.height = 'auto'
    const nextHeight = Math.min(composer.scrollHeight, 150)
    composer.style.height = `${nextHeight}px`
  }

  const applyConversationSnapshot = (data: NonNullable<ConversationHistoryResponse['data']>) => {
    const nextConversationId = data.conversationId
    const mappedMessages = (data.messages || [])
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .map(message => ({
        id: message.id,
        role: message.role as ChatRole,
        content: message.content,
        time: formatMessageTime(new Date(message.createdAt)),
        card: parseStoredCard(message.card),
      }))

    const latestDraftCard = [...mappedMessages]
      .reverse()
      .map(message => message.card)
      .find(card => card?.draftId)

    setConversationId(nextConversationId)
    conversationIdRef.current = nextConversationId
    setDraftContext(
      latestDraftCard?.draftId
        ? {
            draftId: latestDraftCard.draftId,
            sourceResumeId: latestDraftCard.sourceResumeId,
          }
        : {},
    )
    setMessages(mappedMessages)
  }

  const clearCurrentConversation = () => {
    setConversationId(null)
    conversationIdRef.current = null
    setDraftContext({})
    setMessages([])
  }

  const loadConversationMenu = async () => {
    if (isGuestDraft || !resumeId) {
      setConversationHistory([])
      setHistoryMenuError(null)
      return
    }

    setHistoryMenuLoading(true)
    setHistoryMenuError(null)
    try {
      const query = new URLSearchParams({ mode: 'list', resumeId })
      const response = await fetch(`/api/ai/conversations?${query.toString()}`)
      const result = (await response.json().catch(() => null)) as ConversationListResponse | null
      if (!response.ok || !result?.success || !result.data?.conversations) {
        setHistoryMenuError(result?.error || '读取历史会话失败。')
        return
      }
      setConversationHistory(result.data.conversations)
    } catch {
      setHistoryMenuError('读取历史会话失败。')
    } finally {
      setHistoryMenuLoading(false)
    }
  }

  const handleToggleHistoryPanel = async () => {
    if (disabled) return
    if (historyPanelOpen) {
      setHistoryPanelOpen(false)
      return
    }
    setHistoryPanelOpen(true)
    await loadConversationMenu()
  }

  const handleSelectConversation = async (targetConversationId: string) => {
    if (!targetConversationId || targetConversationId === conversationId || switchingConversation) {
      setHistoryPanelOpen(false)
      return
    }

    setSwitchingConversation(true)
    setHistoryPanelOpen(false)
    setHistoryMenuError(null)
    try {
      const response = await fetch(`/api/ai/conversations?conversationId=${encodeURIComponent(targetConversationId)}`)
      const result = (await response.json().catch(() => null)) as ConversationHistoryResponse | null
      if (!response.ok || !result?.success || !result.data) {
        setHistoryMenuError(result?.error || '加载会话失败，请稍后重试。')
        return
      }
      applyConversationSnapshot(result.data)
    } catch {
      setHistoryMenuError('加载会话失败，请稍后重试。')
    } finally {
      setSwitchingConversation(false)
    }
  }

  const handleDeleteConversation = async () => {
    if (!conversationId || disabled) return
    const confirmed = window.confirm('确认删除当前会话？删除后无法恢复。')
    if (!confirmed) return

    setSwitchingConversation(true)
    setHistoryMenuError(null)
    setHistoryPanelOpen(false)
    try {
      const targetConversationId = conversationId
      const response = await fetch(`/api/ai/conversations/${encodeURIComponent(targetConversationId)}`, {
        method: 'DELETE',
      })
      const result = (await response.json().catch(() => null)) as ConversationDeleteResponse | null
      if (!response.ok || !result?.success) {
        appendAssistantMessage(result?.error || '删除会话失败，请稍后重试。')
        return
      }
      clearCurrentConversation()
      setConversationHistory(previous => previous.filter(item => item.conversationId !== targetConversationId))
    } catch {
      appendAssistantMessage('删除会话失败，请稍后重试。')
    } finally {
      setSwitchingConversation(false)
    }
  }

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    if (!resolvedDraftId) return
    setDraftContext(previous => (previous.draftId === resolvedDraftId ? {} : previous))
  }, [resolvedDraftId])

  useEffect(() => {
    let cancelled = false
    creatingConversationRef.current = null
    clearCurrentConversation()
    setConversationHistory([])
    setHistoryMenuError(null)
    setHistoryPanelOpen(false)
    setHistoryLoaded(false)

    const loadHistory = async () => {
      if (isGuestDraft || !resumeId) {
        if (!cancelled) {
          clearCurrentConversation()
          setHistoryLoaded(true)
        }
        return
      }

      try {
        const response = await fetch(`/api/ai/conversations?resumeId=${encodeURIComponent(resumeId)}`)
        const result = (await response.json().catch(() => null)) as ConversationHistoryResponse | null

        if (!response.ok || !result?.success || !result.data) {
          if (!cancelled) {
            clearCurrentConversation()
            setHistoryLoaded(true)
          }
          return
        }

        if (cancelled) return
        applyConversationSnapshot(result.data)
        setHistoryLoaded(true)
      } catch {
        if (!cancelled) {
          clearCurrentConversation()
          setHistoryLoaded(true)
        }
      }
    }

    void loadHistory()

    return () => {
      cancelled = true
    }
  }, [isGuestDraft, resumeId])

  useEffect(() => {
    if (!historyPanelOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const node = historyPanelRef.current
      if (!node) return
      if (event.target instanceof Node && !node.contains(event.target)) {
        setHistoryPanelOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [historyPanelOpen])

  const runGenerateDraft = async (action: ChatRouteActionGenerate, options?: { silent?: boolean }) => {
    const payload: {
      resumeId: string
      intent: 'translate_resume' | 'polish_resume' | 'adapt_to_jd'
      targetLanguage?: 'zh' | 'en'
      jdText?: string
    } = {
      ...action.payload,
      resumeId,
    }

    if (action.intent === 'adapt_to_jd' && latestJdTextRef.current) {
      payload.jdText = latestJdTextRef.current
    }

    const response = await fetch(action.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = (await response.json().catch(() => null)) as
      | {
          success?: boolean
          error?: string
          data?: {
            draftId: string
            sourceResumeId: string
            previewUrl: string
            title: string
            draftData?: ResumeData
          }
        }
      | null

    if (!response.ok || !result?.success || !result.data) {
      const errorMessage = result?.error || '生成草稿失败，请稍后重试。'
      if (!options?.silent) {
        appendAssistantMessage(errorMessage)
      }
      return { success: false as const, error: errorMessage }
    }

    const { draftId, sourceResumeId, previewUrl, title, draftData } = result.data
    setDraftContext({ draftId, sourceResumeId })
    if (draftData) {
      onPreviewDraftInCanvas?.({
        draftId,
        sourceResumeId,
        title,
        previewUrl,
        draftData,
        intent: action.intent,
      })
    }
    const meta = resolveDraftCardMeta(action.intent)
    const card: PanelCard = {
      title: meta.title,
      description: `${title}\n已在当前画布加载预览，可直接对比查看。`,
      href: previewUrl,
      ctaLabel: '去编辑页',
      openInNewTab: true,
      draftId,
      sourceResumeId,
      badge: meta.badge,
      status: meta.status,
      intent: action.intent,
    }

    const reply = '草稿已生成，并已加载到当前画布预览，请先确认再保存。'
    if (!options?.silent) {
      appendAssistantMessage(reply, card)
    }
    return { success: true as const, reply, card }
  }

  const runConfirmSave = async (saveMode: 'new_version' | 'overwrite', options?: { silent?: boolean }) => {
    if (!draftContext.draftId) {
      const errorMessage = '当前没有可确认的草稿。'
      if (!options?.silent) {
        appendAssistantMessage(errorMessage)
      }
      return { success: false as const, error: errorMessage }
    }

    const endpoint = `/api/ai/drafts/${encodeURIComponent(draftContext.draftId)}/confirm`
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        saveMode,
        sourceResumeId: draftContext.sourceResumeId,
      }),
    })

    const result = (await response.json().catch(() => null)) as
      | {
          success?: boolean
          error?: string
          data?: {
            resumeId: string
            previewUrl: string
          }
        }
      | null

    if (!response.ok || !result?.success || !result.data) {
      const errorMessage = result?.error || '确认保存失败，请稍后重试。'
      if (!options?.silent) {
        appendAssistantMessage(errorMessage)
      }
      return { success: false as const, error: errorMessage }
    }

    const reply = saveMode === 'overwrite' ? '已覆盖原简历。' : '已保存为新版本。'
    const card: PanelCard = {
      title: '保存完成',
      description: '点击继续编辑最新版本。',
      href: result.data.previewUrl,
      ctaLabel: '打开简历',
      status: '已保存',
    }

    if (!options?.silent) {
      appendAssistantMessage(reply, card)
    }
    setDraftContext({})
    return { success: true as const, reply, card }
  }

  const runDiscardDraft = async (options?: { silent?: boolean }) => {
    if (!draftContext.draftId) {
      const errorMessage = '当前没有可放弃的草稿。'
      if (!options?.silent) {
        appendAssistantMessage(errorMessage)
      }
      return { success: false as const, error: errorMessage }
    }

    const endpoint = `/api/ai/drafts/${encodeURIComponent(draftContext.draftId)}/discard`
    const response = await fetch(endpoint, { method: 'POST' })
    const result = (await response.json().catch(() => null)) as
      | {
          success?: boolean
          error?: string
        }
      | null

    if (!response.ok || !result?.success) {
      const errorMessage = result?.error || '放弃草稿失败，请稍后重试。'
      if (!options?.silent) {
        appendAssistantMessage(errorMessage)
      }
      return { success: false as const, error: errorMessage }
    }

    const reply = '草稿已放弃，不会影响原简历。'
    if (!options?.silent) {
      appendAssistantMessage(reply)
    }
    setDraftContext({})
    return { success: true as const, reply }
  }

  const handleSend = async (overrideInput?: string) => {
    const value = (overrideInput ?? input).trim()
    if (!value || disabled) return

    const maybeJdText = extractLikelyJdText(value)
    if (maybeJdText) {
      latestJdTextRef.current = maybeJdText
    }
    appendUserMessage(value)
    setInput('')
    setLoading(true)
    setLoadingStage('思考中...')

    try {
      const activeConversationId = (await getOrCreateConversationId()) || conversationIdRef.current
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...apiMessages, { role: 'user', content: value }],
          resumeId,
          conversationId: activeConversationId || undefined,
          draftId: draftContext.draftId,
          sourceResumeId: draftContext.sourceResumeId,
          jdText: latestJdTextRef.current,
        }),
      })

      const result = (await response.json().catch(() => null)) as ChatRouteResponse | null
      if (!response.ok || !result?.success || !result.data) {
        appendAssistantMessage(result?.error || 'AI 助手暂时不可用，请稍后重试。')
        return
      }

      if (result.data.conversationId && result.data.conversationId !== conversationIdRef.current) {
        conversationIdRef.current = result.data.conversationId
        setConversationId(result.data.conversationId)
      }

      let finalReply = result.data.reply
      let finalCard: PanelCard | undefined = result.data.card
        ? {
            title: result.data.card.title,
            description: result.data.card.description,
            href: result.data.card.href,
            ctaLabel: result.data.card.ctaLabel,
            openInNewTab: true,
            draftId: draftContext.draftId,
            sourceResumeId: draftContext.sourceResumeId,
          }
        : undefined
      const action = result.data.nextAction

      if (action.type === 'generate_draft') {
        setLoadingStage(resolveProgressLabel(action.intent))
        const generation = await runGenerateDraft(action, { silent: true })
        if (!generation.success) {
          appendAssistantMessage(generation.error)
          return
        }
        finalReply = mergeReply(result.data.reply, generation.reply)
        finalCard = generation.card
      } else if (action.type === 'confirm_save') {
        setLoadingStage('保存中...')
        const confirmation = await runConfirmSave(action.payload.saveMode, { silent: true })
        if (!confirmation.success) {
          appendAssistantMessage(confirmation.error)
          return
        }
        finalReply = confirmation.reply
        finalCard = confirmation.card
      } else if (action.type === 'discard_draft') {
        setLoadingStage('处理中...')
        const discard = await runDiscardDraft({ silent: true })
        if (!discard.success) {
          appendAssistantMessage(discard.error)
          return
        }
        finalReply = discard.reply
        finalCard = undefined
      }

      appendAssistantMessage(finalReply, finalCard)
    } catch {
      appendAssistantMessage('请求失败，请检查网络后重试。')
    } finally {
      setLoadingStage(null)
      setLoading(false)
    }
  }

  useEffect(() => {
    const viewport = messageViewportRef.current
    if (!viewport) return
    viewport.scrollTop = viewport.scrollHeight
  }, [messages, loading, loadingStage])

  useEffect(() => {
    resizeComposer()
  }, [input])

  return (
    <div className={`${styles.panel} resume-ai-chat`}>
      <div className="resume-ai-header">
        <div className="resume-ai-title-wrap">
          <div className="resume-ai-avatar">
            <Bot size={15} />
          </div>
          <div className="min-w-0">
            <h3 className="resume-ai-title">简历 AI 助手</h3>
            {conversationId ? (
              <div className="resume-ai-conversation-id" title={conversationId}>
                会话ID: {conversationId}
              </div>
            ) : null}
          </div>
        </div>
        <div className="resume-ai-header-actions" ref={historyPanelRef}>
          <button
            type="button"
            className="resume-ai-icon-btn"
            aria-label="查看历史会话"
            title="查看历史会话"
            onClick={() => void handleToggleHistoryPanel()}
            disabled={disabled}
          >
            <History size={15} />
          </button>
          <button
            type="button"
            className="resume-ai-icon-btn is-danger"
            aria-label="删除当前会话"
            title="删除当前会话"
            onClick={() => void handleDeleteConversation()}
            disabled={disabled || !conversationId}
          >
            <Trash2 size={15} />
          </button>
          {onClose ? (
            <button
              type="button"
              className="resume-ai-icon-btn"
              aria-label="关闭 AI 面板"
              title="关闭面板"
              onClick={onClose}
            >
              <X size={15} />
            </button>
          ) : null}
          {historyPanelOpen ? (
            <div className="resume-ai-history-menu" role="menu" aria-label="历史会话">
              <div className="resume-ai-history-menu-title">历史会话</div>
              {historyMenuLoading ? (
                <div className="resume-ai-history-menu-state">加载中...</div>
              ) : historyMenuError ? (
                <div className="resume-ai-history-menu-state is-error">{historyMenuError}</div>
              ) : conversationHistory.length === 0 ? (
                <div className="resume-ai-history-menu-state">暂无历史会话</div>
              ) : (
                <div className="resume-ai-history-list">
                  {conversationHistory.map(item => (
                    <button
                      key={item.conversationId}
                      type="button"
                      className={`resume-ai-history-item ${item.conversationId === conversationId ? 'is-active' : ''}`}
                      onClick={() => void handleSelectConversation(item.conversationId)}
                      disabled={switchingConversation}
                    >
                      <span className="resume-ai-history-item-title">{item.title || '未命名会话'}</span>
                      <span className="resume-ai-history-item-meta">
                        {formatConversationTime(item.updatedAt)} · {item.messageCount ?? 0} 条消息
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className={`resume-ai-messages ${showEmptyState ? 'is-empty' : ''}`} ref={messageViewportRef}>
        {showEmptyState ? (
          <div className="resume-ai-empty-state">
            <div className="resume-ai-empty-hero" aria-hidden="true">
              <div className="resume-ai-empty-hero-icon">
                <Sparkles size={36} />
              </div>
              <span className="resume-ai-empty-hero-check">
                <CheckCircle2 size={16} />
              </span>
            </div>
            <div className="resume-ai-empty-copy">
              <h4 className="resume-ai-empty-title">你好，我是你的简历专家</h4>
              <p className="resume-ai-empty-desc">
                {isGuestDraft
                  ? '登录后可使用：简历翻译、润色、JD 适配。默认先生成草稿，再确认保存。'
                  : '可以帮你做：简历翻译、润色、JD 适配。默认先生成草稿，再确认保存。'}
              </p>
            </div>
            <div className="resume-ai-empty-actions">
              {emptyStateActions.map(action => {
                const ActionIcon = action.icon
                return (
                  <button
                    key={action.id}
                    type="button"
                    className="resume-ai-empty-action"
                    onClick={() => void handleSend(action.prompt)}
                    disabled={disabled}
                  >
                    <span className={`resume-ai-empty-action-icon ${action.tone}`} aria-hidden="true">
                      <ActionIcon size={20} />
                    </span>
                    <span className="resume-ai-empty-action-label">{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`resume-ai-message ${message.role === 'user' ? 'is-user' : 'is-ai'}`}
              >
                <div className={`resume-ai-bubble ${message.role === 'user' ? 'is-user' : 'is-ai'}`}>
                  <p className="resume-ai-bubble-text">{message.content}</p>
                  {message.card ? (
                    <div
                      className={`resume-ai-card ${message.card.draftId ? 'is-clickable' : ''}`}
                      role={message.card.draftId ? 'button' : undefined}
                      tabIndex={message.card.draftId ? 0 : undefined}
                      onClick={() => {
                        if (!message.card?.draftId) return
                        setDraftContext({
                          draftId: message.card.draftId,
                          sourceResumeId: message.card.sourceResumeId,
                        })
                        onCardPreviewRequest?.({
                          draftId: message.card.draftId,
                          sourceResumeId: message.card.sourceResumeId,
                          intent: resolveCardIntent(message.card),
                        })
                      }}
                      onKeyDown={event => {
                        if (!message.card?.draftId) return
                        if (event.key !== 'Enter' && event.key !== ' ') return
                        event.preventDefault()
                        setDraftContext({
                          draftId: message.card.draftId,
                          sourceResumeId: message.card.sourceResumeId,
                        })
                        onCardPreviewRequest?.({
                          draftId: message.card.draftId,
                          sourceResumeId: message.card.sourceResumeId,
                          intent: resolveCardIntent(message.card),
                        })
                      }}
                    >
                      <div className="resume-ai-card-abstract" aria-hidden="true" />
                      <div className="resume-ai-card-content">
                        <div className="resume-ai-card-meta">
                          <span className="resume-ai-card-dot" aria-hidden="true" />
                          <span className="resume-ai-card-kicker">Draft Generated</span>
                          {message.card.badge ? <span className="resume-ai-card-badge">{message.card.badge}</span> : null}
                          {message.card.status ? <span className="resume-ai-card-status">{message.card.status}</span> : null}
                        </div>
                        <div className="resume-ai-card-title">{message.card.title}</div>
                        <div className="resume-ai-card-desc">{message.card.description}</div>
                        {message.card.draftId ? <div className="resume-ai-card-hint">即刻预览</div> : null}
                      </div>
                      <div className="resume-ai-card-layer" aria-hidden="true">
                        {resolveCardLayerCode(message.card)}
                      </div>
                    </div>
                  ) : null}
                </div>
                <span className="resume-ai-time">{message.time}</span>
              </div>
            ))}
            {loading && loadingStage ? (
              <div className="resume-ai-message is-ai is-progress">
                <div className="resume-ai-bubble is-ai is-progress">
                  <span className="resume-ai-progress-dot" aria-hidden="true" />
                  <p className="resume-ai-bubble-text">{loadingStage}</p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="resume-ai-input-area">
        <div className="resume-ai-input-shell">
          <textarea
            ref={composerRef}
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
            placeholder={
              !historyLoaded
                ? '正在加载历史会话...'
                : isGuestDraft
                  ? '请先登录后使用 AI 助手。'
                  : '输入你的需求，例如：生成英文简历草稿'
            }
            className="resume-ai-composer"
            rows={3}
          />
          <div className="resume-ai-input-footer">
            <div className="resume-ai-input-actions" aria-hidden="true">
              <span className="resume-ai-input-action is-plus">
                <Plus size={16} />
              </span>
              <span className="resume-ai-input-action">
                AI 助手
                <ChevronDown size={13} />
              </span>
              <span className="resume-ai-input-action">
                意图识别
                <ChevronDown size={13} />
              </span>
            </div>
            <button
              type="button"
              className="resume-ai-send-btn"
              onClick={() => void handleSend()}
              disabled={disabled || !input.trim()}
              aria-label="发送消息"
            >
              {loading ? <Sparkles size={16} className="animate-pulse" /> : <SendHorizontal size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
