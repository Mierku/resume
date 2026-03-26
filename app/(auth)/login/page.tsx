'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Message } from '@/components/ui/radix-adapter'
import { Button } from '@/components/ui/Button'
import { BrandFlowerIcon } from '@/components/BrandFlowerIcon'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from '@/lib/legal'
import s from './login.module.css'

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5Z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2.1 1.6-4.6 2.4-7.3 2.4-5.3 0-9.7-3.3-11.4-8l-6.5 5C9.4 39.5 16.1 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C37.1 39 44 34 44 24c0-1.2-.1-2.3-.4-3.5Z" />
    </svg>
  )
}

function WeChatMark() {
  return <span className="i-lucide-message-circle-more h-4 w-4" aria-hidden="true" />
}

function getLoginErrorMessage(error: string | null) {
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

export default function LoginPage() {
  const searchParams = useSearchParams()
  const nextPath = sanitizeNextPath(searchParams.get('next'))
  const error = searchParams.get('error')
  const isDevTestLoginAvailable = process.env.NODE_ENV !== 'production'
  const [providerAvailability, setProviderAvailability] = useState({
    google: true,
    wechat: true,
  })
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)
  const [pendingProvider, setPendingProvider] = useState<'google' | 'wechat' | 'dev' | null>(null)
  const [consentChecked, setConsentChecked] = useState(false)
  const redirectPathWithLegalAck = withLegalAck(nextPath)

  useEffect(() => {
    if (error) {
      Message.error(getLoginErrorMessage(error))
    }
  }, [error])

  useEffect(() => {
    let active = true

    const loadProviders = async () => {
      try {
        const res = await fetch('/api/auth/providers', { cache: 'no-store' })
        if (!res.ok) {
          return
        }

        const data = await res.json()
        if (!active) {
          return
        }

        setProviderAvailability({
          google: Boolean(data.google),
          wechat: Boolean(data.wechat),
        })
      } catch {
        // Keep optimistic defaults; the sign-in route will still validate on the server.
      } finally {
        if (active) {
          setAvailabilityLoaded(true)
        }
      }
    }

    void loadProviders()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className={s.page}>
      <div className={s.backdropGlow} aria-hidden />
      <div className={s.container}>
        <div className={s.authCard}>
          <div className={s.cardHeader}>
            <Link href="/" className={s.brandLink} aria-label="回到首页">
              <BrandFlowerIcon className={s.brandLogo} color="currentColor" />
            </Link>
            <h1 className={s.cardTitle}>欢迎回来</h1>
            <p className={s.cardSubtitle}>继续你的沉浸式求职流程</p>
          </div>

          <div className={s.authActions}>
            <Button
              type="button"
              onClick={async () => {
                if (availabilityLoaded && !providerAvailability.wechat) {
                  Message.warning('微信登录暂未开放')
                  return
                }

                if (!consentChecked) {
                  Message.warning('请先阅读并同意《用户服务协议》和《隐私政策》')
                  return
                }

                setPendingProvider('wechat')
                try {
                  await signIn('wechat', { redirectTo: redirectPathWithLegalAck })
                } finally {
                  setPendingProvider(null)
                }
              }}
              className={s.authButton}
              size="lg"
              style={{
                backgroundColor: '#07c160',
                borderColor: '#06ad56',
                color: '#ffffff',
              }}
              disabled={pendingProvider !== null || !consentChecked}
            >
              <WeChatMark />
              {pendingProvider === 'wechat' ? '跳转中...' : '微信登录'}
            </Button>

            <Button
              type="button"
              onClick={async () => {
                if (availabilityLoaded && !providerAvailability.google) {
                  Message.warning('Google 登录暂未开放')
                  return
                }

                if (!consentChecked) {
                  Message.warning('请先阅读并同意《用户服务协议》和《隐私政策》')
                  return
                }

                setPendingProvider('google')
                try {
                  await signIn('google', { redirectTo: redirectPathWithLegalAck })
                } finally {
                  setPendingProvider(null)
                }
              }}
              variant="outline"
              className={s.authButton}
              size="lg"
              disabled={pendingProvider !== null || !consentChecked}
            >
              <GoogleMark />
              {pendingProvider === 'google' ? '跳转中...' : 'Google 登录'}
            </Button>

            {isDevTestLoginAvailable && (
              <Button
                type="button"
                variant="outline"
                className={s.authButton}
                size="lg"
                onClick={async () => {
                  if (!consentChecked) {
                    Message.warning('请先阅读并同意《用户服务协议》和《隐私政策》')
                    return
                  }

                  setPendingProvider('dev')
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
                    window.location.href = data?.redirectTo || redirectPathWithLegalAck
                  } catch (devLoginError) {
                    Message.error(devLoginError instanceof Error ? devLoginError.message : '测试账号登录失败')
                  } finally {
                    setPendingProvider(null)
                  }
                }}
                disabled={pendingProvider !== null || !consentChecked}
                title="仅本地开发环境可用"
              >
                <span className="i-lucide-flask-conical w-4 h-4" aria-hidden="true" />
                {pendingProvider === 'dev' ? '创建中...' : '测试账号登录'}
              </Button>
            )}
          </div>

          <label className={s.legalConsent}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={event => setConsentChecked(event.target.checked)}
            />
            <span>
              我已阅读并同意
              <Link href="/terms" target="_blank" rel="noopener noreferrer" className={s.legalLink}>《用户服务协议》</Link>
              与
              <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={s.legalLink}>《隐私政策》</Link>
            </span>
          </label>

          <p className={s.legalText}>
            继续登录即表示同意上述协议与隐私政策。
          </p>

          <div className={s.providerHint}>
            {isDevTestLoginAvailable && (
              <p>开发环境可直接使用“测试账号登录”，系统会自动创建默认用户和数据源。</p>
            )}
          </div>
        </div>

        <p className={s.footerTag}>沉浸式网申</p>
      </div>
    </div>
  )
}
