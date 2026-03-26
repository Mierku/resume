import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/session'
import { completeOnboarding } from '@/server/onboarding'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    await completeOnboarding(user.id)
    return NextResponse.json({ message: '引导完成' })
  } catch (error) {
    console.error('Complete onboarding error:', error)
    return NextResponse.json({ error: '完成失败' }, { status: 500 })
  }
}
