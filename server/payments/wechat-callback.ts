import crypto from 'crypto'
import { fulfillPaidOrder, recordWechatWebhookEvent } from '@/server/commerce/orders'
import { getWechatPayConfig } from '@/server/payments/wechat-config'
import { decryptWechatPayResource, verifyWechatPaySignature } from '@/server/payments/wechat-signature'

interface WechatCallbackHeaders {
  serial: string
  signature: string
  timestamp: string
  nonce: string
}

export function parseWechatCallbackHeaders(headers: Headers): WechatCallbackHeaders {
  const serial = headers.get('Wechatpay-Serial') || ''
  const signature = headers.get('Wechatpay-Signature') || ''
  const timestamp = headers.get('Wechatpay-Timestamp') || ''
  const nonce = headers.get('Wechatpay-Nonce') || ''

  if (!serial || !signature || !timestamp || !nonce) {
    throw new Error('微信支付回调头缺失')
  }

  return { serial, signature, timestamp, nonce }
}

export async function handleWechatPaymentCallback(rawBody: string, headers: WechatCallbackHeaders) {
  const config = getWechatPayConfig()
  const dedupeKey = crypto
    .createHash('sha256')
    .update(`${headers.timestamp}:${headers.nonce}:${rawBody}`)
    .digest('hex')

  const event = await recordWechatWebhookEvent({
    dedupeKey,
    serial: headers.serial,
    signature: headers.signature,
    timestamp: headers.timestamp,
    nonce: headers.nonce,
    bodyText: rawBody,
  })

  const verified = verifyWechatPaySignature({
    serial: headers.serial,
    signature: headers.signature,
    timestamp: headers.timestamp,
    nonce: headers.nonce,
    body: rawBody,
    publicKeyPem: config.publicKeyPem,
  })

  if (!verified) {
    throw new Error('微信支付回调验签失败')
  }

  const parsed = JSON.parse(rawBody) as {
    event_type?: string
    resource?: {
      algorithm: string
      associated_data?: string
      nonce: string
      ciphertext: string
    }
  }

  if (!parsed.resource?.nonce || !parsed.resource?.ciphertext) {
    throw new Error('微信支付回调缺少资源体')
  }

  const decrypted = decryptWechatPayResource({
    apiV3Key: config.apiV3Key,
    associatedData: parsed.resource.associated_data,
    nonce: parsed.resource.nonce,
    ciphertext: parsed.resource.ciphertext,
  })

  const resource = JSON.parse(decrypted) as {
    out_trade_no?: string
    transaction_id?: string
    trade_state?: string
  }

  await recordWechatWebhookEvent({
    orderId: null,
    paymentAttemptId: null,
    dedupeKey,
    eventType: parsed.event_type || 'TRANSACTION.SUCCESS',
    serial: headers.serial,
    signature: headers.signature,
    timestamp: headers.timestamp,
    nonce: headers.nonce,
    bodyText: rawBody,
    status: 'verified',
  })

  if (resource.trade_state !== 'SUCCESS' || !resource.out_trade_no) {
    return {
      ok: true,
      ignored: true,
      resource,
      event,
    }
  }

  const fulfilled = await fulfillPaidOrder({
    orderNumber: resource.out_trade_no,
    gatewayTransactionId: resource.transaction_id,
  })

  return {
    ok: true,
    fulfilled,
    resource,
    event,
  }
}
