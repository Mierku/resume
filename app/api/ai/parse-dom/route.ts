import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

/**
 * POST /api/ai/parse-dom
 * 
 * 第一阶段：解析 DOM 结构，识别表单字段
 * TODO: Implement parseDOMStructure function in @/server/ai
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 解析请求体
    await request.json()

    // TODO: 调用 AI 解析 DOM
    // const result = await parseDOMStructure(snapshot)
    
    // Stub response
    return NextResponse.json({ 
      success: false, 
      error: 'parseDOMStructure not implemented yet' 
    }, { status: 501 })
  } catch (error) {
    console.error('Parse DOM error:', error)
    return NextResponse.json(
      { success: false, error: '解析 DOM 失败' },
      { status: 500 }
    )
  }
}
