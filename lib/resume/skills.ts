import type { ReactiveSkillsVariant, SkillItem } from './types'

export type ResolvedSkillsVariant = Exclude<ReactiveSkillsVariant, 'auto'>

const DEFAULT_SKILLS_VARIANT: ResolvedSkillsVariant = 'skills-2'

export const SKILLS_VARIANT_OPTIONS: Array<{ value: ReactiveSkillsVariant; label: string }> = [
  { value: 'auto', label: '跟随默认（进度条）' },
  { value: 'skills-1', label: '技能样式 1 标签形式' },
  { value: 'skills-2', label: '技能样式 2 进度条' },
  { value: 'skills-3', label: '技能样式 3 逗号分隔' },
  { value: 'skills-4', label: '技能样式 4 熟练度对照' },
]

export function resolveSkillsVariant(configuredVariant: ReactiveSkillsVariant | undefined): ResolvedSkillsVariant {
  if (configuredVariant && configuredVariant !== 'auto') {
    return configuredVariant
  }
  return DEFAULT_SKILLS_VARIANT
}

export function hasMeaningfulSkillText(value: unknown) {
  return String(value || '').trim().length > 0
}

export function normalizeSkillToken(value: string) {
  return value.replace(/\s+/g, '').toLowerCase()
}

export function isRenderableSkillItem(item: Partial<SkillItem> & { hidden?: boolean }) {
  if (item.hidden) return false
  if (hasMeaningfulSkillText(item.name)) return true
  if (Array.isArray(item.keywords) && item.keywords.some(keyword => hasMeaningfulSkillText(keyword))) return true
  if (hasMeaningfulSkillText(item.proficiency)) return true
  return Number(item.level || 0) > 0
}

export function collectSkillTokens(
  item: Pick<SkillItem, 'name' | 'keywords'>,
  options: { includeName?: boolean } = {},
) {
  const includeName = options.includeName !== false
  const tokens: string[] = []

  if (includeName && hasMeaningfulSkillText(item.name)) {
    tokens.push(String(item.name).trim())
  }

  ;(item.keywords || []).forEach(keyword => {
    const normalized = String(keyword || '').trim()
    if (!normalized) return
    if (tokens.some(token => normalizeSkillToken(token) === normalizeSkillToken(normalized))) return
    tokens.push(normalized)
  })

  return tokens
}

export function collectUniqueSkillTokens(items: Array<Pick<SkillItem, 'name' | 'keywords'> & { hidden?: boolean }>) {
  const tokens: string[] = []

  items.forEach(item => {
    if (item.hidden) return
    collectSkillTokens(item).forEach(token => {
      if (tokens.some(existing => normalizeSkillToken(existing) === normalizeSkillToken(token))) return
      tokens.push(token)
    })
  })

  return tokens
}

export function resolveSkillTitle(item: Pick<SkillItem, 'name' | 'keywords'>) {
  if (hasMeaningfulSkillText(item.name)) return String(item.name).trim()
  const keywords = (item.keywords || []).map(keyword => String(keyword || '').trim()).filter(Boolean)
  return keywords.join(' / ')
}

export function resolveSkillPercent(level: unknown, proficiency: string) {
  const normalizedLevel = Number(level || 0)
  if (Number.isFinite(normalizedLevel) && normalizedLevel > 0) {
    return Math.max(0, Math.min(100, Math.round((normalizedLevel / 5) * 100)))
  }

  const normalized = normalizeSkillToken(String(proficiency || ''))
  if (!normalized) return 0

  if (/(精通|专家|母语|native|expert|advanced)/.test(normalized)) return 92
  if (/(熟练|良好|流利|熟悉|proficient|intermediate)/.test(normalized)) return 78
  if (/(一般|基础|了解|入门|basic|elementary)/.test(normalized)) return 62
  return 0
}

export function resolveSkillProficiencyLabel(proficiency: string, percent: number) {
  if (hasMeaningfulSkillText(proficiency)) return String(proficiency).trim()
  if (percent >= 90) return '精通'
  if (percent >= 75) return '熟练'
  if (percent >= 60) return '熟悉'
  if (percent > 0) return '了解'
  return ''
}
