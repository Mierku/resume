import type OpenAI from 'openai'
import { z } from 'zod'
import { getOpenAIClient } from '@/server/ai'

export type AIChatIntent =
  | 'translate_resume'
  | 'polish_resume'
  | 'adapt_to_jd'
  | 'open_draft_preview'
  | 'confirm_save_draft'
  | 'discard_draft'
  | 'chat_general'

export type DraftSaveMode = 'new_version' | 'overwrite'

export interface AIIntentSlots {
  targetLanguage?: 'zh' | 'en'
  saveMode?: DraftSaveMode
  hasJdText?: boolean
}

export interface AIIntentInput {
  message: string
  hasDraftId?: boolean
  hasJdText?: boolean
}

export interface AIIntentDecision {
  intent: AIChatIntent
  confidence: number
  needsConfirmation: boolean
  slots: AIIntentSlots
}

const MODEL_RESULT_SCHEMA = z.object({
  intent: z.enum([
    'translate_resume',
    'polish_resume',
    'adapt_to_jd',
    'open_draft_preview',
    'confirm_save_draft',
    'discard_draft',
    'chat_general',
  ]),
  confidence: z.number().min(0).max(1),
  targetLanguage: z.enum(['zh', 'en']).nullable().optional(),
  saveMode: z.enum(['new_version', 'overwrite']).nullable().optional(),
})

function normalizeMessage(input: string) {
  return input.trim().toLowerCase()
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some(keyword => text.includes(keyword))
}

function inferTargetLanguage(text: string): 'zh' | 'en' | undefined {
  const wantsEnglish = includesAny(text, ['英文', '英语', 'english', 'en resume', 'translate to english'])
  if (wantsEnglish) return 'en'

  const wantsChinese = includesAny(text, ['中文', '汉语', 'chinese', 'translate to chinese'])
  if (wantsChinese) return 'zh'

  return undefined
}

function inferSaveMode(text: string): DraftSaveMode | undefined {
  const overwrite = includesAny(text, ['覆盖', '覆写', '替换原简历', '直接替换', '覆盖当前'])
  if (overwrite) return 'overwrite'

  const createVersion = includesAny(text, ['新版本', '另存', '保存副本', '保留原版'])
  if (createVersion) return 'new_version'

  return undefined
}

function classifyByRules(input: AIIntentInput): AIIntentDecision {
  const text = normalizeMessage(input.message)
  const slots: AIIntentSlots = {
    targetLanguage: inferTargetLanguage(text),
    saveMode: inferSaveMode(text),
    hasJdText: input.hasJdText === true,
  }

  if (includesAny(text, ['取消', '不要了', '放弃', 'discard'])) {
    return {
      intent: 'discard_draft',
      confidence: 0.94,
      needsConfirmation: false,
      slots,
    }
  }

  if (includesAny(text, ['确认保存', '确认', '保存这个', '就这个', '应用草稿', 'confirm'])) {
    return {
      intent: 'confirm_save_draft',
      confidence: 0.92,
      needsConfirmation: false,
      slots,
    }
  }

  if (input.hasDraftId && includesAny(text, ['预览', '查看草稿', '打开草稿', 'open draft'])) {
    return {
      intent: 'open_draft_preview',
      confidence: 0.9,
      needsConfirmation: false,
      slots,
    }
  }

  if (includesAny(text, ['jd', '岗位描述', '职位描述', '岗位适配', '匹配岗位', '针对岗位'])) {
    return {
      intent: 'adapt_to_jd',
      confidence: 0.88,
      needsConfirmation: true,
      slots,
    }
  }

  if (includesAny(text, ['翻译', '英文简历', '英语简历', 'translate'])) {
    return {
      intent: 'translate_resume',
      confidence: 0.9,
      needsConfirmation: true,
      slots,
    }
  }

  if (includesAny(text, ['润色', '改写', '优化措辞', 'polish', 'rewrite'])) {
    return {
      intent: 'polish_resume',
      confidence: 0.86,
      needsConfirmation: true,
      slots,
    }
  }

  return {
    intent: 'chat_general',
    confidence: 0.52,
    needsConfirmation: false,
    slots,
  }
}

function hasAIClientConfigured() {
  return Boolean(process.env.DASHSCOPE_API_KEY || process.env.AI_API_KEY)
}

async function classifyByModel(input: AIIntentInput): Promise<AIIntentDecision | null> {
  if (!hasAIClientConfigured()) return null

  try {
    const client = getOpenAIClient()
    const requestPayload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
      enable_thinking?: boolean
      response_format?: { type: 'json_object' }
    } = {
      model: process.env.AI_MODEL || 'qwen-flash',
      messages: [
        {
          role: 'system',
          content: `你是简历助手的意图分类器。
仅返回 JSON，不要输出额外解释。
intent 只能是：
- translate_resume
- polish_resume
- adapt_to_jd
- open_draft_preview
- confirm_save_draft
- discard_draft
- chat_general

输出字段：
{
  "intent": string,
  "confidence": number(0~1),
  "targetLanguage": "zh"|"en"|null,
  "saveMode": "new_version"|"overwrite"|null
}
`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            message: input.message,
            hasDraftId: Boolean(input.hasDraftId),
            hasJdText: Boolean(input.hasJdText),
          }),
        },
      ],
      enable_thinking: false,
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    }

    const response = await client.chat.completions.create(requestPayload)
    const raw = response.choices[0]?.message?.content?.trim()
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const validated = MODEL_RESULT_SCHEMA.safeParse(parsed)
    if (!validated.success) return null

    return {
      intent: validated.data.intent,
      confidence: validated.data.confidence,
      needsConfirmation: ['translate_resume', 'polish_resume', 'adapt_to_jd'].includes(validated.data.intent),
      slots: {
        targetLanguage: validated.data.targetLanguage || undefined,
        saveMode: validated.data.saveMode || undefined,
        hasJdText: input.hasJdText === true,
      },
    }
  } catch {
    return null
  }
}

export async function detectAIChatIntent(input: AIIntentInput): Promise<AIIntentDecision> {
  const ruleDecision = classifyByRules(input)
  if (ruleDecision.confidence >= 0.78) {
    return ruleDecision
  }

  const modelDecision = await classifyByModel(input)
  if (!modelDecision) {
    return ruleDecision
  }

  if (modelDecision.confidence < 0.6) {
    return ruleDecision
  }

  return modelDecision
}
