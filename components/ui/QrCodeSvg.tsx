'use client'

import { useMemo } from 'react'
import * as qrcodegen from '@/lib/vendor/qrcodegen'

export function QrCodeSvg({
  value,
  size = 280,
  className,
}: {
  value: string
  size?: number
  className?: string
}) {
  const pathData = useMemo(() => {
    if (!value.trim()) {
      return ''
    }

    const qr = qrcodegen.QrCode.encodeText(value, qrcodegen.QrCode.Ecc.MEDIUM)
    const commands: string[] = []

    for (let y = 0; y < qr.size; y += 1) {
      for (let x = 0; x < qr.size; x += 1) {
        if (!qr.getModule(x, y)) {
          continue
        }
        commands.push(`M${x},${y}h1v1h-1z`)
      }
    }

    return {
      path: commands.join(''),
      cells: qr.size,
    }
  }, [value])

  if (!pathData) {
    return null
  }

  return (
    <svg
      className={className}
      viewBox={`0 0 ${pathData.cells} ${pathData.cells}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-label="二维码"
      role="img"
    >
      <rect width="100%" height="100%" fill="#ffffff" />
      <path d={pathData.path} fill="#111111" />
    </svg>
  )
}
