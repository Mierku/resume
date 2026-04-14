import { RESUME_TEMPLATES } from '@/lib/constants'

interface Template {
  id: string
  name: string
  description: string
}

export function getAllTemplates(): Template[] {
  return RESUME_TEMPLATES
}

function getTemplateById(id: string): Template | undefined {
  return RESUME_TEMPLATES.find(t => t.id === id)
}
