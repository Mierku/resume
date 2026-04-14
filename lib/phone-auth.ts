import { createHash, randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, redis } from '@/lib/redis'

const PHONE_PROVIDER = 'phone_sms'
const PHONE_CODE_KEY_PREFIX = 'auth:phone:code:'
const PHONE_COOLDOWN_KEY_PREFIX = 'auth:phone:cooldown:'

const CODE_TTL_SECONDS = 5 * 60
const SEND_COOLDOWN_SECONDS = 60
const SEND_RATE_LIMIT_WINDOW_SECONDS = 60 * 60
const SEND_RATE_LIMIT_MAX_PER_WINDOW = 8
const MAX_VERIFY_ATTEMPTS = 6

const PHONE_CODE_SALT =
  process.env.AUTH_SECRET ?? process.env.SESSION_SECRET ?? 'immersive-phone-auth-default-salt'

interface StoredPhoneCode {
  hash: string
  attempts: number
  expiresAt: string
}

class PhoneAuthError extends Error {
  status: number
  code: string
  cooldownSeconds?: number

  constructor(message: string, options: { status: number; code: string; cooldownSeconds?: number }) {
    super(message)
    this.name = 'PhoneAuthError'
    this.status = options.status
    this.code = options.code
    this.cooldownSeconds = options.cooldownSeconds
  }
}

export function isPhoneAuthError(error: unknown): error is PhoneAuthError {
  return error instanceof PhoneAuthError
}

function normalizePhoneNumber(rawPhone: string) {
  const trimmed = rawPhone.trim()
  if (!trimmed) {
    return null
  }

  const digitsOnly = trimmed.replace(/[^\d+]/g, '')
  const withoutCountryCode = digitsOnly.replace(/^\+?86/, '')

  if (!/^1\d{10}$/.test(withoutCountryCode)) {
    return null
  }

  return withoutCountryCode
}

function maskPhoneNumber(phone: string) {
  if (phone.length < 7) {
    return phone
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

function buildCodeKey(phone: string) {
  return `${PHONE_CODE_KEY_PREFIX}${phone}`
}

function buildCooldownKey(phone: string) {
  return `${PHONE_COOLDOWN_KEY_PREFIX}${phone}`
}

function hashPhoneCode(phone: string, code: string) {
  return createHash('sha256').update(`${phone}:${code}:${PHONE_CODE_SALT}`).digest('hex')
}

function generatePhoneCode() {
  return randomInt(0, 1000000).toString().padStart(6, '0')
}

async function getKeyTtlSeconds(key: string) {
  const ttl = await redis.ttl(key)
  return ttl > 0 ? ttl : 0
}

function ensureSmsProviderAvailable() {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  if (process.env.AUTH_SMS_PROVIDER === 'mock') {
    return
  }

  throw new PhoneAuthError('短信服务暂未配置，请联系管理员', {
    status: 503,
    code: 'SMS_UNAVAILABLE',
  })
}

export async function sendPhoneLoginCode(rawPhone: string) {
  const normalizedPhone = normalizePhoneNumber(rawPhone)
  if (!normalizedPhone) {
    throw new PhoneAuthError('请输入有效的中国大陆手机号', {
      status: 400,
      code: 'INVALID_PHONE',
    })
  }

  const cooldownKey = buildCooldownKey(normalizedPhone)
  const existingCooldown = await getKeyTtlSeconds(cooldownKey)
  if (existingCooldown > 0) {
    throw new PhoneAuthError(`请求过于频繁，请 ${existingCooldown}s 后重试`, {
      status: 429,
      code: 'COOLDOWN_ACTIVE',
      cooldownSeconds: existingCooldown,
    })
  }

  const rateLimit = await checkRateLimit(
    `auth:phone:send:${normalizedPhone}`,
    SEND_RATE_LIMIT_MAX_PER_WINDOW,
    SEND_RATE_LIMIT_WINDOW_SECONDS,
  )

  if (!rateLimit.allowed) {
    throw new PhoneAuthError('请求次数过多，请稍后再试', {
      status: 429,
      code: 'RATE_LIMITED',
    })
  }

  ensureSmsProviderAvailable()

  const code = generatePhoneCode()
  const codeKey = buildCodeKey(normalizedPhone)
  const payload: StoredPhoneCode = {
    hash: hashPhoneCode(normalizedPhone, code),
    attempts: 0,
    expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
  }

  await redis.set(codeKey, JSON.stringify(payload), 'EX', CODE_TTL_SECONDS)
  await redis.set(cooldownKey, '1', 'EX', SEND_COOLDOWN_SECONDS)

  if (process.env.NODE_ENV !== 'production' || process.env.AUTH_SMS_PROVIDER === 'mock') {
    console.info(`[phone-auth] OTP code for ${normalizedPhone}: ${code}`)
  }

  return {
    phone: normalizedPhone,
    maskedPhone: maskPhoneNumber(normalizedPhone),
    cooldownSeconds: SEND_COOLDOWN_SECONDS,
    expiresInSeconds: CODE_TTL_SECONDS,
    devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
  }
}

async function consumePhoneCode(normalizedPhone: string, rawCode: string) {
  const code = rawCode.trim()
  if (!/^\d{6}$/.test(code)) {
    throw new PhoneAuthError('请输入 6 位数字验证码', {
      status: 400,
      code: 'INVALID_CODE_FORMAT',
    })
  }

  const codeKey = buildCodeKey(normalizedPhone)
  const rawPayload = await redis.get(codeKey)
  if (!rawPayload) {
    throw new PhoneAuthError('验证码已过期，请重新获取', {
      status: 400,
      code: 'CODE_EXPIRED',
    })
  }

  let payload: StoredPhoneCode
  try {
    payload = JSON.parse(rawPayload) as StoredPhoneCode
  } catch {
    await redis.del(codeKey)
    throw new PhoneAuthError('验证码状态异常，请重新获取', {
      status: 400,
      code: 'CODE_INVALID_STATE',
    })
  }

  if (!payload.expiresAt || Date.now() >= new Date(payload.expiresAt).getTime()) {
    await redis.del(codeKey)
    throw new PhoneAuthError('验证码已过期，请重新获取', {
      status: 400,
      code: 'CODE_EXPIRED',
    })
  }

  if ((payload.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
    await redis.del(codeKey)
    throw new PhoneAuthError('验证码错误次数过多，请重新获取', {
      status: 400,
      code: 'TOO_MANY_ATTEMPTS',
    })
  }

  const expectedHash = hashPhoneCode(normalizedPhone, code)
  if (expectedHash !== payload.hash) {
    const nextPayload: StoredPhoneCode = {
      ...payload,
      attempts: (payload.attempts || 0) + 1,
    }
    const ttl = await getKeyTtlSeconds(codeKey)
    if (ttl > 0) {
      await redis.set(codeKey, JSON.stringify(nextPayload), 'EX', ttl)
    }

    throw new PhoneAuthError('验证码错误，请重新输入', {
      status: 400,
      code: 'CODE_MISMATCH',
    })
  }

  await redis.del(codeKey)
  await redis.del(buildCooldownKey(normalizedPhone))
}

async function upsertPhoneAccount(normalizedPhone: string) {
  return prisma.$transaction(async tx => {
    const existing = await tx.account.findFirst({
      where: {
        provider: PHONE_PROVIDER,
        providerAccountId: normalizedPhone,
      },
      select: {
        userId: true,
      },
    })

    if (existing) {
      return {
        userId: existing.userId,
        isNewUser: false,
      }
    }

    const user = await tx.user.create({
      data: {
        name: `手机用户${normalizedPhone.slice(-4)}`,
        accounts: {
          create: {
            type: 'credentials',
            provider: PHONE_PROVIDER,
            providerAccountId: normalizedPhone,
          },
        },
      },
      select: {
        id: true,
      },
    })

    return {
      userId: user.id,
      isNewUser: true,
    }
  })
}

export async function verifyPhoneLoginCode(rawPhone: string, rawCode: string) {
  const normalizedPhone = normalizePhoneNumber(rawPhone)
  if (!normalizedPhone) {
    throw new PhoneAuthError('请输入有效的中国大陆手机号', {
      status: 400,
      code: 'INVALID_PHONE',
    })
  }

  await consumePhoneCode(normalizedPhone, rawCode)
  const account = await upsertPhoneAccount(normalizedPhone)

  return {
    userId: account.userId,
    isNewUser: account.isNewUser,
    phone: normalizedPhone,
  }
}
