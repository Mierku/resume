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
    name: '深蓝侧栏',
    description: '左侧深蓝信息栏 + 右侧分节内容',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['蓝色', '中文', '双列'],
  },
  {
    id: 'template-2',
    name: '蓝金双语',
    description: '中英双语头部 + 蓝金装饰条',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['双语', '蓝金', '装饰条'],
  },
  {
    id: 'template-3',
    name: '蓝顶信息卡',
    description: '顶部蓝色信息区 + 图标分节内容',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['蓝色', '顶栏', '图标分节'],
  },
  {
    id: 'template-4',
    name: '极简留白',
    description: '黑白主视觉 + 细线分节 + 留白阅读',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['极简', '黑白', '单栏'],
  },
  {
    id: 'template-5',
    name: '经典蓝条',
    description: '顶部横向蓝条 + 简洁单栏内容',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['蓝色', '单栏', '顶栏'],
  },
  {
    id: 'template-6',
    name: '灰阶图标',
    description: '灰阶信息排布 + 圆形图标分节',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['灰阶', '图标', '单栏'],
  },
  {
    id: 'template-7',
    name: '蓝标分节',
    description: '顶部标题标牌 + 蓝色标签分节',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['蓝色', '标签', '单栏'],
  },
  {
    id: 'template-8',
    name: '高保真复刻',
    description: '居中标题 + 右上头像 + 蓝线分节',
    preview: toAssetUrl('/templates/numbered/template.png'),
    tags: ['高保真', '蓝线', '单栏'],
  },
]

export function getReactiveTemplate(templateId: string) {
  return REACTIVE_TEMPLATES.find(template => template.id === templateId)
}
