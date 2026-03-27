'use client'

import { Popover } from '@base-ui/react/popover'
import { CalendarDays } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { zhCN } from 'date-fns/locale/zh-CN'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'

function isDateValue(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)
}

function dateValueToDate(value: string) {
  if (!isDateValue(value)) return null
  const [yearPart, monthPart, dayPart] = value.split('-')
  const year = Number(yearPart)
  const month = Number(monthPart)
  const day = Number(dayPart)

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null
  }

  return new Date(year, month - 1, day)
}

function dateToValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export interface DatePickerFieldProps {
  label?: string
  value: string
  placeholder?: string
  id?: string
  name?: string
  disabled?: boolean
  showLabel?: boolean
  className?: string
  popupClassName?: string
  positionerStyle?: CSSProperties
  onChange: (value: string) => void
}

export function DatePickerField({
  label,
  value,
  placeholder = '选择日期',
  id,
  name,
  disabled = false,
  showLabel = true,
  className,
  popupClassName,
  positionerStyle,
  onChange,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const selectedDate = useMemo(() => dateValueToDate(value), [value])
  const [month, setMonth] = useState<Date>(selectedDate || new Date())

  const displayText = value || placeholder

  const getInitialFocusTarget = () =>
    panelRef.current?.querySelector<HTMLElement>('.rdp-day_button[aria-selected="true"]') ||
    panelRef.current?.querySelector<HTMLElement>('.rdp-day_button:not([disabled])') ||
    true

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) return
    if (nextOpen) {
      setMonth(selectedDate || new Date())
    }
    setOpen(nextOpen)
  }

  return (
    <Field className={cn('resume-date-picker-field', className)}>
      {showLabel && label ? <FieldLabel>{label}</FieldLabel> : null}
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-open={open ? 'true' : undefined}
          disabled={disabled}
          className={cn(
            'control-field flex h-9 w-full items-center gap-2 px-3 py-2 text-sm leading-5 text-foreground outline-none transition-all duration-200',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <span className={cn('min-w-0 flex-1 truncate text-left', !value && 'text-muted-foreground')}>{displayText}</span>
          <span className="inline-flex shrink-0 text-muted-foreground" aria-hidden>
            <CalendarDays size={16} strokeWidth={1.8} />
          </span>
        </Popover.Trigger>

        <Popover.Portal keepMounted>
          <Popover.Positioner
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={12}
            positionMethod="fixed"
            collisionAvoidance={{ side: 'flip', align: 'shift', fallbackAxisSide: 'none' }}
            className="z-[140]"
            style={{
              width: 'min(360px, var(--available-width))',
              minWidth: 'min(340px, var(--available-width))',
              ...positionerStyle,
            }}
          >
            <Popover.Popup
              ref={panelRef}
              initialFocus={() => getInitialFocusTarget()}
              className={cn('control-panel control-floating-panel overflow-hidden rounded-[18px] p-3', popupClassName)}
            >
              <Calendar
                mode="single"
                locale={zhCN}
                selected={selectedDate || undefined}
                month={month}
                onMonthChange={setMonth}
                captionLayout="dropdown"
                navLayout="after"
                reverseYears
                fixedWeeks
                showOutsideDays
                className="resume-date-picker-calendar"
                onSelect={date => {
                  onChange(date ? dateToValue(date) : '')
                  if (date) {
                    setOpen(false)
                  }
                }}
              />

              <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-[10px] px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                >
                  清空
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center rounded-[10px] px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    const today = dateToValue(new Date())
                    onChange(today)
                    setMonth(dateValueToDate(today) || new Date())
                    setOpen(false)
                  }}
                >
                  今天
                </button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </Field>
  )
}
