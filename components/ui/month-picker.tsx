'use client'

import { Popover } from '@base-ui/react/popover'
import { ChevronDown } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { Field, FieldLabel } from '@/components/ui/field'
import { MAX_TIME_YEAR, MIN_TIME_YEAR, MONTH_OPTIONS, isYearMonthValue, yearMonthToYear } from '@/lib/date-fields'
import { cn } from '@/lib/utils'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

interface MonthPickerFieldProps {
  label?: string
  value: string
  placeholder?: string
  allowPresent?: boolean
  maxValue?: string
  showTriggerIcon?: boolean
  showLabel?: boolean
  id?: string
  name?: string
  className?: string
  popupClassName?: string
  positionerStyle?: CSSProperties
  onChange: (value: string) => void
}

export function MonthPickerField({
  label,
  value,
  placeholder,
  allowPresent = false,
  maxValue,
  showTriggerIcon = true,
  showLabel = true,
  id,
  name,
  className,
  popupClassName,
  positionerStyle,
  onChange,
}: MonthPickerFieldProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const initialYear = useMemo(() => yearMonthToYear(value) || new Date().getFullYear(), [value])
  const [year, setYear] = useState(initialYear)
  const maxYear = yearMonthToYear(maxValue || '') || MAX_TIME_YEAR

  const selectedYear = yearMonthToYear(value)
  const selectedMonth = isYearMonthValue(value) ? value.slice(5, 7) : null
  const displayText = value || placeholder || '选择日期'

  const getInitialFocusTarget = () =>
    panelRef.current?.querySelector<HTMLElement>('[data-selected-month="true"]') ||
    panelRef.current?.querySelector<HTMLElement>('[data-month-button="true"]:not([disabled])') ||
    true

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const nextYear = yearMonthToYear(value)
      setYear(clamp(nextYear || initialYear, MIN_TIME_YEAR, maxYear))
    }
    setOpen(nextOpen)
  }

  return (
    <Field className={cn('resume-month-picker-field', className)}>
      {showLabel && label ? <FieldLabel>{label}</FieldLabel> : null}
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-open={open ? 'true' : undefined}
          className={cn(
            'control-field control-date-trigger resume-month-picker-trigger',
            showTriggerIcon && 'has-icon',
            open && 'is-open',
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate', !value && 'text-muted-foreground')}>{displayText}</span>
          {showTriggerIcon ? (
            <span className="control-date-trigger-icon resume-month-picker-trigger-icon" aria-hidden>
              <ChevronDown className="h-4 w-4" />
            </span>
          ) : null}
        </Popover.Trigger>

        <Popover.Portal keepMounted>
          <Popover.Positioner
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={12}
            positionMethod="fixed"
            className="resume-month-picker-positioner z-[120]"
            style={{
              width: 'max(var(--anchor-width), 240px)',
              maxWidth: 'var(--available-width)',
              ...positionerStyle,
            }}
          >
            <Popover.Popup
              ref={panelRef}
              initialFocus={() => getInitialFocusTarget()}
              className={cn('resume-month-picker-panel control-panel control-floating-panel control-date-panel', popupClassName)}
            >
              <div className="resume-month-picker-panel-head">
                <button
                  type="button"
                  className="resume-month-picker-year-btn control-date-secondary-btn"
                  onClick={() => setYear(prev => clamp(prev - 1, MIN_TIME_YEAR, maxYear))}
                >
                  上一年
                </button>
                <span className="resume-month-picker-year-label control-date-year-label">{year} 年</span>
                <button
                  type="button"
                  className="resume-month-picker-year-btn control-date-secondary-btn"
                  onClick={() => setYear(prev => clamp(prev + 1, MIN_TIME_YEAR, maxYear))}
                >
                  下一年
                </button>
              </div>

              <div className="resume-month-picker-grid control-date-grid">
                {MONTH_OPTIONS.map(month => {
                  const nextValue = `${year}-${month}`
                  const active = selectedYear === year && selectedMonth === month
                  const disabled = Boolean(maxValue && isYearMonthValue(maxValue) && nextValue > maxValue)

                  return (
                    <button
                      key={`${label || 'month'}-${nextValue}`}
                      type="button"
                      data-month-button="true"
                      data-selected-month={active ? 'true' : undefined}
                      className={cn('resume-month-picker-cell control-date-grid-button', active && 'is-active')}
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) return
                        onChange(nextValue)
                        setOpen(false)
                      }}
                    >
                      {month}
                    </button>
                  )
                })}
              </div>

              <div className="resume-month-picker-panel-actions control-date-actions">
                <button
                  type="button"
                  className="resume-month-picker-action control-date-action"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  清空
                </button>
                {allowPresent ? (
                  <button
                    type="button"
                    className={cn('resume-month-picker-action control-date-action', value === '至今' && 'is-active')}
                    onClick={() => {
                      onChange('至今')
                      setOpen(false)
                    }}
                  >
                    至今
                  </button>
                ) : null}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </Field>
  )
}
