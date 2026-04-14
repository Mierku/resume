'use client'

import type { SVGProps } from 'react'
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react'

type IconProps = SVGProps<SVGSVGElement>

export function IconArrowLeft(props: IconProps) {
  return <ArrowLeft {...props} />
}

export function IconPlus(props: IconProps) {
  return <Plus {...props} />
}

export function IconDelete(props: IconProps) {
  return <Trash2 {...props} />
}

function IconUpload(props: IconProps) {
  return <Upload {...props} />
}
