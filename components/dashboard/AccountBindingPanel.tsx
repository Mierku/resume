'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Link2, Mail, MessageCircleMore, QrCode, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Message } from '@/components/ui/radix-adapter'
import { invalidateAuthSnapshotCache } from '@/lib/auth/client'
import { formatAuthProviderLabels } from '@/lib/auth-provider-labels'
import { isAdminRole, type SessionUser } from '@/lib/user'
import styles from './account-binding.module.scss'

type BindingProvider = 'email' | 'wechat'
type WechatBindUiState = 'idle' | 'loading' | 'ready' | 'expired' | 'error'

interface BindingConflictUserSummary {
  userId: string
  displayName: string | null
  email: string | null
  role: 'user' | 'admin' | 'super_admin'
  membershipPlan: 'basic' | 'pro' | 'elite'
  membershipExpiresAt: string | null
  providers: string[]
  assetCounts: {
    records: number
    resumes: number
    aiConversations: number
    jobSites: number
    total: number
  }
}

interface BindingConflictState {
  provider: BindingProvider
  conflictToken: string
  otherUser: BindingConflictUserSummary
}

interface EmailSendCodeResponse {
  cooldownSeconds?: number
  devCode?: string
  error?: string
}

interface EmailVerifyBindingResponse {
  status?: 'bound' | 'already_bound' | 'needs_confirmation'
  conflictToken?: string
  otherUser?: BindingConflictUserSummary
  error?: string
}

interface WechatBindAttemptResponse {
  attemptId: string
  pollToken: string
  qrCodeUrl: string
  expiresAt: string
}

interface WechatBindStatusResponse {
  status?: 'pending' | 'bound' | 'needs_confirmation' | 'expired' | 'failed' | 'invalid'
  message?: string
  error?: string
  conflictToken?: string
  otherUser?: BindingConflictUserSummary
}

function getRoleLabel(role: BindingConflictUserSummary['role']) {
  if (role === 'super_admin') return '超级管理员'
  if (role === 'admin') return '管理员'
  return '普通用户'
}

function getMembershipLabel(plan: BindingConflictUserSummary['membershipPlan'], role: BindingConflictUserSummary['role']) {
  if (isAdminRole(role)) return '无限制'
  if (plan === 'elite') return '畅享会员'
  if (plan === 'pro') return 'PRO 会员'
  return '基础用户'
}

export function AccountBindingPanel({ user }: { user: SessionUser }) {
  const isEmailBindingAvailable = process.env.NODE_ENV !== 'production'
  const providerSet = useMemo(() => new Set(user.providers || []), [user.providers])
  const hasEmailBinding = providerSet.has('email_code')
  const hasWechatBinding = providerSet.has('wechat_official')
  const defaultEmailValue = user.email || ''

  const [emailAddress, setEmailAddress] = useState(defaultEmailValue)
  const [emailCode, setEmailCode] = useState('')
  const [emailCooldownSeconds, setEmailCooldownSeconds] = useState(0)
  const [sendingEmailCode, setSendingEmailCode] = useState(false)
  const [verifyingEmailBinding, setVerifyingEmailBinding] = useState(false)

  const [wechatState, setWechatState] = useState<WechatBindUiState>('idle')
  const [wechatAttempt, setWechatAttempt] = useState<WechatBindAttemptResponse | null>(null)
  const [wechatError, setWechatError] = useState<string | null>(null)

  const [conflictState, setConflictState] = useState<BindingConflictState | null>(null)
  const [resolvingConflict, setResolvingConflict] = useState(false)

  useEffect(() => {
    setEmailAddress(defaultEmailValue)
  }, [defaultEmailValue])

  useEffect(() => {
    if (emailCooldownSeconds <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setEmailCooldownSeconds(previous => (previous > 0 ? previous - 1 : 0))
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
        setWechatState('expired')
        setWechatError('二维码已过期，请重新获取')
        return
      }

      polling = true

      try {
        const params = new URLSearchParams({
          attemptId: wechatAttempt.attemptId,
          pollToken: wechatAttempt.pollToken,
        })
        const response = await fetch(`/api/account/bind/wechat/status?${params.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
        })
        const data = (await response.json().catch(() => null)) as WechatBindStatusResponse | null

        if (!active) {
          return
        }

        if (!response.ok) {
          throw new Error(data?.error || data?.message || '获取微信绑定状态失败')
        }

        switch (data?.status) {
          case 'bound':
            setWechatState('idle')
            setWechatAttempt(null)
            setWechatError(null)
            Message.success(data.message || '微信绑定成功')
            refreshAfterBinding()
            return
          case 'needs_confirmation':
            if (data.conflictToken && data.otherUser) {
              setConflictState({
                provider: 'wechat',
                conflictToken: data.conflictToken,
                otherUser: data.otherUser,
              })
            }
            setWechatState('idle')
            setWechatAttempt(null)
            setWechatError(null)
            return
          case 'expired':
            setWechatState('expired')
            setWechatError(data.message || '二维码已过期，请重新获取')
            return
          case 'failed':
          case 'invalid':
            setWechatState('error')
            setWechatError(data.message || '微信绑定失败，请重新获取二维码')
            return
          default:
            break
        }
      } catch (error) {
        if (!active) {
          return
        }

        const message = error instanceof Error ? error.message : '获取微信绑定状态失败'
        setWechatState('error')
        setWechatError(message)
      } finally {
        polling = false
        if (active) {
          timeoutId = window.setTimeout(() => {
            void pollStatus()
          }, 1800)
        }
      }
    }

    void pollStatus()

    return () => {
      active = false
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [wechatAttempt, wechatState])

  function refreshAfterBinding() {
    invalidateAuthSnapshotCache()
    window.location.reload()
  }

  async function handleSendEmailCode() {
    if (sendingEmailCode || !emailAddress.trim()) {
      return
    }

    setSendingEmailCode(true)

    try {
      const response = await fetch('/api/account/bind/email/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
        }),
      })
      const payload = (await response.json().catch(() => null)) as EmailSendCodeResponse | null

      if (!response.ok) {
        throw new Error(payload?.error || '发送验证码失败')
      }

      setEmailCooldownSeconds(payload?.cooldownSeconds || 60)
      Message.success(
        payload?.devCode
          ? `验证码已发送，开发环境验证码：${payload.devCode}`
          : '验证码已发送，请查收邮箱',
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送验证码失败'
      Message.error(message)
    } finally {
      setSendingEmailCode(false)
    }
  }

  async function handleVerifyEmailBinding() {
    if (verifyingEmailBinding) {
      return
    }

    setVerifyingEmailBinding(true)

    try {
      const response = await fetch('/api/account/bind/email/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailAddress,
          code: emailCode,
        }),
      })

      const payload = (await response.json().catch(() => null)) as EmailVerifyBindingResponse | null

      if (!response.ok) {
        throw new Error(payload?.error || '邮箱绑定失败')
      }

      if (payload?.status === 'needs_confirmation' && payload.conflictToken && payload.otherUser) {
        setConflictState({
          provider: 'email',
          conflictToken: payload.conflictToken,
          otherUser: payload.otherUser,
        })
        return
      }

      Message.success(payload?.status === 'already_bound' ? '邮箱已绑定到当前账号' : '邮箱绑定成功')
      refreshAfterBinding()
    } catch (error) {
      const message = error instanceof Error ? error.message : '邮箱绑定失败'
      Message.error(message)
    } finally {
      setVerifyingEmailBinding(false)
    }
  }

  async function handleStartWechatBinding() {
    if (wechatState === 'loading') {
      return
    }

    setWechatState('loading')
    setWechatError(null)

    try {
      const response = await fetch('/api/account/bind/wechat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const payload = (await response.json().catch(() => null)) as
        | (WechatBindAttemptResponse & { error?: string })
        | null

      if (!response.ok || !payload) {
        throw new Error(payload?.error || '生成微信绑定二维码失败')
      }

      setWechatAttempt({
        attemptId: payload.attemptId,
        pollToken: payload.pollToken,
        qrCodeUrl: payload.qrCodeUrl,
        expiresAt: payload.expiresAt,
      })
      setWechatState('ready')
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成微信绑定二维码失败'
      setWechatState('error')
      setWechatError(message)
      Message.error(message)
    }
  }

  async function resolveConflict(clearOtherUserAssets: boolean) {
    if (!conflictState || resolvingConflict) {
      return
    }

    setResolvingConflict(true)

    try {
      const response = await fetch('/api/account/bind/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conflictToken: conflictState.conflictToken,
          clearOtherUserAssets,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        throw new Error(payload?.error || '处理账号冲突失败')
      }

      setConflictState(null)
      Message.success(
        clearOtherUserAssets
          ? '已清空旧号资产并完成绑定'
          : '已保留旧号资产并合并到当前账号',
      )
      refreshAfterBinding()
    } catch (error) {
      const message = error instanceof Error ? error.message : '处理账号冲突失败'
      Message.error(message)
    } finally {
      setResolvingConflict(false)
    }
  }

  const bindingRows = [
    ...(isEmailBindingAvailable
      ? [{
          key: 'email',
          title: '绑定邮箱登录',
          description: hasEmailBinding
            ? '当前账号已经支持邮箱验证码登录。'
            : '补绑邮箱后，可以直接通过验证码登录当前账号。',
          icon: Mail,
          bound: hasEmailBinding,
          action: (
            <>
              <div className={styles.inputRow}>
                <Input
                  value={emailAddress}
                  onChange={event => setEmailAddress(event.target.value)}
                  placeholder="输入常用邮箱"
                  disabled={hasEmailBinding}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleSendEmailCode()}
                  disabled={hasEmailBinding || !emailAddress.trim() || sendingEmailCode || emailCooldownSeconds > 0}
                >
                  {emailCooldownSeconds > 0 ? `${emailCooldownSeconds}s 后重发` : '发送验证码'}
                </Button>
              </div>
              <div className={styles.inputRow}>
                <Input
                  value={emailCode}
                  onChange={event => setEmailCode(event.target.value)}
                  placeholder="输入 6 位验证码"
                  disabled={hasEmailBinding}
                />
                <Button
                  type="button"
                  onClick={() => void handleVerifyEmailBinding()}
                  disabled={hasEmailBinding || !emailAddress.trim() || !emailCode.trim() || verifyingEmailBinding}
                  loading={verifyingEmailBinding}
                >
                  绑定邮箱
                </Button>
              </div>
            </>
          ),
        }]
      : []),
    {
      key: 'wechat',
      title: '绑定微信登录',
      description: hasWechatBinding
        ? '当前账号已经支持微信扫码登录。'
        : '补绑微信后，可以直接扫码回到这个账号，不会再分裂出新账号。',
      icon: MessageCircleMore,
      bound: hasWechatBinding,
      action: (
        <div className={styles.inlineActionRow}>
          <Button
            type="button"
            onClick={() => void handleStartWechatBinding()}
            disabled={hasWechatBinding || wechatState === 'loading'}
            loading={wechatState === 'loading'}
            icon={<QrCode size={16} />}
          >
            扫码绑定微信
          </Button>
          {!hasWechatBinding ? (
            <span className={styles.inlineHint}>扫码后会自动校验是否命中另一个账号</span>
          ) : null}
        </div>
      ),
    },
  ] as const

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Account Binding</p>
            <h3 className={styles.title}>绑定登录方式</h3>
          </div>
          <div className={styles.headerBadge}>
            <Link2 size={14} />
            登录统一到一个账号
          </div>
        </div>

        <div className={styles.grid}>
          {bindingRows.map(row => {
            const Icon = row.icon
            return (
              <article key={row.key} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardIdentity}>
                    <span className={styles.iconBadge}>
                      <Icon size={16} />
                    </span>
                    <div>
                      <h4 className={styles.cardTitle}>{row.title}</h4>
                      <p className={styles.cardDescription}>{row.description}</p>
                    </div>
                  </div>
                  <span className={row.bound ? styles.statusSuccess : styles.statusPending}>
                    {row.bound ? (
                      <>
                        <CheckCircle2 size={14} />
                        已绑定
                      </>
                    ) : (
                      <>
                        <ShieldAlert size={14} />
                        未绑定
                      </>
                    )}
                  </span>
                </div>
                <div className={styles.cardBody}>{row.action}</div>
              </article>
            )
          })}
        </div>
      </section>

      <Modal
        open={wechatState !== 'idle'}
        onClose={() => {
          setWechatState('idle')
          setWechatAttempt(null)
          setWechatError(null)
        }}
        title="扫码绑定微信"
        panelClassName={styles.modalPanel}
        contentClassName={styles.modalContent}
      >
        <div className={styles.qrShell}>
          {wechatAttempt ? (
            <div className={styles.qrFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={wechatAttempt.qrCodeUrl} alt="微信绑定二维码" className={styles.qrImage} />
            </div>
          ) : (
            <div className={styles.qrPlaceholder}>
              <QrCode size={28} />
            </div>
          )}

          <div className={styles.qrTextBlock}>
            <p className={styles.qrHeadline}>使用微信扫码，完成当前账号绑定</p>
            <p className={styles.qrDescription}>
              如果系统发现这个微信已经挂在另一个账号上，会先弹出资产处理确认，再决定是合并还是清空旧号数据。
            </p>
            {wechatError ? <p className={styles.qrError}>{wechatError}</p> : null}
          </div>

          <div className={styles.qrActions}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setWechatState('idle')
                setWechatAttempt(null)
                setWechatError(null)
              }}
            >
              先关闭
            </Button>
            <Button
              type="button"
              onClick={() => void handleStartWechatBinding()}
              loading={wechatState === 'loading'}
            >
              {wechatState === 'expired' || wechatState === 'error' ? '重新获取二维码' : '刷新二维码'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(conflictState)}
        onClose={() => {
          if (resolvingConflict) return
          setConflictState(null)
        }}
        title="检测到另一个账号"
        panelClassName={styles.modalPanel}
        contentClassName={styles.modalContent}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConflictState(null)}
              disabled={resolvingConflict}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void resolveConflict(false)}
              disabled={resolvingConflict}
              loading={resolvingConflict}
            >
              保留旧号资产并合并
            </Button>
            <Button
              type="button"
              onClick={() => void resolveConflict(true)}
              disabled={resolvingConflict}
            >
              清空旧号资产后绑定
            </Button>
          </>
        }
      >
        {conflictState ? (
          <div className={styles.conflictBody}>
            <div className={styles.conflictAlert}>
              <AlertTriangle size={18} />
              <div>
                <p className={styles.conflictTitle}>
                  这个{conflictState.provider === 'email' ? '邮箱' : '微信'}已经绑定到另一个账号。
                </p>
                <p className={styles.conflictDescription}>
                  你可以选择保留旧号资产并合并到当前账号，或者清空旧号资产后再完成绑定。
                </p>
              </div>
            </div>

            <div className={styles.conflictCard}>
              <div className={styles.conflictSummaryRow}>
                <span>旧账号昵称</span>
                <strong>{conflictState.otherUser.displayName || '未命名用户'}</strong>
              </div>
              <div className={styles.conflictSummaryRow}>
                <span>旧账号邮箱</span>
                <strong>{conflictState.otherUser.email || '未绑定邮箱'}</strong>
              </div>
              <div className={styles.conflictSummaryRow}>
                <span>旧账号角色</span>
                <strong>{getRoleLabel(conflictState.otherUser.role)}</strong>
              </div>
              <div className={styles.conflictSummaryRow}>
                <span>会员状态</span>
                <strong>{getMembershipLabel(conflictState.otherUser.membershipPlan, conflictState.otherUser.role)}</strong>
              </div>
              <div className={styles.conflictSummaryRow}>
                <span>登录方式</span>
                <strong>{formatAuthProviderLabels(conflictState.otherUser.providers)}</strong>
              </div>
            </div>

            <div className={styles.assetGrid}>
              <div className={styles.assetTile}>
                <span>{conflictState.otherUser.assetCounts.records}</span>
                <small>投递记录</small>
              </div>
              <div className={styles.assetTile}>
                <span>{conflictState.otherUser.assetCounts.resumes}</span>
                <small>简历</small>
              </div>
              <div className={styles.assetTile}>
                <span>{conflictState.otherUser.assetCounts.aiConversations}</span>
                <small>AI 对话</small>
              </div>
              <div className={styles.assetTile}>
                <span>{conflictState.otherUser.assetCounts.jobSites}</span>
                <small>职位站点</small>
              </div>
              <div className={styles.assetTile}>
                <span>{conflictState.otherUser.assetCounts.total}</span>
                <small>资产总量</small>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
