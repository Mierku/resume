import type { ReactiveSectionVariant, ReactiveTemplateId } from './types'

const DEFAULT_SECTION_VARIANT_MAP: Record<ReactiveTemplateId, ReactiveSectionVariant> = {
  'template-1': 'section-1',
  'template-2': 'section-2',
  'template-3': 'section-3',
  'template-4': 'section-4',
  'template-5': 'section-1',
}

export const SECTION_VARIANT_OPTIONS: Array<{ value: ReactiveSectionVariant | 'auto'; label: string }> = [
  { value: 'auto', label: '跟随模板默认' },
  { value: 'section-1', label: 'Section 1 铜版网格' },
  { value: 'section-2', label: 'Section 2 雪纹简章' },
  { value: 'section-3', label: 'Section 3 绯红签条' },
  { value: 'section-4', label: 'Section 4 浅紫书页' },
]

export function resolveSectionVariantForTemplate(
  templateId: ReactiveTemplateId,
  configuredVariant: ReactiveSectionVariant | 'auto' | undefined,
): ReactiveSectionVariant {
  if (configuredVariant && configuredVariant !== 'auto') {
    return configuredVariant
  }
  return DEFAULT_SECTION_VARIANT_MAP[templateId]
}
