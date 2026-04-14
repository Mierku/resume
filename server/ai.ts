// AI service - Two-stage form filling with AI
// Stage 1: Parse DOM structure and identify form fields
// Stage 2: Match resume data and generate fill plan

import OpenAI from 'openai'
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
import { DOM_PARSE_PROMPT, RESUME_MATCH_PROMPT } from './prompts'

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
const dom1 = [
  {
    "section": "个人信息",
    "children": [
      {
        "label": "姓名",
        "type": "input",
        "id": "e101"
      },
      {
        "label": "性别-男",
        "type": "radio",
        "id": "e118"
      },
      {
        "label": "性别-女",
        "type": "radio",
        "id": "e125"
      },
      {
        "label": "性别-保密",
        "type": "radio",
        "id": "e132"
      },
      {
        "label": "出生日期",
        "type": "input",
        "id": "e148"
      },
      {
        "label": "邮箱",
        "type": "input",
        "id": "e161"
      },
      {
        "label": "手机号码",
        "type": "input",
        "id": "e185"
      },
      {
        "label": "证件照",
        "type": "file",
        "id": "e199"
      },
      {
        "label": "最高学位",
        "type": "select",
        "id": "e218"
      },
      {
        "label": "现居住地",
        "type": "select",
        "id": "e235"
      },
      {
        "label": "婚否-未婚",
        "type": "radio",
        "id": "e253"
      },
      {
        "label": "婚否-已婚",
        "type": "radio",
        "id": "e260"
      },
      {
        "label": "婚否-离异",
        "type": "radio",
        "id": "e267"
      },
      {
        "label": "婚否-保密",
        "type": "radio",
        "id": "e274"
      },
      {
        "label": "婚否-丧偶",
        "type": "radio",
        "id": "e281"
      },
      {
        "label": "民族",
        "type": "select",
        "id": "e294"
      },
      {
        "label": "籍贯",
        "type": "select",
        "id": "e312"
      },
      {
        "label": "身高(厘米)",
        "type": "input",
        "id": "e323"
      },
      {
        "label": "体重(公斤)",
        "type": "input",
        "id": "e333"
      },
      {
        "label": "紧急联系人",
        "type": "input",
        "id": "e342"
      },
      {
        "label": "紧急联系电话",
        "type": "input",
        "id": "e352"
      },
      {
        "label": "证件号码-身份证",
        "type": "input",
        "id": "e373"
      },
      {
        "label": "最高学历",
        "type": "select",
        "id": "e391"
      },
      {
        "label": "学习形式",
        "type": "select",
        "id": "e410"
      }
    ]
  },
  {
    "section": "求职意向",
    "children": [
      {
        "label": "现月薪(税前)",
        "type": "select",
        "id": "e438"
      },
      {
        "label": "期望从事行业",
        "type": "select",
        "id": "e455"
      },
      {
        "label": "期望从事职业",
        "type": "select",
        "id": "e473"
      },
      {
        "label": "期望工作城市",
        "type": "select",
        "id": "e490"
      },
      {
        "label": "期望月薪(税前)",
        "type": "select",
        "id": "e508"
      },
      {
        "label": "到岗时间",
        "type": "select",
        "id": "e525"
      }
    ]
  },
  {
    "section": "教育经历",
    "children": [
      {
        "label": "学校名称",
        "type": "input",
        "id": "e554"
      },
      {
        "label": "开始时间",
        "type": "input",
        "id": "e571"
      },
      {
        "label": "结束时间",
        "type": "input",
        "id": "e591"
      },
      {
        "label": "专业名称",
        "type": "input",
        "id": "e604"
      },
      {
        "label": "学历",
        "type": "select",
        "id": "e622"
      }
    ]
  },
  {
    "section": "工作经历",
    "children": [
      {
        "label": "公司名称",
        "type": "input",
        "id": "e650"
      },
      {
        "label": "职位名称",
        "type": "input",
        "id": "e661"
      },
      {
        "label": "开始时间",
        "type": "input",
        "id": "e679"
      },
      {
        "label": "结束时间",
        "type": "input",
        "id": "e700"
      },
      {
        "label": "工作职责",
        "type": "textarea",
        "id": "e721"
      }
    ]
  },
  {
    "section": "项目经历",
    "children": [
      {
        "label": "项目名称",
        "type": "input",
        "id": "e750"
      },
      {
        "label": "开始时间",
        "type": "input",
        "id": "e767"
      },
      {
        "label": "结束时间",
        "type": "input",
        "id": "e789"
      },
      {
        "label": "项目描述",
        "type": "textarea",
        "id": "e808"
      },
      {
        "label": "项目中职责",
        "type": "textarea",
        "id": "e820"
      }
    ]
  },
  {
    "section": "附加信息",
    "children": [
      {
        "label": "兴趣爱好",
        "type": "textarea",
        "id": "e847"
      }
    ]
  },
  {
    "section": "简历附件",
    "children": [
      {
        "label": "简历附件",
        "type": "file",
        "id": "e879"
      }
    ]
  },
  {
    "section": "家庭情况",
    "children": [
      {
        "label": "姓名",
        "type": "input",
        "id": "e902"
      },
      {
        "label": "与本人关系",
        "type": "input",
        "id": "e913"
      },
      {
        "label": "工作单位",
        "type": "input",
        "id": "e925"
      }
    ]
  },
  {
    "section": "附件",
    "children": [
      {
        "label": "附件",
        "type": "file",
        "id": "e954"
      }
    ]
  }
]
// ============================================
// Types
// ============================================

export interface DOMSnapshot {
  url: string
  title: string
  viewport: [number, number]
  rows: Array<{
    top: number
    height: number
    items: Array<{
      id: string
      tag: string
      type?: string
      text?: string
      attrs?: {
        id?: string
        name?: string
        placeholder?: string
        value?: string
        required?: boolean
      }
      aria?: {
        role?: string
        label?: string
        expanded?: boolean
      }
    }>
  }>
  timestamp: number
}

interface ParsedField {
  section: string
  children: Array<{
    label: string
    type: string
    id: string
    value?: string
  }>
}

interface ParseDOMResponse {
  success: boolean
  data?: ParsedField[]
  error?: string
}

interface FillInstruction {
  id: string
  resumeKey: string
  action: 'setValue' | 'selectOption' | 'check' | 'uncheck' | 'clickRadio'
  value: string
}

interface ManualField {
  id: string
  label: string
  reason: string
}

interface FillPlan {
  section: string
  children: Array<{
    label: string
    type: string
    id: string
    value?: string
  }>
}

interface GeneratePlanResponse {
  success: boolean
  data?: FillPlan[]
  error?: string
}

// ============================================
// AI API Configuration
// ============================================

const AI_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.AI_API_KEY || ''
const AI_BASE_URL = process.env.DASHSCOPE_BASE_URL || process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const AI_MODEL = process.env.AI_MODEL || 'qwen-flash'

let openaiClient: OpenAI | null = null

const FILL_PLAN_JSON_SCHEMA = {
  name: 'autofill_plan',
  strict: true,
  schema: {
    type: 'array',
    items: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['section', 'index', 'label', 'type', 'controlId', 'labelId', 'optionLabelId', 'value'],
          properties: {
            section: { type: 'string' },
            index: { type: 'integer' },
            label: { type: 'string' },
            type: { type: 'string', enum: ['radio', 'checkbox'] },
            controlId: { type: 'string' },
            labelId: { type: 'string' },
            optionLabelId: { type: 'string' },
            value: { type: 'boolean' },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['section', 'index', 'label', 'type', 'controlId', 'labelId', 'optionLabelId', 'value'],
          properties: {
            section: { type: 'string' },
            index: { type: 'integer' },
            label: { type: 'string' },
            type: { type: 'string', enum: ['input', 'textarea', 'select', 'file'] },
            controlId: { type: 'string' },
            labelId: { type: 'string' },
            optionLabelId: { type: 'string' },
            value: { type: 'string' },
          },
        },
      ],
    },
  },
} as const

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!AI_API_KEY) {
      throw new Error('AI_API_KEY or DASHSCOPE_API_KEY not configured')
    }
    openaiClient = new OpenAI({
      apiKey: AI_API_KEY,
      baseURL: AI_BASE_URL,
    })
  }
  return openaiClient
}

/**
 * 调用 AI API（使用 OpenAI SDK，非流式）
 */
// async function callAI(prompt: string, data: unknown): Promise<string> {
//   try {
//     const client = getOpenAIClient()
//     const completion = await client.chat.completions.create({
//       model: AI_MODEL,
//       messages: [
//         { role: 'system', content: prompt },
//         { role: 'user', content: JSON.stringify(data) }
//       ],
//       temperature: 0,
//       top_p: 1,
//       response_format: { type: 'json_object' }
//     })
//     return completion.choices[0]?.message?.content || '{}'
//   } catch (error) {
//     console.error('[AI] API call error:', error)
//     if (error instanceof Error) {
//       throw new Error(`AI API error: ${error.message}`)
//     }
//     throw new Error('AI API error: Unknown error')
//   }
// }


/**
 * （流式）：匹配简历数据，流式生成填充计划
 * 返回 OpenAI stream，由调用方处理 SSE 输出
 */
export async function generateFillPlanStream(
  snapshot: DOMSnapshot,
  resume: Record<string, unknown>
) {
  const client = getOpenAIClient()
  // DashScope supports enable_thinking on the compatible endpoint, but the
  // current OpenAI SDK types do not declare it yet.
  const request: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming & {
    enable_thinking?: boolean
    response_format?: {
      type: 'json_schema'
      json_schema: typeof FILL_PLAN_JSON_SCHEMA
    }
  } = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: RESUME_MATCH_PROMPT },
      { role: 'user', content: JSON.stringify({ resume, snapshot }) }
    ],
    enable_thinking: false,
    temperature: 0.1,
    response_format: {
      type: 'json_schema',
      json_schema: FILL_PLAN_JSON_SCHEMA,
    },
    stream: true,
  }
  const stream = await client.chat.completions.create(request)
  return stream
}

// ============================================
// Text Processing Types and Functions
// ============================================

interface PolishRequest {
  text: string
  style?: 'professional' | 'casual' | 'academic'
  language?: 'zh' | 'en'
}

interface TranslateRequest {
  text: string
  from: 'zh' | 'en'
  to: 'zh' | 'en'
}

interface AIResponse {
  success: boolean
  result?: string
  error?: string
}

export async function polishText(request: PolishRequest): Promise<AIResponse> {
  const { text, style = 'professional' } = request
  await new Promise(resolve => setTimeout(resolve, 500))
  const stylePrefix: Record<string, string> = {
    professional: '[专业润色] ',
    casual: '[轻松润色] ',
    academic: '[学术润色] ',
  }
  return {
    success: true,
    result: `${stylePrefix[style]}${text}（AI润色功能即将上线，敬请期待）`,
  }
}

export async function translateText(request: TranslateRequest): Promise<AIResponse> {
  const { text, from, to } = request
  await new Promise(resolve => setTimeout(resolve, 500))
  const direction = `${from === 'zh' ? '中文' : 'English'} → ${to === 'zh' ? '中文' : 'English'}`
  return {
    success: true,
    result: `[${direction}] ${text}（AI翻译功能即将上线，敬请期待）`,
  }
}

async function summarizeText(text: string, maxLength: number = 200): Promise<AIResponse> {
  await new Promise(resolve => setTimeout(resolve, 300))
  return {
    success: true,
    result: text.length > maxLength ? text.substring(0, maxLength) + '...' : text,
  }
}

async function generateSuggestions(section: string): Promise<AIResponse> {
  await new Promise(resolve => setTimeout(resolve, 400))
  const suggestions: Record<string, string> = {
    summary: '建议突出您的核心竞争力和职业目标，控制在3-5句话。',
    education: '建议按时间倒序排列，突出与目标岗位相关的课程和成绩。',
    work: '建议使用STAR法则描述工作成果，多用数据量化成果。',
    projects: '建议详细描述您的角色和贡献，以及使用的技术栈。',
    skills: '建议将技能按熟练程度分类，突出与目标岗位匹配的技能。',
  }
  return {
    success: true,
    result: suggestions[section] || '暂无建议',
  }
}
