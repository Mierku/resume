import type { ReactiveHeaderVariant, ReactiveTemplateId } from './types'

const DEFAULT_HEADER_VARIANT_MAP: Record<ReactiveTemplateId, ReactiveHeaderVariant> = {
  'template-1': 'header-1',
  'template-2': 'header-2',
  'template-3': 'header-3',
  'template-4': 'header-4',
  'template-5': 'header-5',
}

const HEADER_VARIANT_OPTIONS: Array<{ value: ReactiveHeaderVariant | 'auto'; label: string }> = [
  { value: 'auto', label: '跟随模板默认' },
  { value: 'header-1', label: 'Header 1 铜版卡片' },
  { value: 'header-2', label: 'Header 2 雪纹线性' },
  { value: 'header-3', label: 'Header 3 绯红横幅' },
  { value: 'header-4', label: 'Header 4 浅紫居中' },
  { value: 'header-5', label: 'Header 5 律政中轴' },
]

export function resolveHeaderVariantForTemplate(
  templateId: ReactiveTemplateId,
  configuredVariant: ReactiveHeaderVariant | 'auto' | undefined,
): ReactiveHeaderVariant {
  if (configuredVariant && configuredVariant !== 'auto') {
    return configuredVariant
  }
  return DEFAULT_HEADER_VARIANT_MAP[templateId]
}
