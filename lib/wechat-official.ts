import { createDecipheriv, createHash, randomBytes } from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { createAuthSession, type CreatedAuthSession } from '@/lib/auth-session'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import type { BindingConflictUserSummary } from '@/server/account-binding'
import { prepareWechatBinding } from '@/server/account-binding'

const WECHAT_OFFICIAL_PROVIDER = 'wechat_official'
const WECHAT_ACCESS_TOKEN_CACHE_KEY = 'auth:wechat-official:access-token'
const WECHAT_LOGIN_ATTEMPT_PREFIX = 'auth:wechat-official:attempt:'
const WECHAT_BIND_ATTEMPT_PREFIX = 'account:bind:wechat-official:attempt:'
const WECHAT_LOGIN_SCENE_PREFIX = 'login_oa_'
const WECHAT_BIND_SCENE_PREFIX = 'bind_oa_'

const WECHAT_LOGIN_QR_EXPIRE_SECONDS = 300
const WECHAT_LOGIN_ATTEMPT_TTL_SECONDS = WECHAT_LOGIN_QR_EXPIRE_SECONDS + 120

type WechatOfficialAttemptStatus = 'pending' | 'authenticated' | 'failed'
type WechatOfficialBindingAttemptStatus = 'pending' | 'bound' | 'needs_confirmation' | 'failed'

interface WechatOfficialLoginAttempt {
  attemptId: string
  pollToken: string
  scene: string
  status: WechatOfficialAttemptStatus
  nextPath: string
  qrCodeUrl: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  userId?: string
  openId?: string
  displayName?: string | null
  avatarUrl?: string | null
  sessionToken?: string
  sessionExpiresAt?: string
  errorMessage?: string
}

interface WechatOfficialBindingAttempt {
  attemptId: string
  pollToken: string
  scene: string
  status: WechatOfficialBindingAttemptStatus
  targetUserId: string
  qrCodeUrl: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  openId?: string
  displayName?: string | null
  avatarUrl?: string | null
  conflictToken?: string
  otherUser?: BindingConflictUserSummary
  errorMessage?: string
}

interface WechatOfficialConfig {
  appId: string
  appSecret: string
  token: string
  encodingAesKey: string | null
}

interface WechatQrCodeResponse {
  ticket: string
  expire_seconds?: number
  url?: string
}

interface WechatOfficialUserInfo {
  subscribe?: number
  openid: string
  nickname?: string
  headimgurl?: string
}

interface WechatOfficialStartResult {
  attemptId: string
  pollToken: string
  qrCodeUrl: string
  expiresAt: string
}

interface WechatOfficialBindingStartResult {
  attemptId: string
  pollToken: string
  qrCodeUrl: string
  expiresAt: string
}

interface WechatOfficialPollStatus {
  status: 'pending' | 'authenticated' | 'expired' | 'failed' | 'invalid'
  expiresAt?: string
  redirectTo?: string
  message?: string
  session?: CreatedAuthSession
}

interface WechatOfficialBindingPollStatus {
  status: 'pending' | 'bound' | 'needs_confirmation' | 'expired' | 'failed' | 'invalid'
  expiresAt?: string
  message?: string
  conflictToken?: string
  otherUser?: BindingConflictUserSummary
}

interface ParsedWechatOfficialMessage {
  payload: Record<string, string>
  encrypted: boolean
}

function getWechatOfficialConfig(): WechatOfficialConfig {
  const appId = process.env.WECHAT_OA_APP_ID?.trim()
  const appSecret = process.env.WECHAT_OA_APP_SECRET?.trim()
  const token = process.env.WECHAT_OA_TOKEN?.trim()
  const encodingAesKey = process.env.WECHAT_OA_ENCODING_AES_KEY?.trim() || null

  if (!appId || !appSecret || !token) {
    throw new Error('WeChat Official Account login is not fully configured')
  }

  return {
    appId,
    appSecret,
    token,
    encodingAesKey,
  }
}

export function isWechatOfficialLoginConfigured() {
  return Boolean(
    process.env.WECHAT_OA_APP_ID?.trim() &&
      process.env.WECHAT_OA_APP_SECRET?.trim() &&
      process.env.WECHAT_OA_TOKEN?.trim(),
  )
}

function getAttemptRedisKey(attemptId: string) {
  return `${WECHAT_LOGIN_ATTEMPT_PREFIX}${attemptId}`
}

function getBindingAttemptRedisKey(attemptId: string) {
  return `${WECHAT_BIND_ATTEMPT_PREFIX}${attemptId}`
}

function buildScene(attemptId: string) {
  return `${WECHAT_LOGIN_SCENE_PREFIX}${attemptId}`
}

function buildBindingScene(attemptId: string) {
  return `${WECHAT_BIND_SCENE_PREFIX}${attemptId}`
}

function extractAttemptIdFromScene(scene: string) {
  if (!scene.startsWith(WECHAT_LOGIN_SCENE_PREFIX)) {
    return null
  }

  const attemptId = scene.slice(WECHAT_LOGIN_SCENE_PREFIX.length)
  return /^[a-f0-9]{32}$/i.test(attemptId) ? attemptId.toLowerCase() : null
}

function extractBindingAttemptIdFromScene(scene: string) {
  if (!scene.startsWith(WECHAT_BIND_SCENE_PREFIX)) {
    return null
  }

  const attemptId = scene.slice(WECHAT_BIND_SCENE_PREFIX.length)
  return /^[a-f0-9]{32}$/i.test(attemptId) ? attemptId.toLowerCase() : null
}

function parseXmlFields(xml: string) {
  const fields: Record<string, string> = {}
  const trimmed = xml.trim()
  const rootMatch = trimmed.match(/<xml>([\s\S]*)<\/xml>/i)
  const innerXml = rootMatch ? rootMatch[1] : trimmed
  const tagPattern = /<([A-Za-z0-9_]+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([\s\S]*?))<\/\1>/g

  let match: RegExpExecArray | null
  while ((match = tagPattern.exec(innerXml))) {
    const [, tagName, cdataValue, rawValue] = match
    fields[tagName] = cdataValue ?? rawValue ?? ''
  }

  return fields
}

function buildWechatSignature(parts: string[]) {
  return createHash('sha1').update(parts.sort().join('')).digest('hex')
}

function isSignatureValid(expected: string, received: string | null) {
  return Boolean(received && expected === received)
}

function decodeEncodingAesKey() {
  const { encodingAesKey } = getWechatOfficialConfig()

  if (!encodingAesKey) {
    throw new Error('WECHAT_OA_ENCODING_AES_KEY is required for encrypted callbacks')
  }

  return Buffer.from(`${encodingAesKey}=`, 'base64')
}

function stripPkcs7Padding(buffer: Buffer) {
  const padding = buffer[buffer.length - 1]
  if (!padding || padding < 1 || padding > 32) {
    throw new Error('Invalid WeChat callback padding')
  }

  return buffer.subarray(0, buffer.length - padding)
}

function decryptEncryptedMessage(encryptedPayload: string) {
  const { appId } = getWechatOfficialConfig()
  const aesKey = decodeEncodingAesKey()
  const decipher = createDecipheriv('aes-256-cbc', aesKey, aesKey.subarray(0, 16))
  decipher.setAutoPadding(false)

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPayload, 'base64')),
    decipher.final(),
  ])
  const unpadded = stripPkcs7Padding(decrypted)
  const xmlLength = unpadded.readUInt32BE(16)
  const xmlStart = 20
  const xmlEnd = xmlStart + xmlLength
  const xml = unpadded.subarray(xmlStart, xmlEnd).toString('utf8')
  const receivedAppId = unpadded.subarray(xmlEnd).toString('utf8')

  if (receivedAppId !== appId) {
    throw new Error('WeChat callback appId mismatch')
  }

  return xml
}

async function readWechatJson<T>(url: URL, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
  })
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok) {
    throw new Error(`WeChat API request failed with status ${response.status}`)
  }

  if (data && typeof data.errcode === 'number' && data.errcode !== 0) {
    const errCode = String(data.errcode)
    const errMsg = typeof data.errmsg === 'string' ? data.errmsg : 'unknown error'
    throw new Error(`WeChat API error ${errCode}: ${errMsg}`)
  }

  return data as T
}

async function getWechatAccessToken() {
  const cached = await redis.get(WECHAT_ACCESS_TOKEN_CACHE_KEY)
  if (cached) {
    return cached
  }

  const { appId, appSecret } = getWechatOfficialConfig()
  const url = new URL('https://api.weixin.qq.com/cgi-bin/token')
  url.searchParams.set('grant_type', 'client_credential')
  url.searchParams.set('appid', appId)
  url.searchParams.set('secret', appSecret)

  const data = await readWechatJson<{ access_token: string; expires_in: number }>(url)
  const ttlSeconds = Math.max(60, Number(data.expires_in || 0) - 300)
  await redis.set(WECHAT_ACCESS_TOKEN_CACHE_KEY, data.access_token, 'EX', ttlSeconds)

  return data.access_token
}

async function createTemporaryQrCode(scene: string) {
  const accessToken = await getWechatAccessToken()
  const url = new URL('https://api.weixin.qq.com/cgi-bin/qrcode/create')
  url.searchParams.set('access_token', accessToken)

  const data = await readWechatJson<WechatQrCodeResponse>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      expire_seconds: WECHAT_LOGIN_QR_EXPIRE_SECONDS,
      action_name: 'QR_STR_SCENE',
      action_info: {
        scene: {
          scene_str: scene,
        },
      },
    }),
  })

  return {
    ticket: data.ticket,
    qrCodeUrl: `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(data.ticket)}`,
  }
}

async function sendWechatOfficialTextMessage(openId: string, content: string) {
  const accessToken = await getWechatAccessToken()
  const url = new URL('https://api.weixin.qq.com/cgi-bin/message/custom/send')
  url.searchParams.set('access_token', accessToken)

  await readWechatJson<Record<string, unknown>>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      touser: openId,
      msgtype: 'text',
      text: {
        content,
      },
    }),
  })
}

async function saveAttempt(attempt: WechatOfficialLoginAttempt) {
  await redis.set(
    getAttemptRedisKey(attempt.attemptId),
    JSON.stringify(attempt),
    'EX',
    WECHAT_LOGIN_ATTEMPT_TTL_SECONDS,
  )
}

async function saveBindingAttempt(attempt: WechatOfficialBindingAttempt) {
  await redis.set(
    getBindingAttemptRedisKey(attempt.attemptId),
    JSON.stringify(attempt),
    'EX',
    WECHAT_LOGIN_ATTEMPT_TTL_SECONDS,
  )
}

async function getWechatOfficialLoginAttempt(attemptId: string) {
  const raw = await redis.get(getAttemptRedisKey(attemptId))
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as WechatOfficialLoginAttempt
  } catch {
    await redis.del(getAttemptRedisKey(attemptId))
    return null
  }
}

async function getWechatOfficialBindingAttempt(attemptId: string) {
  const raw = await redis.get(getBindingAttemptRedisKey(attemptId))
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as WechatOfficialBindingAttempt
  } catch {
    await redis.del(getBindingAttemptRedisKey(attemptId))
    return null
  }
}

function isAttemptExpired(attempt: Pick<WechatOfficialLoginAttempt, 'expiresAt'>) {
  return Date.now() >= new Date(attempt.expiresAt).getTime()
}

export async function createWechatOfficialLoginAttempt(nextPath: string): Promise<WechatOfficialStartResult> {
  getWechatOfficialConfig()

  const attemptId = randomBytes(16).toString('hex')
  const pollToken = randomBytes(24).toString('hex')
  const scene = buildScene(attemptId)
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + WECHAT_LOGIN_QR_EXPIRE_SECONDS * 1000)
  const qrCode = await createTemporaryQrCode(scene)

  const attempt: WechatOfficialLoginAttempt = {
    attemptId,
    pollToken,
    scene,
    status: 'pending',
    nextPath: sanitizeNextPath(nextPath),
    qrCodeUrl: qrCode.qrCodeUrl,
    expiresAt: expiresAt.toISOString(),
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  }

  await saveAttempt(attempt)

  return {
    attemptId,
    pollToken,
    qrCodeUrl: attempt.qrCodeUrl,
    expiresAt: attempt.expiresAt,
  }
}

export async function createWechatOfficialBindingAttempt(
  targetUserId: string,
): Promise<WechatOfficialBindingStartResult> {
  getWechatOfficialConfig()

  const attemptId = randomBytes(16).toString('hex')
  const pollToken = randomBytes(24).toString('hex')
  const scene = buildBindingScene(attemptId)
  const createdAt = new Date()
  const expiresAt = new Date(createdAt.getTime() + WECHAT_LOGIN_QR_EXPIRE_SECONDS * 1000)
  const qrCode = await createTemporaryQrCode(scene)

  const attempt: WechatOfficialBindingAttempt = {
    attemptId,
    pollToken,
    scene,
    status: 'pending',
    targetUserId,
    qrCodeUrl: qrCode.qrCodeUrl,
    expiresAt: expiresAt.toISOString(),
    createdAt: createdAt.toISOString(),
    updatedAt: createdAt.toISOString(),
  }

  await saveBindingAttempt(attempt)

  return {
    attemptId,
    pollToken,
    qrCodeUrl: attempt.qrCodeUrl,
    expiresAt: attempt.expiresAt,
  }
}

function verifyWechatOfficialRequest(request: NextRequest) {
  const { token } = getWechatOfficialConfig()
  const signature = request.nextUrl.searchParams.get('signature')
  const timestamp = request.nextUrl.searchParams.get('timestamp')
  const nonce = request.nextUrl.searchParams.get('nonce')

  if (!signature || !timestamp || !nonce) {
    return false
  }

  return isSignatureValid(buildWechatSignature([token, timestamp, nonce]), signature)
}

export function getWechatOfficialVerificationChallenge(request: NextRequest) {
  if (!verifyWechatOfficialRequest(request)) {
    return null
  }

  return request.nextUrl.searchParams.get('echostr')
}

export async function parseWechatOfficialCallback(request: NextRequest): Promise<ParsedWechatOfficialMessage> {
  const { token } = getWechatOfficialConfig()
  const rawBody = await request.text()
  const outerPayload = parseXmlFields(rawBody)
  const timestamp = request.nextUrl.searchParams.get('timestamp')
  const nonce = request.nextUrl.searchParams.get('nonce')
  const encryptType = request.nextUrl.searchParams.get('encrypt_type')

  if (!timestamp || !nonce) {
    throw new Error('Missing callback timestamp or nonce')
  }

  const encryptedPayload = outerPayload.Encrypt
  if (encryptType === 'aes' || encryptedPayload) {
    const msgSignature = request.nextUrl.searchParams.get('msg_signature')
    if (!encryptedPayload || !msgSignature) {
      throw new Error('Missing encrypted WeChat callback payload')
    }

    const expectedSignature = buildWechatSignature([token, timestamp, nonce, encryptedPayload])
    if (!isSignatureValid(expectedSignature, msgSignature)) {
      throw new Error('Invalid encrypted WeChat callback signature')
    }

    return {
      payload: parseXmlFields(decryptEncryptedMessage(encryptedPayload)),
      encrypted: true,
    }
  }

  if (!verifyWechatOfficialRequest(request)) {
    throw new Error('Invalid WeChat callback signature')
  }

  return {
    payload: outerPayload,
    encrypted: false,
  }
}

function extractAttemptSceneFromEvent(payload: Record<string, string>) {
  const event = payload.Event?.toLowerCase()
  const eventKey = payload.EventKey || ''

  if (event === 'subscribe' && eventKey.startsWith('qrscene_')) {
    return eventKey.slice('qrscene_'.length)
  }

  if (event === 'scan') {
    return eventKey
  }

  return null
}

function extractAttemptTargetFromEvent(payload: Record<string, string>) {
  const scene = extractAttemptSceneFromEvent(payload)
  if (!scene) {
    return null
  }

  const loginAttemptId = extractAttemptIdFromScene(scene)
  if (loginAttemptId) {
    return {
      kind: 'login' as const,
      attemptId: loginAttemptId,
    }
  }

  const bindingAttemptId = extractBindingAttemptIdFromScene(scene)
  if (bindingAttemptId) {
    return {
      kind: 'bind' as const,
      attemptId: bindingAttemptId,
    }
  }

  return null
}

async function fetchWechatOfficialUserInfo(openId: string) {
  const accessToken = await getWechatAccessToken()
  const url = new URL('https://api.weixin.qq.com/cgi-bin/user/info')
  url.searchParams.set('access_token', accessToken)
  url.searchParams.set('openid', openId)
  url.searchParams.set('lang', 'zh_CN')

  return readWechatJson<WechatOfficialUserInfo>(url)
}

async function resolveWechatOfficialProfile(openId: string) {
  try {
    const profile = await fetchWechatOfficialUserInfo(openId)
    const rawName = typeof profile.nickname === 'string' ? profile.nickname.trim() : ''
    const rawAvatar = typeof profile.headimgurl === 'string' ? profile.headimgurl.trim() : ''

    return {
      openId,
      displayName: rawName || '微信用户',
      avatarUrl: rawAvatar || null,
      isFallback: false,
    }
  } catch (error) {
    console.error('Fetch WeChat Official Account user info failed:', error)
    return {
      openId,
      displayName: '微信用户',
      avatarUrl: null,
      isFallback: true,
    }
  }
}

async function upsertWechatOfficialAccount(openId: string) {
  const profile = await resolveWechatOfficialProfile(openId)

  return prisma.$transaction(async tx => {
    const existingAccount = await tx.account.findFirst({
      where: {
        provider: WECHAT_OFFICIAL_PROVIDER,
        providerAccountId: openId,
      },
      select: {
        id: true,
        userId: true,
      },
    })

    if (existingAccount) {
      const user = await tx.user.update({
        where: { id: existingAccount.userId },
        data: {
          name: profile.isFallback ? undefined : profile.displayName || undefined,
          image: profile.isFallback ? undefined : profile.avatarUrl || undefined,
        },
      })

      return {
        userId: user.id,
        displayName: user.name,
        avatarUrl: user.image,
        openId,
      }
    }

    const user = await tx.user.create({
      data: {
        name: profile.displayName,
        image: profile.avatarUrl,
        accounts: {
          create: {
            type: 'oauth',
            provider: WECHAT_OFFICIAL_PROVIDER,
            providerAccountId: openId,
          },
        },
      },
    })

    return {
      userId: user.id,
      displayName: user.name,
      avatarUrl: user.image,
      openId,
    }
  })
}

export async function handleWechatOfficialLoginEvent(payload: Record<string, string>) {
  const event = payload.Event?.toLowerCase()
  if (event !== 'subscribe' && event !== 'scan') {
    return { handled: false as const }
  }

  const attemptTarget = extractAttemptTargetFromEvent(payload)
  if (!attemptTarget) {
    return { handled: false as const }
  }

  if (attemptTarget.kind === 'bind') {
    return handleWechatOfficialBindingEvent(payload, attemptTarget.attemptId)
  }

  const attemptId = attemptTarget.attemptId

  const attempt = await getWechatOfficialLoginAttempt(attemptId)
  if (!attempt || isAttemptExpired(attempt)) {
    return { handled: true as const, ignored: true as const }
  }

  if (attempt.status === 'authenticated' && attempt.sessionToken) {
    return { handled: true as const, ignored: true as const }
  }

  const openId = payload.FromUserName
  if (!openId) {
    throw new Error('Missing WeChat sender openId')
  }

  try {
    const account = await upsertWechatOfficialAccount(openId)
    const session = await createAuthSession(account.userId)
    const updatedAttempt: WechatOfficialLoginAttempt = {
      ...attempt,
      status: 'authenticated',
      updatedAt: new Date().toISOString(),
      userId: account.userId,
      openId,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      sessionToken: session.sessionToken,
      sessionExpiresAt: session.expires.toISOString(),
      errorMessage: undefined,
    }

    await saveAttempt(updatedAttempt)

    try {
      await sendWechatOfficialTextMessage(
        openId,
        `登录成功，您已完成网页端微信登录。请返回浏览器继续操作：${updatedAttempt.nextPath}`,
      )
    } catch (notifyError) {
      console.error('Send WeChat Official Account login success message failed:', notifyError)
    }

    return {
      handled: true as const,
      ignored: false as const,
      attempt: updatedAttempt,
      session,
    }
  } catch (error) {
    await markWechatOfficialAttemptFailed(attemptId, '微信登录处理失败，请重新获取二维码')
    throw error
  }
}

async function handleWechatOfficialBindingEvent(payload: Record<string, string>, attemptId: string) {
  const attempt = await getWechatOfficialBindingAttempt(attemptId)
  if (!attempt || isAttemptExpired(attempt)) {
    return { handled: true as const, ignored: true as const }
  }

  if (attempt.status === 'bound' || attempt.status === 'needs_confirmation') {
    return { handled: true as const, ignored: true as const }
  }

  const openId = payload.FromUserName
  if (!openId) {
    throw new Error('Missing WeChat sender openId')
  }

  const profile = await resolveWechatOfficialProfile(openId)

  try {
    const result = await prepareWechatBinding(attempt.targetUserId, openId, {
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    })

    const updatedAttempt: WechatOfficialBindingAttempt = {
      ...attempt,
      status: result.status === 'needs_confirmation' ? 'needs_confirmation' : 'bound',
      updatedAt: new Date().toISOString(),
      openId,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      conflictToken: result.status === 'needs_confirmation' ? result.conflictToken : undefined,
      otherUser: result.status === 'needs_confirmation' ? result.otherUser : undefined,
      errorMessage: undefined,
    }

    await saveBindingAttempt(updatedAttempt)

    if (updatedAttempt.status === 'bound') {
      try {
        await sendWechatOfficialTextMessage(openId, '绑定成功，您的微信已关联当前账号。')
      } catch (notifyError) {
        console.error('Send WeChat Official Account binding success message failed:', notifyError)
      }
    }

    return {
      handled: true as const,
      ignored: false as const,
      attempt: updatedAttempt,
    }
  } catch (error) {
    await markWechatOfficialBindingAttemptFailed(attemptId, '微信绑定处理失败，请重新获取二维码')
    throw error
  }
}

async function markWechatOfficialAttemptFailed(attemptId: string, message: string) {
  const attempt = await getWechatOfficialLoginAttempt(attemptId)
  if (!attempt) {
    return
  }

  const updatedAttempt: WechatOfficialLoginAttempt = {
    ...attempt,
    status: 'failed',
    updatedAt: new Date().toISOString(),
    errorMessage: message,
  }
  await saveAttempt(updatedAttempt)
}

export async function getWechatOfficialPollStatus(
  attemptId: string,
  pollToken: string,
): Promise<WechatOfficialPollStatus> {
  const attempt = await getWechatOfficialLoginAttempt(attemptId)
  if (!attempt) {
    return {
      status: 'expired',
      message: '登录二维码已失效，请重新获取',
    }
  }

  if (attempt.pollToken !== pollToken) {
    return {
      status: 'invalid',
      message: '登录状态校验失败，请重新获取二维码',
    }
  }

  if (isAttemptExpired(attempt)) {
    return {
      status: 'expired',
      expiresAt: attempt.expiresAt,
      message: '登录二维码已过期，请刷新后重试',
    }
  }

  if (attempt.status === 'failed') {
    return {
      status: 'failed',
      expiresAt: attempt.expiresAt,
      message: attempt.errorMessage || '微信登录失败，请重试',
    }
  }

  if (
    attempt.status === 'authenticated' &&
    attempt.sessionToken &&
    attempt.sessionExpiresAt
  ) {
    return {
      status: 'authenticated',
      expiresAt: attempt.expiresAt,
      redirectTo: attempt.nextPath,
      session: {
        sessionToken: attempt.sessionToken,
        expires: new Date(attempt.sessionExpiresAt),
      },
    }
  }

  return {
    status: 'pending',
    expiresAt: attempt.expiresAt,
  }
}

export async function getWechatOfficialBindingPollStatus(
  targetUserId: string,
  attemptId: string,
  pollToken: string,
): Promise<WechatOfficialBindingPollStatus> {
  const attempt = await getWechatOfficialBindingAttempt(attemptId)
  if (!attempt) {
    return {
      status: 'expired',
      message: '微信绑定二维码已失效，请重新获取',
    }
  }

  if (attempt.targetUserId !== targetUserId || attempt.pollToken !== pollToken) {
    return {
      status: 'invalid',
      message: '微信绑定状态校验失败，请重新获取二维码',
    }
  }

  if (isAttemptExpired(attempt)) {
    return {
      status: 'expired',
      expiresAt: attempt.expiresAt,
      message: '微信绑定二维码已过期，请刷新后重试',
    }
  }

  if (attempt.status === 'failed') {
    return {
      status: 'failed',
      expiresAt: attempt.expiresAt,
      message: attempt.errorMessage || '微信绑定失败，请重试',
    }
  }

  if (attempt.status === 'needs_confirmation' && attempt.conflictToken && attempt.otherUser) {
    return {
      status: 'needs_confirmation',
      expiresAt: attempt.expiresAt,
      message: '检测到该微信已绑定到另一个账号',
      conflictToken: attempt.conflictToken,
      otherUser: attempt.otherUser,
    }
  }

  if (attempt.status === 'bound') {
    return {
      status: 'bound',
      expiresAt: attempt.expiresAt,
      message: '微信绑定成功',
    }
  }

  return {
    status: 'pending',
    expiresAt: attempt.expiresAt,
  }
}

async function markWechatOfficialBindingAttemptFailed(attemptId: string, message: string) {
  const attempt = await getWechatOfficialBindingAttempt(attemptId)
  if (!attempt) {
    return
  }

  const updatedAttempt: WechatOfficialBindingAttempt = {
    ...attempt,
    status: 'failed',
    updatedAt: new Date().toISOString(),
    errorMessage: message,
  }
  await saveBindingAttempt(updatedAttempt)
}
