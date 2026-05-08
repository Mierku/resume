import { randomBytes } from 'crypto'
import { getWechatPayConfig } from '@/server/payments/wechat-config'
import { buildWechatPayAuthorization } from '@/server/payments/wechat-signature'

interface CreateNativeWechatOrderInput {
  description: string
  outTradeNo: string
  amountFen: number
}

interface NativeWechatOrderResult {
  codeUrl: string
  responsePayload: unknown
  requestPayload: unknown
}

export async function createNativeWechatOrder(input: CreateNativeWechatOrderInput): Promise<NativeWechatOrderResult> {
  const config = getWechatPayConfig()
  const url = new URL('https://api.mch.weixin.qq.com/v3/pay/transactions/native')
  const requestPayload = {
    appid: config.appId,
    mchid: config.mchId,
    description: input.description,
    out_trade_no: input.outTradeNo,
    notify_url: config.notifyUrl,
    amount: {
      total: input.amountFen,
      currency: 'CNY',
    },
  }
  const body = JSON.stringify(requestPayload)
  const auth = buildWechatPayAuthorization({
    mchId: config.mchId,
    serialNo: config.merchantSerialNo,
    privateKeyPem: config.merchantPrivateKeyPem,
    method: 'POST',
    pathnameWithQuery: url.pathname,
    nonce: randomBytes(16).toString('hex'),
    body,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: auth.authorization,
      'User-Agent': 'immersive-delivery-website/1.0',
    },
    body,
    signal: AbortSignal.timeout(config.timeoutMs),
  })

  const responseText = await response.text()
  const responsePayload = responseText ? JSON.parse(responseText) : null

  if (!response.ok || !responsePayload?.code_url) {
    throw new Error(responsePayload?.message || '微信支付下单失败')
  }

  return {
    codeUrl: responsePayload.code_url,
    responsePayload,
    requestPayload,
  }
}
