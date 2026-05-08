'use client'

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FlaskConical,
  LoaderCircle,
  Mail,
  MessageSquareText,
  RefreshCw,
} from 'lucide-react'
import { Message } from '@/components/ui/radix-adapter'
import { Button } from '@/components/ui/Button'
import { BrandFlowerIcon } from '@/components/BrandFlowerIcon'
import { markAuthSessionHintAuthenticated } from '@/lib/auth/client'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from '@/lib/legal'
import styles from './LoginPanel.module.scss'

interface WechatOfficialLoginStartResponse {
  attemptId: string
  pollToken: string
  qrCodeUrl: string
  expiresAt: string
}

interface EmailSendCodeResponse {
  cooldownSeconds?: number
  expiresInSeconds?: number
  maskedEmail?: string
  devCode?: string
  error?: string
}

interface EmailVerifyResponse {
  redirectTo?: string
  error?: string
}

type WechatLoginUiState = 'idle' | 'loading' | 'ready' | 'authenticated' | 'expired' | 'error'
type LoginMode = 'email' | 'wechat' | 'dev'

export interface LoginPanelSuccessPayload {
  redirectTo: string
}

interface LoginPanelProps {
  nextPath: string
  error?: string | null
  mode?: 'page' | 'modal'
  onSuccess?: (payload: LoginPanelSuccessPayload) => void | Promise<void>
}

function WechatLoginIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fill="none" d="M0 0h24v24H0z" />
      <path d="M18.574 13.711a.91.91 0 0 0 .898-.898c0-.498-.399-.898-.898-.898s-.898.4-.898.898c0 .5.4.898.898.898zm-4.425 0a.91.91 0 0 0 .898-.898c0-.498-.4-.898-.898-.898-.5 0-.898.4-.898.898 0 .5.399.898.898.898zm6.567 5.04a.347.347 0 0 0-.172.37c0 .048 0 .097.025.147.098.417.294 1.081.294 1.106 0 .073.025.122.025.172a.22.22 0 0 1-.221.22c-.05 0-.074-.024-.123-.048l-1.449-.836a.799.799 0 0 0-.344-.098c-.073 0-.147 0-.196.024-.688.197-1.4.295-2.161.295-3.66 0-6.607-2.457-6.607-5.505 0-3.047 2.947-5.505 6.607-5.505 3.659 0 6.606 2.458 6.606 5.505 0 1.647-.884 3.146-2.284 4.154zM16.673 8.099a9.105 9.105 0 0 0-.28-.005c-4.174 0-7.606 2.86-7.606 6.505 0 .554.08 1.09.228 1.6h-.089a9.963 9.963 0 0 1-2.584-.368c-.074-.025-.148-.025-.222-.025a.832.832 0 0 0-.418.123l-1.748 1.005c-.05.025-.099.05-.148.05a.273.273 0 0 1-.27-.27c0-.074.024-.123.049-.197.024-.024.246-.834.369-1.324 0-.05.024-.123.024-.172a.556.556 0 0 0-.221-.442C2.058 13.376 1 11.586 1 9.598 1 5.945 4.57 3 8.95 3c3.765 0 6.93 2.169 7.723 5.098zm-5.154.418c.573 0 1.026-.477 1.026-1.026 0-.573-.453-1.026-1.026-1.026s-1.026.453-1.026 1.026.453 1.026 1.026 1.026zm-5.26 0c.573 0 1.027-.477 1.027-1.026 0-.573-.454-1.026-1.027-1.026-.572 0-1.026.453-1.026 1.026s.454 1.026 1.026 1.026z" />
    </svg>
  )
}

function getLoginErrorMessage(error: string | null | undefined) {
  switch (error) {
    case 'AccessDenied':
      return '登录请求被拒绝'
    case 'CallbackRouteError':
    case 'OAuthCallbackError':
      return '第三方登录回调失败，请检查回调地址配置'
    case 'OAuthSignin':
      return '无法发起第三方登录，请稍后重试'
    case 'OAuthAccountNotLinked':
      return '该账号已绑定其他登录方式'
    case 'Configuration':
      return '登录服务配置有误，请检查环境变量'
    case 'Verification':
      return '登录状态已过期，请重新发起登录'
    default:
      return '登录失败，请稍后重试'
  }
}

function withLegalAck(path: string) {
  const [rawWithoutHash, rawHash = ''] = path.split('#')
  const [rawPathname, rawQuery = ''] = rawWithoutHash.split('?')
  const query = new URLSearchParams(rawQuery)
  query.set('legal_ack', '1')
  query.set('terms_v', LEGAL_TERMS_VERSION)
  query.set('privacy_v', LEGAL_PRIVACY_VERSION)

  const next = `${rawPathname}?${query.toString()}`
  return rawHash ? `${next}#${rawHash}` : next
}

async function acceptLatestLegalConsent() {
  try {
    await fetch('/api/legal/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        termsVersion: LEGAL_TERMS_VERSION,
        privacyVersion: LEGAL_PRIVACY_VERSION,
      }),
    })
  } catch {
    // ignore consent write failures on login and preserve session success
  }
}

export function LoginPanel({
  nextPath,
  error,
  mode = 'page',
  onSuccess,
}: LoginPanelProps) {
  const isPageMode = mode === 'page'
  const safeNextPath = sanitizeNextPath(nextPath)
  const isProduction = process.env.NODE_ENV === 'production'
  const isDevTestLoginAvailable = !isProduction
  const isEmailLoginAvailable = !isProduction
  const redirectPathWithLegalAck = withLegalAck(safeNextPath)

  const [loginMode, setLoginMode] = useState<LoginMode>('wechat')
  const [emailAddress, setEmailAddress] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailCooldownSeconds, setEmailCooldownSeconds] = useState(0)
  const [sendingEmailCode, setSendingEmailCode] = useState(false)
  const [submittingEmailLogin, setSubmittingEmailLogin] = useState(false)
  const [wechatState, setWechatState] = useState<WechatLoginUiState>('idle')
  const [wechatAttempt, setWechatAttempt] = useState<WechatOfficialLoginStartResponse | null>(null)
  const [wechatError, setWechatError] = useState<string | null>(null)
  const [submittingDevLogin, setSubmittingDevLogin] = useState(false)

  const expiredNoticeShownRef = useRef(false)
  const initialWechatRefreshDoneRef = useRef(false)
  const previousLoginModeRef = useRef<LoginMode>(loginMode)

  const handleSuccess = useCallback(async (redirectTo?: string) => {
    markAuthSessionHintAuthenticated()
    await acceptLatestLegalConsent()
    await onSuccess?.({
      redirectTo: redirectTo || redirectPathWithLegalAck,
    })
  }, [onSuccess, redirectPathWithLegalAck])

  useEffect(() => {
    if (error) {
      Message.error(getLoginErrorMessage(error))
    }
  }, [error])

  useEffect(() => {
    if (emailCooldownSeconds <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setEmailCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [emailCooldownSeconds])

  useEffect(() => {
    if (!wechatAttempt || wechatState !== 'ready') {
      return
    }

    let active = true
    let timeoutId: number | null = null
    let polling = false

    const pollStatus = async () => {
      if (!active || polling) {
        return
      }

      if (Date.now() >= new Date(wechatAttempt.expiresAt).getTime()) {
        if (!expiredNoticeShownRef.current) {
          Message.warning('二维码已过期，请重新获取')
          expiredNoticeShownRef.current = true
        }
        setWechatState('expired')
        return
      }

      polling = true

      try {
        const params = new URLSearchParams({
          attemptId: wechatAttempt.attemptId,
          pollToken: wechatAttempt.pollToken,
        })
        const response = await fetch(`/api/auth/wechat-official/status?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
        })
        const data = (await response.json().catch(() => null)) as
          | {
              status?: string
              redirectTo?: string
              message?: string
              error?: string
            }
          | null

        if (!active) {
          return
        }

        if (response.status === 403) {
          const message = data?.error || data?.message || '登录状态校验失败，请重新获取二维码'
          setWechatError(message)
          setWechatState('error')
          Message.error(message)
          return
        }

        if (!response.ok) {
          throw new Error(data?.error || '获取微信登录状态失败')
        }

        switch (data?.status) {
          case 'authenticated':
            setWechatState('authenticated')
            Message.success('微信登录成功')
            await handleSuccess(data.redirectTo)
            return
          case 'expired':
            if (!expiredNoticeShownRef.current) {
              Message.warning(data.message || '二维码已过期，请重新获取')
              expiredNoticeShownRef.current = true
            }
            setWechatState('expired')
            return
          case 'failed': {
            const message = data.message || '微信登录失败，请重新获取二维码'
            setWechatError(message)
            setWechatState('error')
            Message.error(message)
            return
          }
          default:
            timeoutId = window.setTimeout(pollStatus, 1800)
        }
      } catch (pollError) {
        if (!active) {
          return
        }

        const message = pollError instanceof Error ? pollError.message : '获取微信登录状态失败'
        setWechatError(message)
        setWechatState('error')
        Message.error(message)
      } finally {
        polling = false
      }
    }

    timeoutId = window.setTimeout(() => {
      void pollStatus()
    }, 1200)

    return () => {
      active = false
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [handleSuccess, wechatAttempt, wechatState])

  const startWechatLogin = useCallback(async () => {
    expiredNoticeShownRef.current = false
    setWechatAttempt(null)
    setWechatError(null)
    setWechatState('loading')

    try {
      const response = await fetch('/api/auth/wechat-official/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          next: redirectPathWithLegalAck,
        }),
      })

      const data = (await response.json().catch(() => null)) as
        | (WechatOfficialLoginStartResponse & { error?: string })
        | null

      if (!response.ok || !data?.attemptId || !data.pollToken || !data.qrCodeUrl) {
        throw new Error(data?.error || '生成微信二维码失败')
      }

      setWechatAttempt({
        attemptId: data.attemptId,
        pollToken: data.pollToken,
        qrCodeUrl: data.qrCodeUrl,
        expiresAt: data.expiresAt,
      })
      setWechatState('ready')
    } catch (wechatLoginError) {
      const message =
        wechatLoginError instanceof Error ? wechatLoginError.message : '生成微信二维码失败'
      setWechatError(message)
      setWechatState('error')
      Message.error(message)
    }
  }, [redirectPathWithLegalAck])

  useEffect(() => {
    if (initialWechatRefreshDoneRef.current) {
      return
    }

    initialWechatRefreshDoneRef.current = true
    void startWechatLogin()
  }, [startWechatLogin])

  useEffect(() => {
    if (loginMode === 'wechat' && previousLoginModeRef.current !== 'wechat') {
      void startWechatLogin()
    }

    previousLoginModeRef.current = loginMode
  }, [loginMode, startWechatLogin])

  const handleSendEmailCode = async () => {
    if (!emailAddress.trim()) {
      Message.warning('请先输入邮箱')
      return
    }

    if (emailCooldownSeconds > 0) {
      Message.warning(`请 ${emailCooldownSeconds}s 后再试`)
      return
    }

    setSendingEmailCode(true)

    try {
      const response = await fetch('/api/auth/email/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
        }),
      })

      const data = (await response.json().catch(() => null)) as EmailSendCodeResponse | null

      if (!response.ok) {
        throw new Error(data?.error || '发送验证码失败')
      }

      setEmailCooldownSeconds(Math.max(30, data?.cooldownSeconds || 60))

      if (data?.devCode) {
        Message.success(`验证码已发送（开发调试码：${data.devCode}）`)
      } else {
        Message.success(`验证码已发送至 ${data?.maskedEmail || '你的邮箱'}`)
      }
    } catch (sendError) {
      Message.error(sendError instanceof Error ? sendError.message : '发送验证码失败')
    } finally {
      setSendingEmailCode(false)
    }
  }

  const handleEmailLogin = async () => {
    if (!emailAddress.trim()) {
      Message.warning('请输入邮箱')
      return
    }

    if (!emailCode.trim()) {
      Message.warning('请输入验证码')
      return
    }

    setSubmittingEmailLogin(true)

    try {
      const response = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          code: emailCode,
          next: redirectPathWithLegalAck,
        }),
      })

      const data = (await response.json().catch(() => null)) as EmailVerifyResponse | null
      if (!response.ok) {
        throw new Error(data?.error || '邮箱登录失败')
      }

      Message.success('登录成功')
      await handleSuccess(data?.redirectTo)
    } catch (emailLoginError) {
      Message.error(emailLoginError instanceof Error ? emailLoginError.message : '邮箱登录失败')
    } finally {
      setSubmittingEmailLogin(false)
    }
  }

  const handleDevLogin = async () => {
    setSubmittingDevLogin(true)

    try {
      const res = await fetch('/api/dev-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ next: redirectPathWithLegalAck }),
      })

      const data = (await res.json().catch(() => null)) as { error?: string; redirectTo?: string } | null
      if (!res.ok) {
        throw new Error(data?.error || '测试账号登录失败')
      }

      Message.success('测试账号已登录')
      await handleSuccess(data?.redirectTo)
    } catch (devLoginError) {
      Message.error(devLoginError instanceof Error ? devLoginError.message : '测试账号登录失败')
    } finally {
      setSubmittingDevLogin(false)
    }
  }

  const showWechatOverlay = wechatState === 'expired' || wechatState === 'error'
  const wechatOverlayText =
    wechatState === 'error' ? wechatError || '二维码获取失败，请重试' : '二维码已过期'

  const modeOptions = useMemo(
    () => [
      { key: 'wechat' as const, label: '微信扫码', icon: WechatLoginIcon },
      ...(isDevTestLoginAvailable
        ? [{ key: 'dev' as const, label: '测试账号', icon: FlaskConical }]
        : []),
      ...(isEmailLoginAvailable
        ? [{ key: 'email' as const, label: '邮箱登录', icon: Mail }]
        : []),
    ],
    [isDevTestLoginAvailable, isEmailLoginAvailable],
  )
  const modeKeys = useMemo(() => new Set(modeOptions.map(option => option.key)), [modeOptions])

  useEffect(() => {
    if (!modeKeys.has(loginMode)) {
      setLoginMode(modeOptions[0]?.key || 'wechat')
    }
  }, [loginMode, modeKeys, modeOptions])

  const activeModeIndex = Math.max(
    0,
    modeOptions.findIndex(option => option.key === loginMode),
  )
  const modeTabsStyle = {
    '--tab-count': String(modeOptions.length),
    '--active-index': String(activeModeIndex),
    '--active-text-color': loginMode === 'wechat' ? '#ffffff' : '#2b2b2b',
  } as CSSProperties
  const modeSliderToneClass =
    loginMode === 'wechat'
      ? styles.modeSliderWechat
      : loginMode === 'dev'
        ? styles.modeSliderDev
        : styles.modeSliderPhone

  return (
    <div className={isPageMode ? styles.shell : styles.compactShell}>
      <section className={isPageMode ? styles.leftPanel : styles.compactLeftPanel}>
        {isPageMode ? (
          <>
            <div className={styles.brandRow}>
              <Link href="/" className={styles.brandLink} aria-label="回到首页">
                <span className={styles.brandBadge}>
                  <BrandFlowerIcon className={styles.brandLogo} />
                </span>
                <span className={styles.brandName}>沉浸式网申</span>
              </Link>
            </div>

            <header className={styles.header}>
              <h1 className={styles.title}>欢迎回来</h1>
              <p className={styles.subtitle}>选择你习惯的登录方式，继续你的求职流程</p>
            </header>
          </>
        ) : null}

        {modeOptions.length > 1 ? (
          <nav
            className={styles.modeTabs}
            aria-label="选择登录方式"
            style={modeTabsStyle}
          >
            <span className={`${styles.modeSlider} ${modeSliderToneClass}`} aria-hidden="true" />
            {modeOptions.map(option => {
              const Icon = option.icon

              return (
                <button
                  key={option.key}
                  type="button"
                  className={`${styles.modeTab} ${loginMode === option.key ? styles.modeTabActive : ''}`}
                  onClick={() => setLoginMode(option.key)}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{option.label}</span>
                </button>
              )
            })}
          </nav>
        ) : null}

        <div className={`${styles.methodBody} ${!isPageMode ? styles.compactMethodBody : ''}`}>
          {loginMode === 'email' && (
            <form
              className={styles.phoneForm}
              onSubmit={event => {
                event.preventDefault()
                void handleEmailLogin()
              }}
            >
              <div className={styles.fieldGroup}>
                <label htmlFor="email-input" className={styles.fieldLabel}>
                  邮箱
                </label>
                <div className={styles.inputWrap}>
                  <Mail className={styles.inputIcon} aria-hidden="true" />
                  <input
                    id="email-input"
                    className={styles.textInput}
                    value={emailAddress}
                    onChange={event => setEmailAddress(event.target.value)}
                    placeholder="请输入邮箱地址"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={120}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label htmlFor="email-code-input" className={styles.fieldLabel}>
                  验证码
                </label>
                <div className={styles.splitField}>
                  <div className={styles.inputWrap}>
                    <MessageSquareText className={styles.inputIcon} aria-hidden="true" />
                    <input
                      id="email-code-input"
                      className={styles.textInput}
                      value={emailCode}
                      onChange={event => setEmailCode(event.target.value)}
                      placeholder="请输入 6 位验证码"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </div>
                  <button
                    type="button"
                    className={styles.codeButton}
                    onClick={() => {
                      void handleSendEmailCode()
                    }}
                    disabled={sendingEmailCode || emailCooldownSeconds > 0}
                  >
                    {sendingEmailCode ? (
                      <LoaderCircle className={`${styles.inlineIcon} ${styles.spin}`} aria-hidden="true" />
                    ) : null}
                    {sendingEmailCode
                      ? '发送中'
                      : emailCooldownSeconds > 0
                        ? `${emailCooldownSeconds}s 后重发`
                        : '获取验证码'}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className={styles.primaryAction}
                size="lg"
                disabled={submittingEmailLogin || sendingEmailCode}
              >
                {submittingEmailLogin ? (
                  <LoaderCircle className={`size-4 ${styles.spin}`} aria-hidden="true" />
                ) : null}
                {submittingEmailLogin ? '登录中...' : '邮箱登录'}
              </Button>

              <p className={styles.methodHint}>验证码 5 分钟内有效，请勿泄露给他人。</p>
            </form>
          )}

          {loginMode === 'wechat' && (
            <div className={`${styles.wechatCard} ${!isPageMode ? styles.compactWechatCard : ''}`}>
              <div className={styles.qrStage} aria-live="polite">
                <div className={styles.qrFrame}>
                  {wechatAttempt?.qrCodeUrl && (wechatState === 'ready' || wechatState === 'authenticated' || showWechatOverlay) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${wechatAttempt.qrCodeUrl}${wechatAttempt.qrCodeUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(wechatAttempt.attemptId)}`}
                      alt="微信服务号登录二维码"
                      className={styles.qrImage}
                    />
                  ) : (
                    <div className={styles.qrPlaceholder}>
                      {wechatState === 'loading' ? (
                        <LoaderCircle className={`${styles.qrPlaceholderIcon} ${styles.spin}`} aria-hidden="true" />
                      ) : (
                        <WechatLoginIcon className={styles.qrPlaceholderIcon} />
                      )}
                    </div>
                  )}
                </div>

                {showWechatOverlay ? (
                  <div className={styles.qrOverlay}>
                    <WechatLoginIcon className={styles.qrOverlayIcon} />
                    <p className={styles.qrOverlayText}>{wechatOverlayText}</p>
                    <button
                      type="button"
                      className={styles.qrOverlayButton}
                      onClick={() => {
                        void startWechatLogin()
                      }}
                    >
                      <RefreshCw className={styles.inlineIcon} aria-hidden="true" />
                      刷新二维码
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {loginMode === 'dev' && isDevTestLoginAvailable && (
            <div className={styles.devCard}>
              <p className={styles.devDesc}>开发环境可直接登录测试账号，系统会自动创建默认数据源。</p>
              <Button
                type="button"
                variant="outline"
                className={styles.secondaryAction}
                size="lg"
                onClick={() => {
                  void handleDevLogin()
                }}
                disabled={submittingDevLogin}
              >
                {submittingDevLogin ? (
                  <LoaderCircle className={`size-4 ${styles.spin}`} aria-hidden="true" />
                ) : (
                  <FlaskConical className="size-4" aria-hidden="true" />
                )}
                {submittingDevLogin ? '创建中...' : '使用测试账号登录'}
              </Button>
            </div>
          )}
        </div>

        <p className={styles.legalNotice}>
          登录即同意
          <Link href="/terms" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>
            《用户服务协议》
          </Link>
          与
          <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.legalLink}>
            《隐私政策》
          </Link>
        </p>
      </section>

      <aside className={isPageMode ? styles.rightPanel : styles.compactRightPanel}>
        <div className={styles.rightGlow} aria-hidden />
        <div className={styles.rightCard}>
          <h2 className={styles.rightTitle}>更快进入你的求职工作流</h2>
          <p className={styles.rightText}>简历编辑、投递追踪、AI 辅助写作和求职记录都会在登录后自动同步。</p>
          <p className={styles.rightFooter}>© 2026 Immersive Delivery. All rights reserved.</p>
        </div>
      </aside>
    </div>
  )
}
