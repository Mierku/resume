'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { FlaskConical, MessageCircleMore } from 'lucide-react'
import { Message } from '@/components/ui/radix-adapter'
import { Button } from '@/components/ui/Button'
import { BrandFlowerIcon } from '@/components/BrandFlowerIcon'
import { sanitizeNextPath } from '@/lib/auth-redirect'
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from '@/lib/legal'
import s from './login.module.css'

function WeChatMark() {
  return <MessageCircleMore className="size-4" aria-hidden="true" />
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
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const searchParams = useSearchParams()
  const nextPath = sanitizeNextPath(searchParams.get('next'))
  const error = searchParams.get('error')
  const isDevTestLoginAvailable = process.env.NODE_ENV !== 'production'
  const [providerAvailability, setProviderAvailability] = useState({
    wechat: true,
  })
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false)
  const [pendingProvider, setPendingProvider] = useState<'wechat' | 'dev' | null>(null)
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
                <FlaskConical className="size-4" aria-hidden="true" />
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
