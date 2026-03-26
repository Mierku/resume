import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { generateFillPlanStream, type DOMSnapshot } from '@/server/ai'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/ai/auto-fill
 * 
 * SSE 流式两阶段 AI 填表：
 * 1. 解析 DOM 结构（一次性返回）
 * 2. 匹配简历数据（流式返回 JSON chunks）
 * 
 * SSE 事件格式：
 * - event: stage1   data: { fields: [...] }     第一阶段完成
 * - event: chunk    data: "json text chunk"      第二阶段流式 JSON 片段
 * - event: done     data: {}                     全部完成
 * - event: error    data: { error: "..." }       错误
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const { snapshot, dataSourceId }: { 
      snapshot: DOMSnapshot
      dataSourceId: string 
    } = await request.json()

    if (!snapshot || !dataSourceId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId, userId: user.id }
    })

    if (!dataSource) {
      return NextResponse.json(
        { success: false, error: '数据源不存在' },
        { status: 404 }
      )
    }

    // 第一阶段：解析 DOM（一次性）
    console.log('[AutoFill] Stage 1: Parsing DOM structure...')
    // const parseResult = await parseDOMStructure(snapshot)
    // if (!parseResult.success || !parseResult.data) {
    //   return NextResponse.json({
    //     success: false,
    //     error: parseResult.error || 'DOM 解析失败'
    //   }, { status: 500 })
    // }

    // 第二阶段：流式匹配
    console.log('[AutoFill] Stage 2: Streaming resume match...')
    const aiStream = await generateFillPlanStream(snapshot, dataSource as any)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        // 发送第一阶段结果
        // controller.enqueue(encoder.encode(`event: stage1\ndata: ${JSON.stringify({ fields: parseResult.data })}\n\n`))

        try {
          for await (const chunk of aiStream) {
            const delta = chunk.choices[0]?.delta?.content
            if (delta) {
              controller.enqueue(encoder.encode(`event: chunk\ndata: ${JSON.stringify(delta)}\n\n`))
            }
          }
          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`))
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`))
        }
        controller.close()
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Auto fill error:', error)
    return NextResponse.json(
      { success: false, error: '自动填写失败' },
      { status: 500 }
    )
  }
}
