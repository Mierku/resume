'use client'

import { useEffect, useState } from 'react'
import {
  formatNumericValue,
  parseNumericInput,
  type NumericLimitConfig,
} from '@/lib/resume/editor-limits'
import { Slider } from '../../primitives'
import styles from './ToolSliderField.module.css'

export function ToolSliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
  formatter,
  inputAriaLabel,
  inputClassName = '',
  onMouseEnter,
  onMouseLeave,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  displayValue?: number
  formatter?: (value: number) => string
  inputAriaLabel?: string
  inputClassName?: string
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  const resolvedStep = step ?? 1
  const shown = typeof displayValue === 'number' ? displayValue : value
  const renderValue = formatter ? formatter(shown) : String(shown)
  const [draftValue, setDraftValue] = useState(() => formatNumericValue(value, resolvedStep))
  const config: NumericLimitConfig = {
    min,
    max,
    step: resolvedStep,
    defaultValue: value,
    presets: [],
  }

  useEffect(() => {
    setDraftValue(formatNumericValue(value, resolvedStep))
  }, [resolvedStep, value])

  const commitDraftValue = (rawValue: string) => {
    const normalized = parseNumericInput(rawValue, config, value)
    onChange(normalized)
    setDraftValue(formatNumericValue(normalized, resolvedStep))
  }

  return (
    <div className={`resume-tool-slider-field ${styles.field}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className={`resume-tool-slider-title-row ${styles.titleRow}`}>
        <span className="resume-tool-slider-label">{label}</span>
      </div>
      <div className="resume-tool-slider-row">
        <Slider
          value={value}
          min={min}
          max={max}
          step={resolvedStep}
          onChange={onChange}
          className="resume-slider-control resume-tool-slider-control"
        />
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={resolvedStep}
          value={draftValue}
          onChange={event => {
            const nextValue = event.target.value
            setDraftValue(nextValue)
            if (!nextValue.trim()) return
            const parsed = Number(nextValue)
            if (Number.isFinite(parsed)) {
              onChange(parseNumericInput(nextValue, config, value))
            }
          }}
          onBlur={() => commitDraftValue(draftValue)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          className={`resume-tool-slider-input${inputClassName ? ` ${inputClassName}` : ''}`}
          aria-label={inputAriaLabel || `${label}数值`}
          title={renderValue}
        />
      </div>
    </div>
  )
}
