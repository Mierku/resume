'use client'

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<CheckboxPrimitive.Root.Props, 'onCheckedChange'> {
  onCheckedChange?: (checked: boolean) => void
  indicatorClassName?: string
}

export function Checkbox({
  className,
  indicatorClassName,
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      onCheckedChange={nextChecked => onCheckedChange?.(nextChecked)}
      data-slot="checkbox"
      className={cn(
        'control-checkbox size-4 shrink-0 cursor-pointer select-none outline-none disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn('control-checkbox-indicator inline-flex items-center justify-center', indicatorClassName)}
      >
        <Check className="size-3.5" strokeWidth={2.4} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
