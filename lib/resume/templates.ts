import type { ReactiveTemplateId } from './types'
import { toAssetUrl } from '@/lib/assets'

export interface ReactiveTemplateMetadata {
  id: ReactiveTemplateId
  name: string
  description: string
  preview: string
  tags: string[]
}

export const REACTIVE_TEMPLATES: ReactiveTemplateMetadata[] = [
  {
    id: 'template-1',
    name: '铜版网格',
    description: '卡片化区块 + 可测量文本流 + 调试友好',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['block', '测高', '单栏'],
  },
  {
    id: 'template-2',
    name: '雪纹简章',
    description: '线性分节 + 雅致头图 + 可测量文本流',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['线性分节', '测高', '单栏'],
  },
  {
    id: 'template-3',
    name: '绯红签条',
    description: '红色顶栏 + 签条分节 + 可测量文本流',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['红色', '签条', '测高'],
  },
  {
    id: 'template-4',
    name: '浅紫书页',
    description: '浅灰底纹 + 紫色线条分节 + 可测量文本流',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['紫色', '简历条纹', '测高'],
  },
  {
    id: 'template-5',
    name: '双栏分区',
    description: '头部模块化 + 左右双栏信息编排',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['双栏', '侧栏', '结构化'],
  },
]

export function getReactiveTemplate(templateId: string) {
  return REACTIVE_TEMPLATES.find(template => template.id === templateId)
}
