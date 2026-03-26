import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'

/**
 * POST /api/ai/plan
 * 
 * 第二阶段：匹配简历数据，生成填充计划
 * TODO: Implement generateFillPlan function in @/server/ai
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
    }

    // 解析请求体
    const { fields, resume }: { fields: unknown[]; resume: Record<string, unknown> } = await request.json()

    // 验证输入
    if (!Array.isArray(fields) || !resume) {
      return NextResponse.json(
        { success: false, error: '无效的请求参数' },
        { status: 400 }
      )
    }

    // TODO: 调用 AI 生成填充计划
    // const result = await generateFillPlan(fields, resume)
    
    // Stub response
    return NextResponse.json({ 
      success: false, 
      error: 'generateFillPlan not implemented yet' 
    }, { status: 501 })
  } catch (error) {
    console.error('Generate plan error:', error)
    return NextResponse.json(
      { success: false, error: '生成填充计划失败' },
      { status: 500 }
    )
  }
}
