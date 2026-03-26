import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { translateText } from '@/server/ai'

const schema = z.object({
  text: z.string().min(1, '文本不能为空'),
  from: z.enum(['zh', 'en']),
  to: z.enum(['zh', 'en']),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const data = schema.parse(body)

    const result = await translateText(data)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Translate text error:', error)
    return NextResponse.json({ error: '翻译失败' }, { status: 500 })
  }
}
