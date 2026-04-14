'use client'

import { Pipette } from 'lucide-react'
import { HexAlphaColorPicker } from 'react-colorful'
import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './ResumeColorPickerControl.module.css'

function normalizeHexAlpha(value: string) {
  const trimmed = String(value || '').trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{8}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}ff`
  if (/^[0-9a-fA-F]{4}$/.test(trimmed)) {
    return `#${trimmed.split('').map(char => `${char}${char}`).join('').toLowerCase()}`
  }
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed.split('').map(char => `${char}${char}`).join('').toLowerCase()}ff`
  }
  return '#1f2937ff'
}

function compressOpaqueHex(value: string) {
  const normalized = normalizeHexAlpha(value)
  return normalized.endsWith('ff') ? normalized.slice(0, 7) : normalized
}

function parseHexColor(value: string) {
  const normalized = normalizeHexAlpha(value).slice(1)
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  const a = Number.parseInt(normalized.slice(6, 8), 16) / 255
  return { r, g, b, a }
}

function rgbToHsv(r: number, g: number, b: number) {
  const nr = r / 255
  const ng = g / 255
  const nb = b / 255
  const max = Math.max(nr, ng, nb)
  const min = Math.min(nr, ng, nb)
  const delta = max - min

  let h = 0
  if (delta > 0) {
    if (max === nr) {
      h = ((ng - nb) / delta) % 6
    } else if (max === ng) {
      h = (nb - nr) / delta + 2
    } else {
      h = (nr - ng) / delta + 4
    }
    h *= 60
    if (h < 0) h += 360
  }

  const s = max === 0 ? 0 : (delta / max) * 100
  const v = max * 100

  return {
    h: Math.round(h),
    s: Math.round(s),
    v: Math.round(v),
  }
}

export function ResumeColorPickerControl({
  value,
  onChange,
  ariaLabel,
  align = 'right',
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)
  const [alignmentHost, setAlignmentHost] = useState<HTMLElement | null>(null)
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>()
  const pickerValue = useMemo(() => normalizeHexAlpha(value), [value])

  const stats = useMemo(() => {
    const rgba = parseHexColor(pickerValue)
    const hsv = rgbToHsv(rgba.r, rgba.g, rgba.b)
    return {
      hex: compressOpaqueHex(pickerValue).toUpperCase(),
      hue: hsv.h,
      saturation: hsv.s,
      alpha: Math.round(rgba.a * 100),
    }
  }, [pickerValue])

  useEffect(() => {
    setPortalHost(shellRef.current?.closest('.resume-builder-workbench') as HTMLElement | null)
    setAlignmentHost(
      shellRef.current?.closest('.resume-context-panel, .resume-editor-panel, .resume-side-panel') as HTMLElement | null,
    )
  }, [])

  useEffect(() => {
    if (!open) {
      setPopoverStyle(undefined)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (shellRef.current?.contains(target)) return
      if (popoverRef.current?.contains(target)) return
      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const updatePopoverPosition = () => {
      const trigger = shellRef.current
      const panel = popoverRef.current
      if (!trigger || !panel) return

      const triggerRect = trigger.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const hostRect =
        portalHost && portalHost !== document.body
          ? portalHost.getBoundingClientRect()
          : null
      const alignmentRect = alignmentHost?.getBoundingClientRect() || triggerRect
      const panelWidth = Math.min(panelRect.width || 340, Math.max(280, window.innerWidth - 32))
      const panelHeight = panelRect.height || 420
      const gap = 14
      const viewportPadding = 16

      const preferredRightLeft = alignmentRect.right + gap
      const preferredLeftLeft = alignmentRect.left - panelWidth - gap

      let left =
        align === 'left'
          ? preferredLeftLeft
          : preferredRightLeft

      if (align === 'right' && left + panelWidth > window.innerWidth - viewportPadding) {
        left = Math.max(viewportPadding, preferredLeftLeft)
      }

      if (align === 'left' && left < viewportPadding) {
        left = Math.min(window.innerWidth - panelWidth - viewportPadding, preferredRightLeft)
      }

      left = Math.min(
        Math.max(viewportPadding, left),
        Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding),
      )

      const alignedTop = alignmentRect.top
      const top = Math.min(
        Math.max(viewportPadding, alignedTop),
        Math.max(viewportPadding, window.innerHeight - panelHeight - viewportPadding),
      )

      setPopoverStyle({
        position: hostRect ? 'absolute' : 'fixed',
        top: hostRect ? top - hostRect.top : top,
        left: hostRect ? left - hostRect.left : left,
        width: panelWidth,
      })
    }

    updatePopoverPosition()
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)

    return () => {
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [align, alignmentHost, open, portalHost])

  const popover = open ? (
    <div
      ref={popoverRef}
      className="resume-advanced-color-picker-popover"
      style={{
        ...popoverStyle,
        visibility: popoverStyle ? 'visible' : 'hidden',
      }}
    >
      <div className="resume-advanced-color-picker-panel">
        <div className="resume-advanced-color-picker-panel-head">
          <div className="resume-advanced-color-picker-panel-title">
            <span className="resume-advanced-color-picker-panel-icon" aria-hidden="true">
              <Pipette size={14} />
            </span>
            <span>{ariaLabel}</span>
          </div>
        </div>

        <HexAlphaColorPicker
          color={pickerValue}
          onChange={next => onChange(compressOpaqueHex(next))}
          className="resume-custom-picker"
        />

        <div className="resume-advanced-color-picker-stats">
          <div className="resume-advanced-color-picker-stat is-wide">
            <span className="resume-advanced-color-picker-stat-value">{stats.hex}</span>
            <span className="resume-advanced-color-picker-stat-label">HEX</span>
          </div>
          <div className="resume-advanced-color-picker-stat">
            <span className="resume-advanced-color-picker-stat-value">{stats.hue}</span>
            <span className="resume-advanced-color-picker-stat-label">色相</span>
          </div>
          <div className="resume-advanced-color-picker-stat">
            <span className="resume-advanced-color-picker-stat-value">{stats.saturation}</span>
            <span className="resume-advanced-color-picker-stat-label">饱和</span>
          </div>
          <div className="resume-advanced-color-picker-stat">
            <span className="resume-advanced-color-picker-stat-value">{stats.alpha}%</span>
            <span className="resume-advanced-color-picker-stat-label">透明</span>
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <div
      ref={shellRef}
      className={`${styles.picker} resume-advanced-color-picker-shell${align === 'left' ? ' is-left' : ' is-right'}${open ? ' is-open' : ''}`}
    >
      <button
        type="button"
        className="resume-advanced-color-picker-trigger"
        onClick={() => setOpen(current => !current)}
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <span className="resume-advanced-color-picker-hex">{stats.hex}</span>
        <span className="resume-advanced-color-picker-swatch" style={{ backgroundColor: compressOpaqueHex(pickerValue) }} aria-hidden="true" />
      </button>
      {open && typeof document !== 'undefined' ? createPortal(popover, portalHost || document.body) : null}
    </div>
  )
}
