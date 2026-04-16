'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Tooltip } from '@/components/resume-builder/primitives'

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

interface EditorActionIconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  icon: ReactNode
  active?: boolean
  danger?: boolean
}

export function EditorActionIconButton({
  label,
  icon,
  active = false,
  danger = false,
  className,
  ...buttonProps
}: EditorActionIconButtonProps) {
  return (
    <Tooltip content={label} placement="bottom">
      <button
        type="button"
        aria-label={label}
        className={joinClassNames(
          'resume-editor-content-icon-btn',
          active && 'is-active',
          danger && 'is-danger',
          className,
        )}
        {...buttonProps}
      >
        {icon}
      </button>
    </Tooltip>
  )
}
