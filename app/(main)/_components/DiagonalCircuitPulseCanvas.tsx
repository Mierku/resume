'use client'

import { useEffect, useRef } from 'react'

type Point = {
  x: number
  y: number
}

type AxisDirection = {
  x: 1 | 0
  y: 1 | 0
}

type CircuitVisualProfile = {
  color: {
    r: number
    g: number
    b: number
    hex: string
  }
  baseAlpha: number
  coreAlpha: number
  highlightAlpha: number
  shadowBlur: number
  headAlphaCap: number
  headShadowBlur: number
}

const LIGHT_PROFILE: CircuitVisualProfile = {
  color: {
    r: 191,
    g: 128,
    b: 62,
    hex: '#BF803E',
  },
  baseAlpha: 0.09,
  coreAlpha: 0.2,
  highlightAlpha: 0.16,
  shadowBlur: 6,
  headAlphaCap: 0.86,
  headShadowBlur: 11,
}

const DARK_PROFILE: CircuitVisualProfile = {
  color: {
    r: 255,
    g: 180,
    b: 80,
    hex: '#FFB450',
  },
  baseAlpha: 0.045,
  coreAlpha: 0.11,
  highlightAlpha: 0.1,
  shadowBlur: 5,
  headAlphaCap: 0.75,
  headShadowBlur: 10,
}

const OFFSCREEN_OFFSET = 120
const GRID_STEP = 10
const SEGMENT_MIN = 6
const SEGMENT_MAX = 16

class CircuitPulse {
  private x = 0
  private y = 0
  private direction: AxisDirection = { x: 1, y: 0 }
  private segmentRemaining = 0
  private fading = false

  points: Point[] = []
  alpha = 1
  glow = 1
  lineWidth = 1
  fadeSpeed = 0.02

  constructor(private readonly getSize: () => { width: number; height: number }) {
    this.spawn()
  }

  private chooseDirection() {
    const preferDiagonal = Math.random() < 0.18
    const goHorizontal = Math.random() > 0.5

    if (preferDiagonal) {
      this.direction = { x: 1, y: 1 }
      return
    }

    this.direction = goHorizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }
  }

  private chooseSegmentLength() {
    return SEGMENT_MIN + Math.floor(Math.random() * (SEGMENT_MAX - SEGMENT_MIN + 1))
  }

  private alignToGrid(value: number) {
    return Math.round(value / GRID_STEP) * GRID_STEP
  }

  private setSpawnPoint() {
    const { width, height } = this.getSize()
    const fromTop = Math.random() > 0.5

    if (fromTop) {
      this.x = this.alignToGrid(Math.random() * width)
      this.y = -OFFSCREEN_OFFSET
    } else {
      this.x = -OFFSCREEN_OFFSET
      this.y = this.alignToGrid(Math.random() * height)
    }
  }

  spawn() {
    this.setSpawnPoint()
    this.points = [{ x: this.x, y: this.y }]
    this.alpha = 0.72 + Math.random() * 0.28
    this.glow = 0.38 + Math.random() * 0.45
    this.lineWidth = 0.78 + Math.random() * 0.52
    this.fadeSpeed = 0.015 + Math.random() * 0.02
    this.fading = false
    this.segmentRemaining = this.chooseSegmentLength()
    this.chooseDirection()
  }

  private isOutsideScreen() {
    const { width, height } = this.getSize()
    return this.x > width + OFFSCREEN_OFFSET || this.y > height + OFFSCREEN_OFFSET
  }

  update() {
    if (this.fading) {
      this.alpha -= this.fadeSpeed
      return
    }

    if (this.segmentRemaining <= 0) {
      this.chooseDirection()
      this.segmentRemaining = this.chooseSegmentLength()
    }

    this.x += this.direction.x * GRID_STEP
    this.y += this.direction.y * GRID_STEP
    this.segmentRemaining -= 1
    this.points.push({ x: this.x, y: this.y })

    if (this.points.length > 260) {
      this.points.shift()
    }

    if (this.isOutsideScreen()) {
      this.fading = true
    }
  }

  isDead() {
    return this.alpha <= 0
  }

  draw(ctx: CanvasRenderingContext2D, profile: CircuitVisualProfile) {
    if (this.points.length < 2 || this.alpha <= 0) {
      return
    }

    const baseAlpha = profile.baseAlpha * this.alpha
    const coreAlpha = profile.coreAlpha * this.alpha

    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.shadowColor = `rgba(${profile.color.r}, ${profile.color.g}, ${profile.color.b}, ${Math.min(0.4, coreAlpha)})`
    ctx.shadowBlur = profile.shadowBlur
    ctx.strokeStyle = `rgba(${profile.color.r}, ${profile.color.g}, ${profile.color.b}, ${baseAlpha})`
    ctx.lineWidth = this.lineWidth + 0.8
    ctx.beginPath()
    ctx.moveTo(this.points[0].x, this.points[0].y)
    for (let index = 1; index < this.points.length; index += 1) {
      ctx.lineTo(this.points[index].x, this.points[index].y)
    }
    ctx.stroke()

    ctx.shadowBlur = 0
    ctx.strokeStyle = `rgba(${profile.color.r}, ${profile.color.g}, ${profile.color.b}, ${coreAlpha})`
    ctx.lineWidth = this.lineWidth
    ctx.beginPath()
    ctx.moveTo(this.points[0].x, this.points[0].y)
    for (let index = 1; index < this.points.length; index += 1) {
      ctx.lineTo(this.points[index].x, this.points[index].y)
    }
    ctx.stroke()

    const head = this.points[this.points.length - 1]
    const tailFrom = Math.max(1, this.points.length - 7)
    for (let index = tailFrom; index < this.points.length; index += 1) {
      const from = this.points[index - 1]
      const to = this.points[index]
      const highlightRatio = (index - tailFrom + 1) / (this.points.length - tailFrom + 1)
      const highlightAlpha = profile.highlightAlpha * highlightRatio * this.alpha * this.glow
      ctx.strokeStyle = `rgba(${profile.color.r}, ${profile.color.g}, ${profile.color.b}, ${highlightAlpha})`
      ctx.lineWidth = this.lineWidth + highlightRatio * 0.6
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    }

    const headAlpha = Math.min(profile.headAlphaCap, this.alpha * this.glow)
    ctx.globalAlpha = headAlpha
    ctx.shadowBlur = profile.headShadowBlur
    ctx.shadowColor = profile.color.hex
    ctx.fillStyle = profile.color.hex
    ctx.beginPath()
    ctx.arc(head.x, head.y, 1.2 + this.lineWidth * 0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

type DiagonalCircuitPulseCanvasProps = {
  className?: string
}

export function DiagonalCircuitPulseCanvas({ className }: DiagonalCircuitPulseCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 0
    let height = 0
    let frameId = 0
    let pulses: CircuitPulse[] = []
    let spawnCooldown = 0
    let emptyFrames = 0
    let visualProfile: CircuitVisualProfile =
      document.documentElement.getAttribute('data-theme') === 'dark' ? DARK_PROFILE : LIGHT_PROFILE

    const maxActiveForSize = (w: number, h: number) => {
      const area = w * h
      return Math.max(2, Math.min(5, Math.round(area / 420000)))
    }

    const spawnOnePulse = () => {
      pulses.push(new CircuitPulse(() => ({ width, height })))
      spawnCooldown = 16 + Math.floor(Math.random() * 32)
    }

    const resetPulses = () => {
      pulses = []
      spawnCooldown = 8
      emptyFrames = 0
    }

    const resizeCanvas = () => {
      const rect = host.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)

      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(width * ratio))
      canvas.height = Math.max(1, Math.floor(height * ratio))

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(ratio, ratio)
      resetPulses()
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      pulses.forEach(pulse => {
        pulse.update()
        pulse.draw(ctx, visualProfile)
      })

      pulses = pulses.filter(pulse => !pulse.isDead())
      emptyFrames = pulses.length === 0 ? emptyFrames + 1 : 0

      if (spawnCooldown > 0) {
        spawnCooldown -= 1
      }

      if (pulses.length === 0) {
        if (emptyFrames >= 18) {
          spawnOnePulse()
          return
        }

        if (spawnCooldown <= 0 && Math.random() < 0.45) {
          spawnOnePulse()
        }
        return
      }

      const maxActive = maxActiveForSize(width, height)
      if (spawnCooldown > 0 || pulses.length >= maxActive) {
        return
      }

      if (Math.random() < 0.07) {
        spawnOnePulse()
      }
    }

    const renderStaticFrame = () => {
      for (let step = 0; step < 18; step += 1) {
        draw()
      }
    }

    const loop = () => {
      draw()
      frameId = window.requestAnimationFrame(loop)
    }

    const stop = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }
    }

    const start = () => {
      stop()
      if (motionQuery.matches) {
        renderStaticFrame()
        return
      }
      frameId = window.requestAnimationFrame(loop)
    }

    const handleMotionChange = () => {
      resizeCanvas()
      start()
    }

    resizeCanvas()
    start()

    motionQuery.addEventListener('change', handleMotionChange)

    const themeObserver = new MutationObserver(() => {
      visualProfile = document.documentElement.getAttribute('data-theme') === 'dark' ? DARK_PROFILE : LIGHT_PROFILE
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
      if (motionQuery.matches) {
        renderStaticFrame()
      }
    })
    resizeObserver.observe(host)

    return () => {
      stop()
      resizeObserver.disconnect()
      themeObserver.disconnect()
      motionQuery.removeEventListener('change', handleMotionChange)
    }
  }, [])

  return (
    <div ref={hostRef} className={className} aria-hidden>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}
