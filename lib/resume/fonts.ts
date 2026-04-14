export interface ResumeFontPreset {
  value: string
  label: string
  family: string
  aliases: string[]
}

export const RECOMMENDED_RESUME_FONT_FAMILY = 'Source Han Sans SC'

const DEFAULT_SANS_FALLBACK =
  "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', 'Noto Sans SC', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const DEFAULT_SERIF_FALLBACK =
  "'Songti SC', 'STSong', 'SimSun', '宋体', 'Noto Serif SC', serif"

export const RESUME_FONT_PRESETS: ResumeFontPreset[] = [
  {
    value: 'Source Han Sans SC',
    label: '思源黑体',
    family: `'Source Han Sans SC', 'Noto Sans SC', ${DEFAULT_SANS_FALLBACK}`,
    aliases: ['Source Han Sans SC', '思源黑体', 'Noto Sans SC'],
  },
  {
    value: 'Source Han Serif SC',
    label: '思源宋体',
    family: `'Source Han Serif SC', '思源宋体', 'Noto Serif SC', ${DEFAULT_SERIF_FALLBACK}`,
    aliases: ['Source Han Serif SC', '思源宋体', '思远宋体', 'Noto Serif SC', '宋体', 'SimSun'],
  },
  {
    value: 'Microsoft YaHei',
    label: '微软雅黑',
    family: `'Microsoft YaHei', '微软雅黑', 'Microsoft YaHei UI', ${DEFAULT_SANS_FALLBACK}`,
    aliases: ['Microsoft YaHei', '微软雅黑', 'Microsoft YaHei UI'],
  },
  {
    value: 'STKaiti',
    label: '华文楷体',
    family: "'STKaiti', '华文楷体', 'Kaiti SC', 'KaiTi', '楷体', 'DFKai-SB', serif",
    aliases: ['STKaiti', '华文楷体', 'Kaiti SC', 'KaiTi', '楷体'],
  },
  {
    value: 'PingFang SC',
    label: '平方黑体',
    family: `'PingFang SC', '苹方-简', 'PingFang SC Regular', ${DEFAULT_SANS_FALLBACK}`,
    aliases: ['PingFang SC', '苹方', '苹方黑体', '平方黑体'],
  },
  {
    value: 'STSong',
    label: '华文宋体',
    family: `'STSong', '华文宋体', 'Songti SC', ${DEFAULT_SERIF_FALLBACK}`,
    aliases: ['STSong', '华文宋体', 'Songti SC', '宋体'],
  },
  {
    value: 'FangSong',
    label: '仿宋体',
    family: "'FangSong', '仿宋', 'STFangsong', serif",
    aliases: ['FangSong', '仿宋', '仿宋体', 'STFangsong'],
  },
  {
    value: 'STXinwei',
    label: '华文新魏',
    family: "'STXinwei', '华文新魏', 'KaiTi', serif",
    aliases: ['STXinwei', '华文新魏'],
  },
]

function normalizeFontAlias(value: string) {
  return value.replace(/^['"]+|['"]+$/g, '').trim().toLowerCase()
}

function quoteFontFamily(value: string) {
  const normalized = value.replace(/^['"]+|['"]+$/g, '').trim()
  const escaped = normalized.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}

const RESUME_FONT_PRESET_BY_ALIAS = new Map<string, ResumeFontPreset>()

RESUME_FONT_PRESETS.forEach(preset => {
  ;[preset.value, preset.label, ...preset.aliases].forEach(alias => {
    RESUME_FONT_PRESET_BY_ALIAS.set(normalizeFontAlias(alias), preset)
  })
})

function findResumeFontPreset(value?: string | null) {
  const normalized = String(value || '').trim()
  if (!normalized) return undefined

  const candidates = [normalized, ...normalized.split(',')]
  for (const candidate of candidates) {
    const preset = RESUME_FONT_PRESET_BY_ALIAS.get(normalizeFontAlias(candidate))
    if (preset) return preset
  }

  return undefined
}

export function resolveResumeFontPreset(value?: string | null) {
  return findResumeFontPreset(value) || RESUME_FONT_PRESETS[0]
}

export function normalizeResumeFontFamily(value?: string | null) {
  return resolveResumeFontPreset(value).value
}

export function resolveResumeFontFamilyStack(value?: string | null) {
  const preset = findResumeFontPreset(value)
  if (preset) {
    return preset.family
  }

  const normalized = String(value || '').trim()
  if (!normalized) {
    return RESUME_FONT_PRESETS[0].family
  }

  if (normalized.includes(',')) {
    return normalized
  }

  return `${quoteFontFamily(normalized)}, ${DEFAULT_SANS_FALLBACK}`
}
