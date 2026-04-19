"use client";

import { useId } from "react";

type ThemeMorphIconProps = {
  isDark: boolean;
  size?: number;
  sunRadius?: number;
  moonRadius?: number;
  className?: string;
};

export function ThemeMorphIcon({
  isDark,
  size = 18,
  sunRadius = 4,
  moonRadius = 9,
  className,
}: ThemeMorphIconProps) {
  const rawId = useId();
  const maskId = `theme-morph-mask-${rawId.replace(/:/g, "")}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <circle
            cx={isDark ? "19" : "30"}
            cy={isDark ? "5" : "0"}
            r="9"
            fill="black"
            className="transition-all duration-500 ease-in-out"
          />
        </mask>
      </defs>

      <g
        className={`origin-center transition-all duration-500 ${
          isDark ? "opacity-0 scale-0 rotate-90" : "opacity-100 scale-100 rotate-0"
        }`}
      >
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </g>

      <circle
        cx="12"
        cy="12"
        r={isDark ? moonRadius : sunRadius}
        mask={`url(#${maskId})`}
        fill="currentColor"
        className="transition-all duration-500 ease-in-out"
      />
    </svg>
  );
}
