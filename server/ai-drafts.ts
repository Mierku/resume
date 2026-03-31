import type OpenAI from 'openai'
import { getOpenAIClient } from '@/server/ai'
import { normalizeResumeContent } from '@/lib/resume/mappers'
import { sanitizeHtml } from '@/lib/resume/sanitize'
import { resumeContentV2Schema } from '@/lib/resume/schema'
import type { ResumeContentV2 } from '@/lib/resume/types'

export type AIDraftIntent = 'translate_resume' | 'polish_resume' | 'adapt_to_jd'

interface TextEntry {
  path: string
  text: string
}

const SKIP_KEYS = new Set([
  'id',
  'url',
  'link',
  'icon',
  'template',
  'format',
  'locale',
  'fontFamily',
  'fontWeights',
  'status',
  'type',
  'builder',
  'version',
  'migratedAt',
])

const MAX_TEXT_ENTRIES = 180
const MAX_TOTAL_CHARACTERS = 26000

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value.trim()) || /^www\./i.test(value.trim())
}

function looksLikeDateOrNumeric(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (/^[\d\s:./-]+$/.test(trimmed)) return true
  return false
}

function shouldRewrite(path: string, key: string, value: string) {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (SKIP_KEYS.has(key)) return false
  if (path.startsWith('data.metadata.')) return false
  if (looksLikeUrl(trimmed)) return false
  if (looksLikeDateOrNumeric(trimmed)) return false
  return true
}

function collectTextEntries(node: unknown, path = '', key = '', entries: TextEntry[] = [], stat = { chars: 0 }): TextEntry[] {
  if (entries.length >= MAX_TEXT_ENTRIES) return entries
  if (stat.chars >= MAX_TOTAL_CHARACTERS) return entries

  if (typeof node === 'string') {
    if (shouldRewrite(path, key, node)) {
      entries.push({ path, text: node })
      stat.chars += node.length
    }
    return entries
  }

  if (Array.isArray(node)) {
    for (let index = 0; index < node.length; index += 1) {
      collectTextEntries(node[index], `${path}[${index}]`, key, entries, stat)
      if (entries.length >= MAX_TEXT_ENTRIES || stat.chars >= MAX_TOTAL_CHARACTERS) break
    }
    return entries
  }

  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    for (const [childKey, childValue] of Object.entries(record)) {
      const childPath = path ? `${path}.${childKey}` : childKey
      collectTextEntries(childValue, childPath, childKey, entries, stat)
      if (entries.length >= MAX_TEXT_ENTRIES || stat.chars >= MAX_TOTAL_CHARACTERS) break
    }
  }

  return entries
}

function parsePathSegments(path: string): Array<string | number> {
  const segments: Array<string | number> = []
  const regex = /([^[.\]]+)|\[(\d+)\]/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(path)) !== null) {
    if (match[1]) {
      segments.push(match[1])
    } else if (match[2]) {
      segments.push(Number(match[2]))
    }
  }
  return segments
}

function getByPath(root: unknown, path: string): unknown {
  const segments = parsePathSegments(path)
  let cursor: unknown = root

  for (const segment of segments) {
    if (typeof segment === 'number') {
      if (!Array.isArray(cursor)) return undefined
      cursor = cursor[segment]
      continue
    }
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }

  return cursor
}

function setByPath(root: unknown, path: string, value: string) {
  const segments = parsePathSegments(path)
  if (segments.length === 0) return false

  let cursor: unknown = root
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]
    if (typeof segment === 'number') {
      if (!Array.isArray(cursor)) return false
      cursor = cursor[segment]
      continue
    }
    if (!cursor || typeof cursor !== 'object') return false
    cursor = (cursor as Record<string, unknown>)[segment]
  }

  const leaf = segments[segments.length - 1]
  if (typeof leaf === 'number') {
    if (!Array.isArray(cursor)) return false
    cursor[leaf] = value
    return true
  }

  if (!cursor || typeof cursor !== 'object') return false
  ;(cursor as Record<string, unknown>)[leaf] = value
  return true
}

function buildPrompt(intent: AIDraftIntent, targetLanguage: 'zh' | 'en', jdText?: string) {
  const taskLine =
    intent === 'translate_resume'
      ? `将简历文本翻译为${targetLanguage === 'en' ? '英文' : '中文'}，保持专业、自然、可投递。`
      : intent === 'polish_resume'
        ? '对简历文本做语言润色，保留原事实，不新增未提供经历。'
        : '根据 JD 做表达层面的适配：突出相关技能和成果，不得编造事实。'

  return `你是简历改写助手。只输出 JSON，不要输出解释。

任务：
${taskLine}

硬性规则：
1. 不得编造新公司、新项目、新学历、新证书、新数字结果。
2. 不得改变日期、公司名、项目名、职位名的事实含义。
3. 保持每条 path 不变，只改 text。
4. 如果某字段不该改，就原样返回。
5. 对包含 HTML 标签的 text，保留原标签结构，只改可见文字。

${intent === 'adapt_to_jd' ? `JD 内容如下（仅用于对齐措辞）：
${jdText || ''}
` : ''}

返回格式：
{
  "items": [
    { "path": "data.summary.content", "text": "..." }
  ]
}`
}

const MODEL_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['path', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

interface AIRewriteResult {
  items: TextEntry[]
}

async function rewriteEntriesWithAI({
  intent,
  targetLanguage,
  entries,
  jdText,
}: {
  intent: AIDraftIntent
  targetLanguage: 'zh' | 'en'
  entries: TextEntry[]
  jdText?: string
}): Promise<TextEntry[]> {
  const client = getOpenAIClient()
  const requestPayload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    enable_thinking?: boolean
    response_format?: { type: 'json_object' }
  } = {
    model: process.env.AI_MODEL || 'qwen-flash',
    messages: [
      {
        role: 'system',
        content: buildPrompt(intent, targetLanguage, jdText),
      },
      {
        role: 'user',
        content: JSON.stringify({
          items: entries,
        }),
      },
    ],
    enable_thinking: false,
    temperature: 0.2,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  }

  const response = await client.chat.completions.create(requestPayload)
  const raw = response.choices[0]?.message?.content?.trim()
  if (!raw) {
    throw new Error('AI 未返回可解析结果')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('AI 返回格式不是 JSON')
  }

  const safe = parsed as AIRewriteResult
  const items = Array.isArray(safe.items) ? safe.items : []
  const validItems = items.filter(
    item => item && typeof item.path === 'string' && typeof item.text === 'string',
  )

  if (validItems.length === 0) {
    throw new Error('AI 返回结果为空')
  }

  return validItems
}

function stampAIDraftNote(content: ResumeContentV2, sourceResumeId: string, intent: AIDraftIntent) {
  const note = `ai_draft:${JSON.stringify({
    sourceResumeId,
    intent,
    createdAt: new Date().toISOString(),
  })}`
  const prev = content.data.metadata.notes || ''
  content.data.metadata.notes = prev ? `${prev}\n${note}` : note
}

export async function generateAIDraftContent({
  sourceContent,
  sourceResumeId,
  intent,
  targetLanguage = 'en',
  jdText,
}: {
  sourceContent: unknown
  sourceResumeId: string
  intent: AIDraftIntent
  targetLanguage?: 'zh' | 'en'
  jdText?: string
}) {
  const normalized = normalizeResumeContent(sourceContent, { withBackup: true })
  const entries = collectTextEntries(normalized)

  if (entries.length === 0) {
    throw new Error('未发现可改写文本')
  }

  const rewrittenItems = await rewriteEntriesWithAI({
    intent,
    targetLanguage,
    entries,
    jdText,
  })

  const allowedPaths = new Set(entries.map(item => item.path))
  const next = structuredClone(normalized)

  for (const item of rewrittenItems) {
    if (!allowedPaths.has(item.path)) continue
    const oldValue = getByPath(next, item.path)
    if (typeof oldValue !== 'string') continue

    const nextText = oldValue.includes('<') && oldValue.includes('>')
      ? sanitizeHtml(item.text)
      : item.text

    setByPath(next, item.path, nextText)
  }

  stampAIDraftNote(next, sourceResumeId, intent)
  const validated = resumeContentV2Schema.safeParse(next)
  if (!validated.success) {
    throw new Error('草稿结果校验失败')
  }

  return validated.data
}

export function buildAIDraftTitle(sourceTitle: string, intent: AIDraftIntent) {
  const suffix =
    intent === 'translate_resume'
      ? '英文草稿'
      : intent === 'polish_resume'
        ? '润色草稿'
        : 'JD适配草稿'
  return `[AI草稿] ${sourceTitle} - ${suffix}`
}
