'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  formatNumericValue,
  parseNumericInput,
  type NumericLimitConfig,
} from '@/lib/resume/editor-limits'
import styles from './ToolSliderField.module.scss'

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
  const [dragValue, setDragValue] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const railRef = useRef<HTMLDivElement | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const pendingValueRef = useRef<number | null>(null)
  const config: NumericLimitConfig = {
    min,
    max,
    step: resolvedStep,
    defaultValue: value,
    presets: [],
  }
  const isSameValue = (a: number, b: number) => Math.abs(a - b) < 0.000001

  const clamp = (raw: number) => Math.min(max, Math.max(min, raw))
  const stepPrecision = (() => {
    const fraction = String(resolvedStep).split('.')[1]
    return fraction ? Math.min(fraction.length, 6) : 0
  })()
  const dragPrecision = Math.max(stepPrecision, 2)
  const roundToPrecision = (raw: number, precision: number) =>
    Number(raw.toFixed(precision))
  const sliderRange = Math.max(0, max - min)
  const sliderValue = dragValue ?? value
  const progressPercent = sliderRange <= 0 ? 0 : ((sliderValue - min) / sliderRange) * 100

  const snapToStep = useCallback(
    (raw: number) => {
      if (!Number.isFinite(raw)) return value
      if (resolvedStep <= 0) return clamp(raw)
      const snapped = min + Math.round((raw - min) / resolvedStep) * resolvedStep
      return Number(clamp(snapped).toFixed(stepPrecision))
    },
    [clamp, min, resolvedStep, stepPrecision, value],
  )

  const resolveValueFromPointer = useCallback(
    (clientX: number) => {
      const rail = railRef.current
      if (!rail) return sliderValue
      const rect = rail.getBoundingClientRect()
      if (rect.width <= 0) return sliderValue
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return roundToPrecision(clamp(min + ratio * sliderRange), dragPrecision)
    },
    [clamp, dragPrecision, min, sliderRange, sliderValue],
  )

  const flushPendingChange = useCallback(() => {
    if (pendingValueRef.current === null) return
    const next = pendingValueRef.current
    pendingValueRef.current = null
    if (isSameValue(next, value)) return
    onChange(next)
  }, [onChange, value])

  const queueChange = useCallback(
    (next: number) => {
      pendingValueRef.current = next
      if (typeof window === 'undefined' || rafRef.current !== null) return
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null
        flushPendingChange()
      })
    },
    [flushPendingChange],
  )

  const applyPointerValue = useCallback(
    (clientX: number) => {
      const next = resolveValueFromPointer(clientX)
      setDragValue(next)
      setDraftValue(String(roundToPrecision(next, dragPrecision)))
      queueChange(next)
    },
    [dragPrecision, queueChange, resolveValueFromPointer],
  )

  const finishDrag = useCallback(
    (clientX?: number) => {
      if (typeof clientX === 'number') {
        applyPointerValue(clientX)
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      flushPendingChange()
      setIsDragging(false)
      setDragValue(null)
      pointerIdRef.current = null
    },
    [applyPointerValue, flushPendingChange],
  )

  useEffect(() => {
    if (!isDragging) {
      const nextDraftValue = formatNumericValue(value, resolvedStep)
      setDraftValue((previous) => (previous === nextDraftValue ? previous : nextDraftValue))
    }
  }, [isDragging, resolvedStep, value])

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    },
    [],
  )

  const commitDraftValue = (rawValue: string) => {
    const normalized = parseNumericInput(rawValue, config, value)
    if (!isSameValue(normalized, value)) {
      onChange(normalized)
    }
    setDraftValue(formatNumericValue(normalized, resolvedStep))
  }

  return (
    <div className={`resume-tool-slider-field ${styles.field}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      <div className={`resume-tool-slider-title-row ${styles.titleRow}`}>
        <span className="resume-tool-slider-label">{label}</span>
      </div>
      <div className="resume-tool-slider-row">
        <div
          ref={railRef}
          role="slider"
          tabIndex={0}
          aria-label={`${label}滑块`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={Number(sliderValue.toFixed(4))}
          aria-valuetext={formatter ? formatter(sliderValue) : String(sliderValue)}
          className={`resume-tool-slider-control resume-tool-slider-rail${isDragging ? ' is-dragging' : ''}`}
          onPointerDown={event => {
            event.preventDefault()
            pointerIdRef.current = event.pointerId
            event.currentTarget.setPointerCapture(event.pointerId)
            setIsDragging(true)
            applyPointerValue(event.clientX)
          }}
          onPointerMove={event => {
            if (!isDragging || pointerIdRef.current !== event.pointerId) return
            applyPointerValue(event.clientX)
          }}
          onPointerUp={event => {
            if (pointerIdRef.current !== event.pointerId) return
            finishDrag(event.clientX)
          }}
          onPointerCancel={event => {
            if (pointerIdRef.current !== event.pointerId) return
            finishDrag()
          }}
          onLostPointerCapture={() => {
            if (!isDragging) return
            finishDrag()
          }}
          onKeyDown={event => {
            let next = sliderValue
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              next = sliderValue - resolvedStep
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              next = sliderValue + resolvedStep
            } else if (event.key === 'Home') {
              next = min
            } else if (event.key === 'End') {
              next = max
            } else if (event.key === 'PageDown') {
              next = sliderValue - resolvedStep * 10
            } else if (event.key === 'PageUp') {
              next = sliderValue + resolvedStep * 10
            } else {
              return
            }
            event.preventDefault()
            const normalized = snapToStep(next)
            setDragValue(null)
            setDraftValue(formatNumericValue(normalized, resolvedStep))
            if (!isSameValue(normalized, value)) {
              onChange(normalized)
            }
          }}
        >
          <span className="resume-tool-slider-track" aria-hidden="true" />
          <span
            className="resume-tool-slider-track-fill"
            aria-hidden="true"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
          <span
            className="resume-tool-slider-thumb"
            aria-hidden="true"
            style={{ left: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
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
              const normalized = parseNumericInput(nextValue, config, value)
              if (!isSameValue(normalized, value)) {
                onChange(normalized)
              }
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
