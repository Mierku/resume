'use client'

import { Popover } from '@base-ui/react/popover'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { Field, FieldLabel } from '@/components/ui/field'
import { MAX_TIME_YEAR, MIN_TIME_YEAR, MONTH_OPTIONS, isYearMonthValue, yearMonthToYear } from '@/lib/date-fields'
import { cn } from '@/lib/utils'

function clampYear(value: number) {
  return Math.max(MIN_TIME_YEAR, Math.min(MAX_TIME_YEAR, value))
}

function compareYearMonth(a: string, b: string) {
  return a.localeCompare(b)
}

function formatMonthValue(year: number, month: string) {
  return `${year}-${month}`
}

function resolveInitialYear(value: string, fallback: number) {
  return clampYear(yearMonthToYear(value) || fallback)
}

function formatMonthLabel(month: string) {
  return `${Number(month)}月`
}

interface DateRangePickerFieldProps {
  label?: string
  start: string
  end: string
  placeholder?: string
  id?: string
  name?: string
  className?: string
  popupClassName?: string
  positionerStyle?: CSSProperties
  onChange: (nextStart: string, nextEnd: string) => void
}

export function DateRangePickerField({
  label,
  start,
  end,
  placeholder = '选择时间段',
  id,
  name,
  className,
  popupClassName,
  positionerStyle,
  onChange,
}: DateRangePickerFieldProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const currentYear = new Date().getFullYear()
  const [startYear, setStartYear] = useState(() => resolveInitialYear(start, currentYear))
  const [endYear, setEndYear] = useState(() => resolveInitialYear(end, currentYear))

  const displayText = useMemo(() => {
    if (start && end) {
      return `${start} - ${end}`
    }

    if (start) {
      return start
    }

    return placeholder
  }, [end, placeholder, start])

  const getInitialFocusTarget = () =>
    panelRef.current?.querySelector<HTMLElement>('[data-selected-month="true"]') ||
    panelRef.current?.querySelector<HTMLElement>('[data-month-button="true"]:not([disabled])') ||
    true

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      const fallbackYear = yearMonthToYear(start) || yearMonthToYear(end) || currentYear
      setStartYear(resolveInitialYear(start, fallbackYear))
      setEndYear(resolveInitialYear(end, fallbackYear))
    }
    setOpen(nextOpen)
  }

  const handleStartSelect = (nextStart: string) => {
    if (isYearMonthValue(end) && compareYearMonth(nextStart, end) > 0) {
      onChange(nextStart, '')
      return
    }

    onChange(nextStart, end)
  }

  const handleEndSelect = (nextEnd: string) => {
    if (!start) {
      onChange(nextEnd, '')
      setStartYear(resolveInitialYear(nextEnd, currentYear))
      return
    }

    if (compareYearMonth(nextEnd, start) < 0) {
      return
    }

    onChange(start, nextEnd)
    setOpen(false)
  }

  return (
    <Field className={cn('resume-period-range-field', className)}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      {name ? <input type="hidden" name={name} value={displayText} /> : null}

      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          data-open={open ? 'true' : undefined}
          className={cn('control-field control-date-trigger resume-period-range-trigger has-icon', open && 'is-open')}
        >
          <span className={cn('min-w-0 flex-1 truncate', !start && 'text-muted-foreground')}>{displayText}</span>
          <span className="control-date-trigger-icon resume-period-range-trigger-icon" aria-hidden>
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
            className="resume-period-range-positioner z-[140]"
            style={{
              width: 'min(540px, var(--available-width))',
              minWidth: 'min(340px, var(--available-width))',
              ...positionerStyle,
            }}
          >
            <Popover.Popup
              ref={panelRef}
              initialFocus={() => getInitialFocusTarget()}
              className={cn('resume-period-range-panel control-panel control-floating-panel control-date-panel overflow-hidden', popupClassName)}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <MonthColumn
                  title="开始时间"
                  year={startYear}
                  value={start}
                  onYearChange={setStartYear}
                  onSelect={handleStartSelect}
                />
                <MonthColumn
                  title="结束时间"
                  year={endYear}
                  value={isYearMonthValue(end) ? end : ''}
                  minValue={start}
                  onYearChange={setEndYear}
                  onSelect={handleEndSelect}
                />
              </div>

              <div className="control-date-actions resume-period-range-actions">
                <button
                  type="button"
                  className="control-date-action resume-period-range-action"
                  onClick={() => {
                    onChange('', '')
                    setOpen(false)
                  }}
                >
                  清空
                </button>
                <button
                  type="button"
                  className={cn('control-date-action resume-period-range-action', end === '至今' && 'is-active')}
                  onClick={() => {
                    const fallbackMonth = formatMonthValue(currentYear, String(new Date().getMonth() + 1).padStart(2, '0'))
                    const nextStart = start && isYearMonthValue(start) ? start : fallbackMonth
                    onChange(nextStart, '至今')
                    setOpen(false)
                  }}
                >
                  至今
                </button>
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </Field>
  )
}

interface MonthColumnProps {
  title: string
  year: number
  value: string
  minValue?: string
  onYearChange: React.Dispatch<React.SetStateAction<number>>
  onSelect: (value: string) => void
}

function MonthColumn({ title, year, value, minValue, onYearChange, onSelect }: MonthColumnProps) {
  return (
    <section className="control-date-column">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="control-date-section-label">{title}</span>
        <div className="control-date-year-controls">
          <button
            type="button"
            className="control-date-secondary-btn"
            onClick={() => onYearChange(prev => clampYear(prev - 1))}
          >
            <ChevronLeft size={16} strokeWidth={1.8} />
          </button>
          <span className="control-date-year-label">{year} 年</span>
          <button
            type="button"
            className="control-date-secondary-btn"
            onClick={() => onYearChange(prev => clampYear(prev + 1))}
          >
            <ChevronRight size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="control-date-grid grid-cols-3">
        {MONTH_OPTIONS.map(month => {
          const nextValue = formatMonthValue(year, month)
          const active = value === nextValue
          const disabled = Boolean(minValue && isYearMonthValue(minValue) && compareYearMonth(nextValue, minValue) < 0)

          return (
            <button
              key={`${title}-${nextValue}`}
              type="button"
              data-month-button="true"
              data-selected-month={active ? 'true' : undefined}
              disabled={disabled}
              className={cn('control-date-grid-button', active && 'is-active')}
              onClick={() => onSelect(nextValue)}
            >
              {formatMonthLabel(month)}
            </button>
          )
        })}
      </div>
    </section>
  )
}
