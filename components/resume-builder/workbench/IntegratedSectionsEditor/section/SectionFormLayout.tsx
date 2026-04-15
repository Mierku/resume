'use client'

import type { ReactNode } from 'react'

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

interface SectionFormGridProps {
  className?: string
  children: ReactNode
}

interface SectionFormFieldProps {
  className?: string
  wide?: boolean
  children: ReactNode
}

export function SectionFormGrid({ className, children }: SectionFormGridProps) {
  return <div className={joinClassNames('resume-section-form-grid', className)}>{children}</div>
}

export function SectionFormField({ className, wide = false, children }: SectionFormFieldProps) {
  return <div className={joinClassNames('resume-section-form-field', wide && 'is-wide', className)}>{children}</div>
}
