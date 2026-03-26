import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { getOnboardingStatus } from '@/server/onboarding'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const status = await getOnboardingStatus(user.id)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Get onboarding status error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
