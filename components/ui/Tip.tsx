'use client'

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './Tip.module.scss'

export type TipPlacement = 'top' | 'bottom' | 'left' | 'right'
export type TipAlign = 'start' | 'center' | 'end'

interface TipProps {
  content: ReactNode
  children: ReactNode
  placement?: TipPlacement
  align?: TipAlign
  offset?: number
  delayMs?: number
  disabled?: boolean
  className?: string
  triggerClassName?: string
}

interface TipPosition {
  top: number
  left: number
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function Tip({
  content,
  children,
  placement = 'top',
  align = 'center',
  offset = 6,
  delayMs = 110,
  disabled = false,
  className,
  triggerClassName,
}: TipProps) {
  const tipId = useId()
  const triggerRef = useRef<HTMLSpanElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const openTimerRef = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<TipPosition>({ top: -9999, left: -9999 })
  const visible = open && !disabled

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
  }, [])

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    const tip = contentRef.current
    if (!trigger || !tip) return

    const triggerRect = trigger.getBoundingClientRect()
    const tipRect = tip.getBoundingClientRect()
    const viewportPadding = 8

    let nextTop = 0
    let nextLeft = 0

    if (placement === 'top') {
      nextTop = triggerRect.top - tipRect.height - offset
      if (align === 'start') {
        nextLeft = triggerRect.left
      } else if (align === 'end') {
        nextLeft = triggerRect.right - tipRect.width
      } else {
        nextLeft = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2
      }
    } else if (placement === 'bottom') {
      nextTop = triggerRect.bottom + offset
      if (align === 'start') {
        nextLeft = triggerRect.left
      } else if (align === 'end') {
        nextLeft = triggerRect.right - tipRect.width
      } else {
        nextLeft = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2
      }
    } else if (placement === 'left') {
      if (align === 'start') {
        nextTop = triggerRect.top
      } else if (align === 'end') {
        nextTop = triggerRect.bottom - tipRect.height
      } else {
        nextTop = triggerRect.top + triggerRect.height / 2 - tipRect.height / 2
      }
      nextLeft = triggerRect.left - tipRect.width - offset
    } else {
      if (align === 'start') {
        nextTop = triggerRect.top
      } else if (align === 'end') {
        nextTop = triggerRect.bottom - tipRect.height
      } else {
        nextTop = triggerRect.top + triggerRect.height / 2 - tipRect.height / 2
      }
      nextLeft = triggerRect.right + offset
    }

    const maxLeft = window.innerWidth - tipRect.width - viewportPadding
    const maxTop = window.innerHeight - tipRect.height - viewportPadding
    setPosition({
      top: clamp(nextTop, viewportPadding, maxTop),
      left: clamp(nextLeft, viewportPadding, maxLeft),
    })
  }, [align, offset, placement])

  useEffect(() => {
    return () => {
      clearOpenTimer()
    }
  }, [clearOpenTimer])

  useEffect(() => {
    if (!disabled) return
    clearOpenTimer()
  }, [clearOpenTimer, disabled])

  useLayoutEffect(() => {
    if (!visible) return

    updatePosition()

    const onWindowChange = () => {
      updatePosition()
    }

    window.addEventListener('resize', onWindowChange)
    window.addEventListener('scroll', onWindowChange, true)
    return () => {
      window.removeEventListener('resize', onWindowChange)
      window.removeEventListener('scroll', onWindowChange, true)
    }
  }, [updatePosition, visible])

  const show = () => {
    if (disabled || !content) return
    clearOpenTimer()
    openTimerRef.current = window.setTimeout(() => {
      setOpen(true)
    }, delayMs)
  }

  const hide = () => {
    clearOpenTimer()
    setOpen(false)
  }

  const contentStyle: CSSProperties = {
    top: position.top,
    left: position.left,
  }

  return (
    <>
      <span
        ref={triggerRef}
        className={[styles.trigger, triggerClassName].filter(Boolean).join(' ')}
        aria-describedby={visible ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            hide()
          }
        }}
      >
        {children}
      </span>
      {typeof document !== 'undefined' && visible
        ? createPortal(
            <div
              ref={contentRef}
              id={tipId}
              role="tooltip"
              className={[styles.content, className].filter(Boolean).join(' ')}
              style={contentStyle}
              data-placement={placement}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
