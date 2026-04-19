"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ScrollShellReveal = "hover" | "always";
export type ScrollShellTone = "neutral" | "panel" | "aura";
export type ScrollShellAxis = "y" | "both";

interface ScrollShellProps extends HTMLAttributes<HTMLDivElement> {
  reveal?: ScrollShellReveal;
  tone?: ScrollShellTone;
  axis?: ScrollShellAxis;
  scrolling?: boolean;
}

export const ScrollShell = forwardRef<HTMLDivElement, ScrollShellProps>(
  function ScrollShell(
    {
      className,
      reveal = "hover",
      tone = "neutral",
      axis = "y",
      scrolling = false,
      ...props
    },
    ref,
  ) {
    return (
      <div
        ref={ref}
        className={cn("scroll-shell", className)}
        data-scroll-reveal={reveal}
        data-scroll-tone={tone}
        data-scroll-axis={axis}
        data-scrolling={scrolling ? "true" : undefined}
        {...props}
      />
    );
  },
);
