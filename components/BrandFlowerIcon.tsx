import { useId } from 'react'

type BrandFlowerIconProps = {
  className?: string
  color?: string
}

export function BrandFlowerIcon({ className, color }: BrandFlowerIconProps) {
  const gradientId = useId().replace(/:/g, '')
  const fill = color || `url(#${gradientId})`

  return (
    <svg viewBox="30 30 140 140" xmlns="http://www.w3.org/2000/svg" className={className}>
      {color ? null : (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#f97316' }} />
            <stop offset="50%" style={{ stopColor: '#f43f5e' }} />
            <stop offset="100%" style={{ stopColor: '#fbbf24' }} />
          </linearGradient>
        </defs>
      )}
      <g transform="rotate(45 100 100)">
        <path d="M100,92 Q130,60 100,30 Q70,60 100,92 Z" fill={fill} fillOpacity="0.9" />
        <path d="M108,100 Q140,70 170,100 Q140,130 108,100 Z" fill={fill} fillOpacity="0.7" />
        <path d="M100,108 Q70,140 100,170 Q130,140 100,108 Z" fill={fill} fillOpacity="0.5" />
        <path d="M92,100 Q60,130 30,100 Q60,70 92,100 Z" fill={fill} fillOpacity="0.3" />
      </g>
    </svg>
  )
}
