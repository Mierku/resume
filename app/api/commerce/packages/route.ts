import { NextResponse } from 'next/server'
import { listActiveVipPackages } from '@/server/commerce/packages'

export async function GET() {
  try {
    const packages = await listActiveVipPackages()
    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Failed to load vip packages:', error)
    return NextResponse.json({ error: '套餐加载失败' }, { status: 500 })
  }
}
