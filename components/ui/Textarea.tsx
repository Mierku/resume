'use client'

import { TextareaHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          data-invalid={error ? 'true' : undefined}
          className={cn(
            'control-field control-textarea-field w-full resize-y text-sm leading-6 text-foreground outline-none transition-[border-color,background-color,box-shadow] duration-200',
            className,
          )}
          {...props}
        />
        {error ? <p className="mt-1 text-[11px] text-red-500">{error}</p> : null}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

export { Textarea }
