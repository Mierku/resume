import { createHash, randomInt } from 'crypto'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, redis } from '@/lib/redis'

const EMAIL_PROVIDER = 'email_code'
const EMAIL_CODE_KEY_PREFIX = 'auth:email:code:'
const EMAIL_COOLDOWN_KEY_PREFIX = 'auth:email:cooldown:'

const CODE_TTL_SECONDS = 5 * 60
const SEND_COOLDOWN_SECONDS = 60
const SEND_RATE_LIMIT_WINDOW_SECONDS = 60 * 60
const SEND_RATE_LIMIT_MAX_PER_WINDOW = 10
const MAX_VERIFY_ATTEMPTS = 6

const EMAIL_CODE_SALT =
  process.env.AUTH_SECRET ?? process.env.SESSION_SECRET ?? 'immersive-email-auth-default-salt'

interface StoredEmailCode {
  hash: string
  attempts: number
  expiresAt: string
}

export class EmailAuthError extends Error {
  status: number
  code: string
  cooldownSeconds?: number

  constructor(message: string, options: { status: number; code: string; cooldownSeconds?: number }) {
    super(message)
    this.name = 'EmailAuthError'
    this.status = options.status
    this.code = options.code
    this.cooldownSeconds = options.cooldownSeconds
  }
}

export function isEmailAuthError(error: unknown): error is EmailAuthError {
  return error instanceof EmailAuthError
}

function normalizeEmail(rawEmail: string) {
  const normalized = rawEmail.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
  if (!emailRegex.test(normalized)) {
    return null
  }

  return normalized
}

function maskEmail(email: string) {
  const [local = '', domain = ''] = email.split('@')
  if (!local || !domain) {
    return email
  }

  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`
  }

  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`
}

function buildCodeKey(email: string) {
  return `${EMAIL_CODE_KEY_PREFIX}${encodeURIComponent(email)}`
}

function buildCooldownKey(email: string) {
  return `${EMAIL_COOLDOWN_KEY_PREFIX}${encodeURIComponent(email)}`
}

function hashEmailCode(email: string, code: string) {
  return createHash('sha256').update(`${email}:${code}:${EMAIL_CODE_SALT}`).digest('hex')
}

function generateEmailCode() {
  return randomInt(0, 1000000).toString().padStart(6, '0')
}

async function getKeyTtlSeconds(key: string) {
  const ttl = await redis.ttl(key)
  return ttl > 0 ? ttl : 0
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = process.env.SMTP_FROM?.trim()

  if (!host || !Number.isFinite(port) || !from) {
    return null
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    from,
  }
}

async function sendCodeEmail(email: string, code: string, expiresInSeconds: number) {
  const smtp = getSmtpConfig()
  if (!smtp) {
    return false
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  })

  const expiresInMinutes = Math.ceil(expiresInSeconds / 60)

  await transporter.sendMail({
    from: smtp.from,
    to: email,
    subject: '沉浸式网申登录验证码',
    text: `你的验证码是 ${code}，${expiresInMinutes} 分钟内有效。`,
    html: `<p>你的验证码是 <strong style="font-size: 20px">${code}</strong>，${expiresInMinutes} 分钟内有效。</p>`,
  })

  return true
}

function ensureEmailProviderAvailable() {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  if (process.env.AUTH_EMAIL_PROVIDER === 'mock') {
    return
  }

  if (getSmtpConfig()) {
    return
  }

  throw new EmailAuthError('邮箱服务暂未配置，请联系管理员', {
    status: 503,
    code: 'EMAIL_UNAVAILABLE',
  })
}

export async function sendEmailLoginCode(rawEmail: string) {
  const normalizedEmail = normalizeEmail(rawEmail)
  if (!normalizedEmail) {
    throw new EmailAuthError('请输入有效邮箱地址', {
      status: 400,
      code: 'INVALID_EMAIL',
    })
  }

  const cooldownKey = buildCooldownKey(normalizedEmail)
  const existingCooldown = await getKeyTtlSeconds(cooldownKey)
  if (existingCooldown > 0) {
    throw new EmailAuthError(`请求过于频繁，请 ${existingCooldown}s 后重试`, {
      status: 429,
      code: 'COOLDOWN_ACTIVE',
      cooldownSeconds: existingCooldown,
    })
  }

  const rateLimit = await checkRateLimit(
    `auth:email:send:${normalizedEmail}`,
    SEND_RATE_LIMIT_MAX_PER_WINDOW,
    SEND_RATE_LIMIT_WINDOW_SECONDS,
  )

  if (!rateLimit.allowed) {
    throw new EmailAuthError('请求次数过多，请稍后再试', {
      status: 429,
      code: 'RATE_LIMITED',
    })
  }

  ensureEmailProviderAvailable()

  const code = generateEmailCode()
  const codeKey = buildCodeKey(normalizedEmail)
  const payload: StoredEmailCode = {
    hash: hashEmailCode(normalizedEmail, code),
    attempts: 0,
    expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString(),
  }

  await redis.set(codeKey, JSON.stringify(payload), 'EX', CODE_TTL_SECONDS)
  await redis.set(cooldownKey, '1', 'EX', SEND_COOLDOWN_SECONDS)

  let sentByProvider = false
  try {
    sentByProvider = await sendCodeEmail(normalizedEmail, code, CODE_TTL_SECONDS)
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      throw new EmailAuthError('验证码邮件发送失败，请稍后重试', {
        status: 503,
        code: 'EMAIL_SEND_FAILED',
      })
    }

    console.error('Send email login code failed (dev mode fallback):', error)
  }

  if (!sentByProvider) {
    console.info(`[email-auth] OTP code for ${normalizedEmail}: ${code}`)
  }

  return {
    email: normalizedEmail,
    maskedEmail: maskEmail(normalizedEmail),
    cooldownSeconds: SEND_COOLDOWN_SECONDS,
    expiresInSeconds: CODE_TTL_SECONDS,
    devCode: process.env.NODE_ENV !== 'production' ? code : undefined,
  }
}

async function consumeEmailCode(normalizedEmail: string, rawCode: string) {
  const code = rawCode.trim()
  if (!/^\d{6}$/.test(code)) {
    throw new EmailAuthError('请输入 6 位数字验证码', {
      status: 400,
      code: 'INVALID_CODE_FORMAT',
    })
  }

  const codeKey = buildCodeKey(normalizedEmail)
  const rawPayload = await redis.get(codeKey)
  if (!rawPayload) {
    throw new EmailAuthError('验证码已过期，请重新获取', {
      status: 400,
      code: 'CODE_EXPIRED',
    })
  }

  let payload: StoredEmailCode
  try {
    payload = JSON.parse(rawPayload) as StoredEmailCode
  } catch {
    await redis.del(codeKey)
    throw new EmailAuthError('验证码状态异常，请重新获取', {
      status: 400,
      code: 'CODE_INVALID_STATE',
    })
  }

  if (!payload.expiresAt || Date.now() >= new Date(payload.expiresAt).getTime()) {
    await redis.del(codeKey)
    throw new EmailAuthError('验证码已过期，请重新获取', {
      status: 400,
      code: 'CODE_EXPIRED',
    })
  }

  if ((payload.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
    await redis.del(codeKey)
    throw new EmailAuthError('验证码错误次数过多，请重新获取', {
      status: 400,
      code: 'TOO_MANY_ATTEMPTS',
    })
  }

  const expectedHash = hashEmailCode(normalizedEmail, code)
  if (expectedHash !== payload.hash) {
    const nextPayload: StoredEmailCode = {
      ...payload,
      attempts: (payload.attempts || 0) + 1,
    }

    const ttl = await getKeyTtlSeconds(codeKey)
    if (ttl > 0) {
      await redis.set(codeKey, JSON.stringify(nextPayload), 'EX', ttl)
    }

    throw new EmailAuthError('验证码错误，请重新输入', {
      status: 400,
      code: 'CODE_MISMATCH',
    })
  }

  await redis.del(codeKey)
  await redis.del(buildCooldownKey(normalizedEmail))
}

function deriveEmailUserName(normalizedEmail: string) {
  const [localPart = ''] = normalizedEmail.split('@')
  const name = localPart.trim().slice(0, 24)
  return name || '邮箱用户'
}

async function upsertEmailAccount(normalizedEmail: string) {
  return prisma.$transaction(async tx => {
    const existingAccount = await tx.account.findFirst({
      where: {
        provider: EMAIL_PROVIDER,
        providerAccountId: normalizedEmail,
      },
      select: {
        userId: true,
      },
    })

    if (existingAccount) {
      await tx.user.update({
        where: { id: existingAccount.userId },
        data: {
          email: normalizedEmail,
          emailVerified: new Date(),
        },
      })

      return {
        userId: existingAccount.userId,
        isNewUser: false,
      }
    }

    const existingUser = await tx.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (existingUser) {
      await tx.account.create({
        data: {
          userId: existingUser.id,
          type: 'email',
          provider: EMAIL_PROVIDER,
          providerAccountId: normalizedEmail,
        },
      })

      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          emailVerified: new Date(),
        },
      })

      return {
        userId: existingUser.id,
        isNewUser: false,
      }
    }

    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        emailVerified: new Date(),
        name: deriveEmailUserName(normalizedEmail),
        accounts: {
          create: {
            type: 'email',
            provider: EMAIL_PROVIDER,
            providerAccountId: normalizedEmail,
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

export async function verifyEmailLoginCode(rawEmail: string, rawCode: string) {
  const normalizedEmail = normalizeEmail(rawEmail)
  if (!normalizedEmail) {
    throw new EmailAuthError('请输入有效邮箱地址', {
      status: 400,
      code: 'INVALID_EMAIL',
    })
  }

  await consumeEmailCode(normalizedEmail, rawCode)
  const account = await upsertEmailAccount(normalizedEmail)

  return {
    userId: account.userId,
    isNewUser: account.isNewUser,
    email: normalizedEmail,
  }
}
