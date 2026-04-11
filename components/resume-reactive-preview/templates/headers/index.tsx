import type { ReactiveHeaderVariant } from '@/lib/resume/types'
import type { HeaderRenderProps } from './types'
import { renderHeader1 } from './header-1'
import { renderHeader2 } from './header-2'
import { renderHeader3 } from './header-3'
import { renderHeader4 } from './header-4'
import { renderHeader5 } from './header-5'

export function renderTemplateHeaderBlock({ variant, ...props }: HeaderRenderProps & { variant: ReactiveHeaderVariant }) {
  if (variant === 'header-1') return renderHeader1(props)
  if (variant === 'header-2') return renderHeader2(props)
  if (variant === 'header-3') return renderHeader3(props)
  if (variant === 'header-4') return renderHeader4(props)
  return renderHeader5(props)
}
