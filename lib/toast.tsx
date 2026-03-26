'use client'

import { CheckCircle2, CircleAlert, CircleX, Info } from 'lucide-react'
import { toast as sonnerToast } from 'sonner'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

const DEFAULT_TOAST_DURATION = 2000

function resolveToastId(variant: ToastVariant, content: string) {
  return `${variant}:${content.trim()}`
}

function resolveToastIcon(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4" />
    case 'error':
      return <CircleX className="h-4 w-4" />
    case 'warning':
      return <CircleAlert className="h-4 w-4" />
    case 'info':
    default:
      return <Info className="h-4 w-4" />
  }
}

function showToast(variant: ToastVariant, content: string) {
  const options = {
    id: resolveToastId(variant, content),
    duration: DEFAULT_TOAST_DURATION,
    icon: resolveToastIcon(variant),
  }

  switch (variant) {
    case 'success':
      return sonnerToast.success(content, options)
    case 'error':
      return sonnerToast.error(content, options)
    case 'warning':
      return sonnerToast.warning(content, options)
    case 'info':
    default:
      return sonnerToast.info(content, options)
  }
}

export const toast = {
  success: (content: string) => showToast('success', content),
  error: (content: string) => showToast('error', content),
  warning: (content: string) => showToast('warning', content),
  info: (content: string) => showToast('info', content),
  message: (content: string) => showToast('info', content),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
}
