'use client'

import { Switch as SwitchPrimitive } from '@base-ui/react/switch'
import { cn } from '@/lib/utils'

type SwitchSize = 'default' | 'small'

export interface SwitchProps extends Omit<SwitchPrimitive.Root.Props, 'onCheckedChange'> {
  onCheckedChange?: (checked: boolean) => void
  size?: SwitchSize
}

export function Switch({
  className,
  checked,
  defaultChecked,
  disabled,
  onCheckedChange,
  size = 'default',
  ...props
}: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      onCheckedChange={nextChecked => onCheckedChange?.(nextChecked)}
      data-size={size}
      data-slot="switch"
      className={cn(
        'control-switch inline-flex shrink-0 cursor-pointer items-center rounded-full px-0.5 select-none outline-none disabled:cursor-not-allowed',
        size === 'small' ? 'h-5 w-9' : 'h-6 w-10',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn('control-switch-thumb block rounded-full', size === 'small' ? 'size-4' : 'size-5')}
      />
    </SwitchPrimitive.Root>
  )
}
