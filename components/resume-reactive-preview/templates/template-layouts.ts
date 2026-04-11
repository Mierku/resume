import type { ReactiveTemplateId } from '@/lib/resume/types'

export type TemplateLayoutKind = 'single-flow' | 'left-aside'

export interface TemplateLayoutSpec {
  id: ReactiveTemplateId
  layout: TemplateLayoutKind
  sidebarPercent?: number
}

const TEMPLATE_LAYOUT_SPECS: Record<ReactiveTemplateId, TemplateLayoutSpec> = {
  'template-1': {
    id: 'template-1',
    layout: 'single-flow',
  },
  'template-2': {
    id: 'template-2',
    layout: 'single-flow',
  },
  'template-3': {
    id: 'template-3',
    layout: 'single-flow',
  },
  'template-4': {
    id: 'template-4',
    layout: 'single-flow',
  },
  'template-5': {
    id: 'template-5',
    layout: 'left-aside',
    sidebarPercent: 26,
  },
}

export function resolveTemplateLayoutSpec(templateId: ReactiveTemplateId): TemplateLayoutSpec {
  return TEMPLATE_LAYOUT_SPECS[templateId] || TEMPLATE_LAYOUT_SPECS['template-1']
}
