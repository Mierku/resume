'use client'

import { Search } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: string
  icon?: ReactNode
  wrapperClassName?: string
  iconClassName?: string
}

const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ className = '', error, icon, wrapperClassName = '', iconClassName = '', type = 'search', ...props }, ref) => {
    return (
      <div className="min-w-0">
        <div className={cn('control-search flex items-center gap-2 px-3', wrapperClassName)} data-invalid={error ? 'true' : undefined}>
          {icon || <Search aria-hidden className={cn('h-4 w-4 shrink-0 text-muted-foreground', iconClassName)} />}
          <input
            ref={ref}
            type={type}
            className={cn(
              'h-[calc(var(--control-search-height)-2px)] w-full min-w-0 border-0 bg-transparent px-0 text-sm text-[var(--control-field-text,var(--color-foreground))] outline-none placeholder:text-[var(--control-field-placeholder,var(--color-muted-foreground))]',
              className,
            )}
            {...props}
          />
        </div>
        {error ? <p className="mt-1 text-[11px] text-red-500">{error}</p> : null}
      </div>
    )
  },
)

SearchField.displayName = 'SearchField'

export { SearchField }
