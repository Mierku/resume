import { NextRequest, NextResponse } from 'next/server'
import type OpenAI from 'openai'
import { getOpenAIClient } from '@/server/ai'

export async function POST(request: NextRequest) {
  try {
    const { value, options } = await request.json()

    if (!value || !options || !Array.isArray(options) || options.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const client = getOpenAIClient()

    const prompt = `你是一个表单选项精确匹配助手。用户想要选择"${value}"，请在给定选项中返回最精确、最等价的一项。

可用选项列表：
${options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}

要求：
1. 优先选择语义完全等价或业务含义完全一致的选项。
2. 如果没有可接受的匹配项，返回 "NO_MATCH"。
3. 只返回选项原始文本或 "NO_MATCH"，不要添加其他内容。
`

    // DashScope supports enable_thinking on the compatible endpoint, but the
    // current OpenAI SDK types do not declare it yet.
    const requestPayload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
      enable_thinking?: boolean
    } = {
      model: process.env.AI_MODEL || 'qwen-flash',
      messages: [
        {
          role: 'system',
          content: '你是一个表单选项精确匹配助手，擅长在候选项中返回最等价的结果。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      enable_thinking: false,
      temperature: 0.1,
      max_tokens: 100,
    }
    const response = await client.chat.completions.create(requestPayload)

    const matchedOption = response.choices[0]?.message?.content?.trim()

    if (!matchedOption || matchedOption === 'NO_MATCH') {
      return NextResponse.json({
        success: false,
        error: '未找到匹配的选项'
      })
    }

    const isValid = options.some(opt =>
      opt.trim().toLowerCase() === matchedOption.toLowerCase()
    )

    if (!isValid) {
      console.warn('[AI Match] AI 返回的选项不在原始列表中:', matchedOption)
      return NextResponse.json({
        success: false,
        error: 'AI 返回的选项无效'
      })
    }

    return NextResponse.json({
      success: true,
      matchedOption
    })

  } catch (error) {
    console.error('[AI Match] 错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '匹配失败'
      },
      { status: 500 }
    )
  }
}
