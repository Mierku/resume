'use client'

import { useEffect, useRef, useState } from 'react'

export type FloatingPanelPhase = 'closed' | 'opening' | 'open' | 'closing'

export const FLOATING_PANEL_ANIMATION_MS = 240

export function useFloatingPanelPresence(open: boolean, animationMs = FLOATING_PANEL_ANIMATION_MS) {
  const [mounted, setMounted] = useState(open)
  const [phase, setPhase] = useState<FloatingPanelPhase>(open ? 'open' : 'closed')
  const mountedRef = useRef(open)
  const frameRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = mounted
  }, [mounted])

  useEffect(() => {
    const clearPending = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    if (!initializedRef.current) {
      initializedRef.current = true
      return clearPending
    }

    if (open) {
      frameRef.current = window.requestAnimationFrame(() => {
        mountedRef.current = true
        setMounted(true)
        setPhase('opening')

        frameRef.current = window.requestAnimationFrame(() => {
          setPhase('open')
        })
      })

      return clearPending
    }

    if (!mountedRef.current) {
      frameRef.current = window.requestAnimationFrame(() => {
        setPhase('closed')
      })
      return clearPending
    }

    frameRef.current = window.requestAnimationFrame(() => {
      setPhase('closing')
      timeoutRef.current = window.setTimeout(() => {
        mountedRef.current = false
        setMounted(false)
        setPhase('closed')
      }, animationMs)
    })

    return clearPending
  }, [animationMs, open])

  return { mounted: open || mounted, phase }
}
