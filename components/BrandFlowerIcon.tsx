type BrandFlowerIconProps = {
  className?: string
  color?: string
}

export function BrandFlowerIcon({ className, color = 'currentColor' }: BrandFlowerIconProps) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <g transform="rotate(45 100 100)">
        <path
          d="M100,105 Q145,60 100,20 Q55,60 100,105 Z"
          fill="none"
          stroke={color}
          strokeWidth="4"
          transform="rotate(0 100 100)"
          opacity="0.9"
        />
        <path
          d="M100,105 Q145,60 100,20 Q55,60 100,105 Z"
          fill="none"
          stroke={color}
          strokeWidth="4"
          transform="rotate(90 100 100)"
          opacity="0.7"
        />
        <path
          d="M100,105 Q145,60 100,20 Q55,60 100,105 Z"
          fill="none"
          stroke={color}
          strokeWidth="4"
          transform="rotate(180 100 100)"
          opacity="0.5"
        />
        <path
          d="M100,105 Q145,60 100,20 Q55,60 100,105 Z"
          fill="none"
          stroke={color}
          strokeWidth="4"
          transform="rotate(270 100 100)"
          opacity="0.3"
        />
        <circle cx="100" cy="100" r="4" fill={color} />
      </g>
    </svg>
  )
}
