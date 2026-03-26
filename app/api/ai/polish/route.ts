import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/session'
import { polishText } from '@/server/ai'

const schema = z.object({
  text: z.string().min(1, '文本不能为空'),
  style: z.enum(['professional', 'casual', 'academic']).optional(),
  language: z.enum(['zh', 'en']).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const data = schema.parse(body)

    const result = await polishText(data)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Polish text error:', error)
    return NextResponse.json({ error: '润色失败' }, { status: 500 })
  }
}
