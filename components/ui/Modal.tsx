'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  overlayClassName?: string
  panelClassName?: string
  titleClassName?: string
  closeButtonClassName?: string
  contentClassName?: string
  footerClassName?: string
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  overlayClassName,
  panelClassName,
  titleClassName,
  closeButtonClassName,
  contentClassName,
  footerClassName,
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className={cn('absolute inset-0 bg-black/50 animate-fade-in', overlayClassName)}
        onClick={onClose}
      />
      <div
        className={cn(
          'relative bg-background rounded-[12px] shadow-lg max-w-md w-full mx-4 p-6 animate-slide-up',
          panelClassName,
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className={cn('text-lg font-semibold text-foreground', titleClassName)}>{title}</h2>
            <button 
              onClick={onClose}
              className={cn('p-1 hover:bg-muted rounded-[10px] transition-colors', closeButtonClassName)}
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className={cn('text-sm text-muted-foreground', contentClassName)}>
          {children}
        </div>
        {footer && (
          <div className={cn('mt-6 flex justify-end gap-3', footerClassName)}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  loading,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  )
}

interface AuthRequiredModalProps {
  open: boolean
  onClose: () => void
  redirectPath?: string
  onBeforeLogin?: () => void | Promise<void>
}

export function AuthRequiredModal({ open, onClose, redirectPath, onBeforeLogin }: AuthRequiredModalProps) {
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    if (!open) {
      setLoggingIn(false)
    }
  }, [open])

  const handleLogin = async () => {
    if (loggingIn) return
    setLoggingIn(true)
    try {
      await onBeforeLogin?.()
    } catch {
      // ignore pre-login cache errors and continue login redirect
    }
    const next = redirectPath || window.location.pathname
    window.location.href = `/login?next=${encodeURIComponent(next)}`
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="请登录"
      overlayClassName="bg-black/[0.66] backdrop-blur-[2px]"
      panelClassName="border border-[rgba(218,220,224,0.15)] bg-[rgba(22,23,24,0.5)] backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
      titleClassName="text-white"
      closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10"
      contentClassName="text-white/85"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loggingIn} className="text-white/78 hover:text-white hover:bg-white/10">
            取消
          </Button>
          <Button loading={loggingIn} onClick={() => void handleLogin()} className="bg-[rgba(56,59,61,0.576)] backdrop-blur-2xl text-[rgb(241,243,244)]">
            去登录
          </Button>
        </>
      }
    >
      <p>请登录体验完整功能。</p>
    </Modal>
  )
}
