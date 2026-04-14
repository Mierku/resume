'use client'

import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        outline: 'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost: 'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: 'h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*=\'size-\'])]:size-3',
        sm: 'h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*=\'size-\'])]:size-3.5',
        lg: 'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-8',
        'icon-xs': 'size-6 rounded-[min(var(--radius-md),10px)] [&_svg:not([class*=\'size-\'])]:size-3',
        'icon-sm': 'size-7 rounded-[min(var(--radius-md),12px)]',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

type NativeButtonType = 'button' | 'submit' | 'reset'
type LegacyButtonType = 'primary' | 'secondary' | 'outline' | 'text' | 'default'
type LegacyButtonSize = 'mini' | 'small' | 'default' | 'large'
type ModernButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>
type ModernButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>

interface ButtonProps extends Omit<ButtonPrimitive.Props, 'type'>, Omit<VariantProps<typeof buttonVariants>, 'size'> {
  type?: NativeButtonType | LegacyButtonType
  htmlType?: NativeButtonType
  loading?: boolean
  long?: boolean
  icon?: ReactNode
  status?: 'danger'
  size?: ModernButtonSize | LegacyButtonSize
}

function isNativeButtonType(type: ButtonProps['type']): type is NativeButtonType {
  return type === 'button' || type === 'submit' || type === 'reset'
}

function resolveVariant(
  type: ButtonProps['type'],
  variant: ButtonProps['variant'],
  status: ButtonProps['status'],
): ModernButtonVariant {
  if (status === 'danger' && variant == null && (type == null || type === 'default' || type === 'secondary' || type === 'text')) {
    return 'destructive'
  }

  if (variant) {
    return variant
  }

  switch (type) {
    case 'secondary':
      return 'secondary'
    case 'outline':
      return 'outline'
    case 'text':
      return 'ghost'
    case 'default':
    case 'primary':
    case undefined:
    case 'button':
    case 'submit':
    case 'reset':
      return 'default'
  }
}

function resolveSize(size: ButtonProps['size']): ModernButtonSize {
  switch (size) {
    case 'mini':
      return 'xs'
    case 'small':
      return 'sm'
    case 'large':
      return 'lg'
    case 'xs':
    case 'sm':
    case 'lg':
    case 'icon':
    case 'icon-xs':
    case 'icon-sm':
    case 'icon-lg':
    case 'default':
    case undefined:
      return size ?? 'default'
  }
}

function resolveHtmlType(type: ButtonProps['type'], htmlType: ButtonProps['htmlType']) {
  if (isNativeButtonType(type)) {
    return type
  }

  return htmlType ?? 'button'
}

function renderInlineIcon(icon: ReactNode, loading: boolean) {
  const content = loading ? <Loader2 className="size-4 animate-spin" /> : icon

  if (!content) {
    return null
  }

  return (
    <span data-icon="inline-start" className="inline-flex items-center justify-center">
      {content}
    </span>
  )
}

function Button({
  className,
  variant,
  size = 'default',
  type,
  htmlType,
  loading = false,
  long = false,
  icon,
  status,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const resolvedVariant = resolveVariant(type, variant, status)
  const resolvedSize = resolveSize(size)

  return (
    <ButtonPrimitive
      type={resolveHtmlType(type, htmlType)}
      disabled={disabled || loading}
      data-slot="button"
      className={cn(
        buttonVariants({ variant: resolvedVariant, size: resolvedSize }),
        long && 'w-full',
        className,
      )}
      {...props}
    >
      {renderInlineIcon(icon, loading)}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
