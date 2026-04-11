import type { PreviewNavigationTarget, TemplateHelpers } from '../types'
import type { ComposedHeroBlock } from '../composed-block-engine'
import type { ResumeData } from '@/lib/resume/types'

export interface HeaderRenderProps {
  block: ComposedHeroBlock
  data: ResumeData
  marginBottom: number
  onNavigate?: (target: PreviewNavigationTarget) => void
  helpers: TemplateHelpers
}
