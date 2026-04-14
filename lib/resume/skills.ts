import type { ReactiveSkillsVariant, SkillItem } from './types'

export type ResolvedSkillsVariant = Exclude<ReactiveSkillsVariant, 'auto'>
export type SkillProficiencyTier = '了解' | '熟悉' | '精通'

const DEFAULT_SKILLS_VARIANT: ResolvedSkillsVariant = 'skills-2'
export const DEFAULT_SKILL_PROFICIENCY = '了解'
export const SKILL_PROFICIENCY_LEVELS: SkillProficiencyTier[] = ['了解', '熟悉', '精通']

const SKILL_PROFICIENCY_PERCENT: Record<SkillProficiencyTier, number> = {
  了解: 38,
  熟悉: 68,
  精通: 92,
}

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

export function resolveSkillProficiencyTier(proficiency: string, level?: unknown): SkillProficiencyTier | '' {
  const normalized = normalizeSkillToken(String(proficiency || ''))
  if (normalized) {
    if (/(精通|专家|母语|native|expert|advanced)/.test(normalized)) return '精通'
    if (/(熟练|良好|流利|熟悉|proficient|intermediate)/.test(normalized)) return '熟悉'
    if (/(一般|基础|了解|入门|basic|elementary)/.test(normalized)) return '了解'
  }

  const normalizedLevel = Number(level || 0)
  if (Number.isFinite(normalizedLevel) && normalizedLevel > 0) {
    if (normalizedLevel >= 4.5) return '精通'
    if (normalizedLevel >= 2.5) return '熟悉'
    return '了解'
  }

  return ''
}

export function resolveSkillPercent(level: unknown, proficiency: string) {
  const tier = resolveSkillProficiencyTier(proficiency, level)
  if (tier) {
    return SKILL_PROFICIENCY_PERCENT[tier]
  }
  return 0
}

export function resolveSkillProficiencyLabel(proficiency: string, percent: number) {
  const tier = resolveSkillProficiencyTier(proficiency)
  if (tier) return tier
  if (percent >= 85) return '精通'
  if (percent >= 55) return '熟悉'
  if (percent > 0) return '了解'
  return ''
}
