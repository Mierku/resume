import { NextRequest, NextResponse } from 'next/server'
import {
  getWechatOfficialVerificationChallenge,
  handleWechatOfficialLoginEvent,
  parseWechatOfficialCallback,
} from '@/lib/wechat-official'

const WECHAT_CALLBACK_CONTENT_TYPE = 'text/html; charset=utf-8'

export async function GET(request: NextRequest) {
  try {
    const challenge = getWechatOfficialVerificationChallenge(request)
    if (!challenge) {
      return new NextResponse('invalid signature', {
        status: 401,
        headers: {
          'Content-Type': WECHAT_CALLBACK_CONTENT_TYPE,
        },
      })
    }

    return new NextResponse(challenge, {
      status: 200,
      headers: {
        'Content-Type': WECHAT_CALLBACK_CONTENT_TYPE,
      },
    })
  } catch (error) {
    console.error('Verify WeChat Official Account callback failed:', error)
    return new NextResponse('verification failed', {
      status: 500,
      headers: {
        'Content-Type': WECHAT_CALLBACK_CONTENT_TYPE,
      },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { payload } = await parseWechatOfficialCallback(request)
    await handleWechatOfficialLoginEvent(payload)

    return new NextResponse('success', {
      status: 200,
      headers: {
        'Content-Type': WECHAT_CALLBACK_CONTENT_TYPE,
      },
    })
  } catch (error) {
    console.error('Handle WeChat Official Account callback failed:', error)
    const message = error instanceof Error ? error.message : ''
    const status = message.toLowerCase().includes('signature') ? 401 : 500
    return new NextResponse('failed', {
      status,
      headers: {
        'Content-Type': WECHAT_CALLBACK_CONTENT_TYPE,
      },
    })
  }
}
