'use client'

import { forwardRef, type ChangeEvent, type SelectHTMLAttributes } from 'react'
import { CustomSelect } from '@/components/ui/select-core'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'defaultValue' | 'onChange'> {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  placeholder?: string
  error?: string
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
}

function createSelectChangeEvent(name: string | undefined, value: string) {
  const target = {
    name,
    value,
  } as EventTarget & HTMLSelectElement

  return {
    target,
    currentTarget: target,
    type: 'change',
  } as ChangeEvent<HTMLSelectElement>
}

const Select = forwardRef<HTMLButtonElement, SelectProps>(
  ({ className = '', options, placeholder, error, onChange, value, defaultValue, name, disabled, style, id }, ref) => {
    return (
      <CustomSelect
        ref={ref}
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        style={style}
        className={className}
        placeholder={placeholder}
        error={error}
        options={options}
        onValueChange={nextValue => onChange?.(createSelectChangeEvent(name, nextValue))}
      />
    )
  }
)

Select.displayName = 'Select'

export { Select }
