'use client'

import { Field as FieldPrimitive } from '@base-ui/react/field'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const Field = FieldPrimitive.Root

const FieldLabel = forwardRef<HTMLElement, FieldPrimitive.Label.Props>(function FieldLabel(
  { className, nativeLabel = true, ...props },
  ref,
) {
  return (
    <FieldPrimitive.Label
      ref={ref}
      nativeLabel={nativeLabel}
      className={cn('mb-1 block text-xs text-muted-foreground', className)}
      {...props}
    />
  )
})

const FieldDescription = forwardRef<HTMLParagraphElement, FieldPrimitive.Description.Props>(function FieldDescription(
  { className, ...props },
  ref,
) {
  return <FieldPrimitive.Description ref={ref} className={cn('mt-1 text-[11px] text-muted-foreground', className)} {...props} />
})

const FieldError = forwardRef<HTMLDivElement, FieldPrimitive.Error.Props>(function FieldError(
  { className, ...props },
  ref,
) {
  return <FieldPrimitive.Error ref={ref} className={cn('mt-1 text-[11px] text-red-500', className)} {...props} />
})

export { Field,   FieldLabel }
