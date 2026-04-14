'use client'

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          data-invalid={error ? 'true' : undefined}
          className={cn(
            'control-field control-input-field w-full text-sm leading-5 text-foreground outline-none transition-[border-color,background-color,box-shadow] duration-200',
            className,
          )}
          {...props}
        />
        {error ? <p className="mt-1 text-[11px] text-red-500">{error}</p> : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input }
