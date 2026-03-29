import type { ReactiveTemplateId } from '@/lib/resume/types'
import type { TemplateModuleRenderer } from './types'

type TemplateModule = { default: TemplateModuleRenderer }

const templateLoaders: Record<ReactiveTemplateId, () => Promise<TemplateModule>> = {
  'template-1': () => import('./template-1'),
  'template-2': () => import('./template-2'),
  'template-3': () => import('./template-3'),
  'template-4': () => import('./template-4'),
  'template-5': () => import('./template-5'),
  'template-6': () => import('./template-6'),
  'template-7': () => import('./template-7'),
  'template-8': () => import('./template-8'),
}

const rendererCache = new Map<ReactiveTemplateId, TemplateModuleRenderer>()

export async function loadTemplateRenderer(templateId: ReactiveTemplateId): Promise<TemplateModuleRenderer> {
  const cached = rendererCache.get(templateId)
  if (cached) return cached

  const loader = templateLoaders[templateId] || templateLoaders['template-1']
  const module = await loader()
  const renderer = module.default
  rendererCache.set(templateId, renderer)
  return renderer
}
