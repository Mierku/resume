'use client'

import { useEffect, useRef, useState } from 'react'

export type FloatingPanelPhase = 'closed' | 'opening' | 'open' | 'closing'

export const FLOATING_PANEL_ANIMATION_MS = 190

export function useFloatingPanelPresence(open: boolean, animationMs = FLOATING_PANEL_ANIMATION_MS) {
  const [mounted, setMounted] = useState(open)
  const [phase, setPhase] = useState<FloatingPanelPhase>(open ? 'open' : 'closed')
  const mountedRef = useRef(open)
  const frameRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

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

    clearPending()

    if (open) {
      mountedRef.current = true
      setMounted(true)
      setPhase('opening')

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = window.requestAnimationFrame(() => {
          setPhase('open')
        })
      })

      return clearPending
    }

    if (!mountedRef.current) {
      setPhase('closed')
      return clearPending
    }

    setPhase('closing')
    timeoutRef.current = window.setTimeout(() => {
      mountedRef.current = false
      setMounted(false)
      setPhase('closed')
    }, animationMs)

    return clearPending
  }, [animationMs, open])

  return { mounted, phase }
}
