import { NextRequest, NextResponse } from 'next/server'
import { handleWechatPaymentCallback, parseWechatCallbackHeaders } from '@/server/payments/wechat-callback'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const headers = parseWechatCallbackHeaders(request.headers)
    await handleWechatPaymentCallback(rawBody, headers)

    return new NextResponse('', { status: 204 })
  } catch (error) {
    console.error('Wechat native callback failed:', error)
    return NextResponse.json({ error: '回调处理失败' }, { status: 400 })
  }
}
