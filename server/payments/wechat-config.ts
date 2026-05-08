import { readFileSync } from 'fs'

interface WechatPayConfig {
  mchId: string
  appId: string
  apiV3Key: string
  notifyUrl: string
  merchantSerialNo: string
  merchantPrivateKeyPem: string
  publicKeyId: string
  publicKeyPem: string
  timeoutMs: number
}

export function getWechatPayConfig(): WechatPayConfig {
  const merchantPrivateKeyPem =
    process.env.WECHAT_PAY_MERCHANT_PRIVATE_KEY_PEM?.trim() ||
    readOptionalFile(process.env.WECHAT_PAY_MERCHANT_PRIVATE_KEY_PATH)
  const publicKeyPem =
    process.env.WECHAT_PAY_PUBLIC_KEY_PEM?.trim() ||
    readOptionalFile(process.env.WECHAT_PAY_PUBLIC_KEY_PATH)

  return {
    mchId: requireEnv('WECHAT_PAY_MCH_ID'),
    appId: requireEnv('WECHAT_PAY_APP_ID'),
    apiV3Key: requireEnv('WECHAT_PAY_API_V3_KEY'),
    notifyUrl: requireEnv('WECHAT_PAY_NOTIFY_URL'),
    merchantSerialNo: requireEnv('WECHAT_PAY_MERCHANT_SERIAL_NO'),
    merchantPrivateKeyPem: merchantPrivateKeyPem || '',
    publicKeyId: requireEnv('WECHAT_PAY_PUBLIC_KEY_ID'),
    publicKeyPem: publicKeyPem || '',
    timeoutMs: Number(process.env.WECHAT_PAY_TIMEOUT_MS || '10000'),
  }
}

export function isWechatPayConfigured() {
  try {
    const config = getWechatPayConfig()
    return Boolean(config.merchantPrivateKeyPem && config.publicKeyPem)
  } catch {
    return false
  }
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is required`)
  }
  return value
}

function readOptionalFile(path: string | undefined) {
  if (!path?.trim()) {
    return ''
  }
  return readFileSync(path, 'utf8').trim()
}
