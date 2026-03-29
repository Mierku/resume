import { RESUME_TEMPLATES } from '@/lib/constants'

export interface Template {
  id: string
  name: string
  description: string
}

export function getAllTemplates(): Template[] {
  return RESUME_TEMPLATES
}

export function getTemplateById(id: string): Template | undefined {
  return RESUME_TEMPLATES.find(t => t.id === id)
}

// Template styles for rendering
export const templateStyles: Record<string, {
  headerStyle: string
  sectionStyle: string
  contentStyle: string
  accentColor: string
}> = {
  'template-1': {
    headerStyle: 'text-center border-b border-border pb-4 mb-6',
    sectionStyle: 'mb-6',
    contentStyle: 'text-sm leading-relaxed',
    accentColor: '#1d4f91',
  },
  'template-2': {
    headerStyle: 'flex items-center gap-6 mb-8',
    sectionStyle: 'mb-8 pl-4 border-l-2 border-primary',
    contentStyle: 'text-sm leading-loose',
    accentColor: '#334155',
  },
  'template-3': {
    headerStyle: 'bg-muted p-6 -mx-6 -mt-6 mb-6',
    sectionStyle: 'mb-6',
    contentStyle: 'text-sm leading-relaxed',
    accentColor: '#1f3e75',
  },
  'template-4': {
    headerStyle: 'relative pb-6 mb-6',
    sectionStyle: 'mb-8',
    contentStyle: 'text-sm',
    accentColor: '#3e5a7e',
  },
  'template-5': {
    headerStyle: 'text-center border-b border-border pb-4 mb-6',
    sectionStyle: 'mb-6',
    contentStyle: 'text-sm leading-relaxed',
    accentColor: '#2d4d85',
  },
  'template-6': {
    headerStyle: 'flex items-center gap-6 mb-8',
    sectionStyle: 'mb-8 pl-4 border-l-2 border-primary',
    contentStyle: 'text-sm leading-loose',
    accentColor: '#636b77',
  },
  'template-7': {
    headerStyle: 'relative pb-6 mb-6',
    sectionStyle: 'mb-8',
    contentStyle: 'text-sm',
    accentColor: '#f07b2b',
  },
  'template-8': {
    headerStyle: 'text-center pb-6 mb-6',
    sectionStyle: 'mb-6',
    contentStyle: 'text-sm leading-relaxed',
    accentColor: '#5c7f99',
  },
}

export function getTemplateStyle(templateId: string) {
  return templateStyles[templateId] || templateStyles['template-1']
}
