'use client'

import { ReactNode, useEffect } from 'react'
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
  panelClassName?: string
  contentClassName?: string
  footerClassName?: string
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  panelClassName,
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
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative bg-background rounded-[22px] border border-border shadow-lg max-w-md w-full mx-4 p-6 animate-slide-up',
          panelClassName,
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-[10px] transition-colors"
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

export function ConfirmModal({
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
}

export function AuthRequiredModal({ open, onClose, redirectPath }: AuthRequiredModalProps) {
  const handleLogin = () => {
    const next = redirectPath || window.location.pathname
    window.location.href = `/login?next=${encodeURIComponent(next)}`
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="需要登录"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleLogin}>
            去登录
          </Button>
        </>
      }
    >
      <p>请先登录后继续</p>
    </Modal>
  )
}
