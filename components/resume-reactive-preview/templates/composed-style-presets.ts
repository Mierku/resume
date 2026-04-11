import { SYSTEM_PAGE_GAP_X_PT, SYSTEM_PAGE_GAP_Y_PT } from '@/lib/resume/page-layout'
import type { ReactiveHeaderVariant, ReactiveSectionVariant, ResumeData } from '@/lib/resume/types'
import {
  DEFAULT_COMPOSED_PRESET as COMPOSED_ENGINE_BASE_PRESET,
  type ComposedBlockStyle,
  type ComposedHeroStyle,
  type ComposedPreset,
} from './composed-block-engine'

export const TEMPLATE1_BASE_PRESET: ComposedPreset = {
  hero: {
    ...COMPOSED_ENGINE_BASE_PRESET.hero,
    borderColor: 'color-mix(in srgb, var(--resume-theme-primary) 52%, #ffffff)',
    backgroundColor: 'linear-gradient(135deg, color-mix(in srgb, var(--resume-theme-primary) 12%, white) 0%, #fffdf8 100%)',
    titleColor: 'color-mix(in srgb, var(--resume-theme-primary) 86%, #1f2937)',
    bodyColor: 'color-mix(in srgb, var(--resume-theme-text) 92%, black)',
  },
  section: {
    ...COMPOSED_ENGINE_BASE_PRESET.section,
    borderColor: 'color-mix(in srgb, var(--resume-theme-primary) 32%, #d1d5db)',
    backgroundColor: 'color-mix(in srgb, var(--resume-theme-primary) 4%, #fffefd)',
    titleColor: 'color-mix(in srgb, var(--resume-theme-primary) 88%, #1f2937)',
    bodyColor: 'color-mix(in srgb, var(--resume-theme-text) 92%, black)',
  },
}

const TEMPLATE2_BASE_PRESET: ComposedPreset = {
  hero: {
    marginBottom: 18,
    paddingX: 6,
    paddingY: 8,
    paddingTop: 0,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 0,
    inlineGap: 8,
    sectionHeaderGap: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    titleColor: 'color-mix(in srgb, var(--resume-theme-primary) 76%, #111827)',
    bodyColor: 'color-mix(in srgb, var(--resume-theme-text) 92%, black)',
    titleFontSize: 15,
    titleLineHeight: 1.4,
    bodyFontSize: 12,
    bodyLineHeight: 1.56,
    paragraphGap: 8,
    nameFontSize: 42,
    nameLineHeight: 1.08,
    headlineFontSize: 18,
    headlineLineHeight: 1.28,
    metaFontSize: 12,
    metaLineHeight: 1.4,
    metaGap: 9,
  },
  section: {
    marginBottom: 14,
    paddingX: 0,
    paddingY: 0,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 0,
    inlineGap: 8,
    sectionHeaderGap: 10,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    titleColor: 'color-mix(in srgb, var(--resume-theme-primary) 82%, #111827)',
    bodyColor: 'color-mix(in srgb, var(--resume-theme-text) 92%, black)',
    titleFontSize: 18,
    titleLineHeight: 1.24,
    bodyFontSize: 12,
    bodyLineHeight: 1.62,
    paragraphGap: 6,
  },
}

const TEMPLATE3_BASE_PRESET: ComposedPreset = {
  hero: {
    marginBottom: 20,
    paddingX: 0,
    paddingY: 26,
    paddingTop: 0,
    paddingBottom: 26,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 0,
    inlineGap: 8,
    sectionHeaderGap: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    titleColor: '#ffffff',
    bodyColor: '#ffffff',
    titleFontSize: 15,
    titleLineHeight: 1.35,
    bodyFontSize: 12,
    bodyLineHeight: 1.52,
    paragraphGap: 8,
    nameFontSize: 44,
    nameLineHeight: 1.08,
    headlineFontSize: 17,
    headlineLineHeight: 1.28,
    metaFontSize: 12,
    metaLineHeight: 1.38,
    metaGap: 10,
  },
  section: {
    marginBottom: 14,
    paddingX: 0,
    paddingY: 0,
    sectionHeaderPaddingX: 9,
    sectionHeaderPaddingY: 6,
    inlineGap: 8,
    sectionHeaderGap: 4,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    titleColor: '#ffffff',
    bodyColor: 'color-mix(in srgb, var(--resume-theme-text) 92%, black)',
    titleFontSize: 17,
    titleLineHeight: 1.28,
    bodyFontSize: 12,
    bodyLineHeight: 1.62,
    paragraphGap: 6,
  },
}

const TEMPLATE4_BASE_PRESET: ComposedPreset = {
  hero: {
    marginBottom: 22,
    paddingX: 0,
    paddingY: 16,
    paddingTop: 0,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 0,
    inlineGap: 10,
    sectionHeaderGap: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    titleColor: 'color-mix(in srgb, var(--resume-theme-primary) 82%, #111827)',
    bodyColor: 'color-mix(in srgb, var(--resume-theme-text) 92%, black)',
    titleFontSize: 15,
    titleLineHeight: 1.4,
    bodyFontSize: 12,
    bodyLineHeight: 1.56,
    paragraphGap: 8,
    nameFontSize: 54,
    nameLineHeight: 1.08,
    headlineFontSize: 17,
    headlineLineHeight: 1.32,
    metaFontSize: 12,
    metaLineHeight: 1.36,
    metaGap: 10,
  },
  section: {
    marginBottom: 14,
    paddingX: 0,
    paddingY: 0,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 5,
    inlineGap: 12,
    sectionHeaderGap: 10,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    titleColor: 'color-mix(in srgb, var(--resume-theme-primary) 92%, #111827)',
    bodyColor: 'color-mix(in srgb, var(--resume-theme-text) 92%, black)',
    titleFontSize: 16,
    titleLineHeight: 1.22,
    bodyFontSize: 12,
    bodyLineHeight: 1.62,
    paragraphGap: 6,
  },
}

export const TEMPLATE5_BASE_PRESET: ComposedPreset = {
  hero: {
    marginBottom: 18,
    paddingX: 0,
    paddingY: 8,
    paddingTop: 16,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 0,
    inlineGap: 10,
    sectionHeaderGap: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    titleColor: '#ffffff',
    bodyColor: '#ffffff',
    titleFontSize: 15,
    titleLineHeight: 1.4,
    bodyFontSize: 12,
    bodyLineHeight: 1.56,
    paragraphGap: 8,
    nameFontSize: 44,
    nameLineHeight: 1.08,
    headlineFontSize: 17,
    headlineLineHeight: 1.3,
    metaFontSize: 12,
    metaLineHeight: 1.36,
    metaGap: 10,
  },
  section: {
    marginBottom: 12,
    paddingX: 0,
    paddingY: 0,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 0,
    inlineGap: 8,
    sectionHeaderGap: 4,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    titleColor: 'color-mix(in srgb, var(--resume-theme-primary) 84%, #111827)',
    bodyColor: 'color-mix(in srgb, var(--resume-theme-text) 92%, black)',
    titleFontSize: 15,
    titleLineHeight: 1.32,
    bodyFontSize: 12,
    bodyLineHeight: 1.6,
    paragraphGap: 6,
  },
}

const HEADER_HERO_STYLE_MAP: Record<ReactiveHeaderVariant, ComposedHeroStyle> = {
  'header-1': TEMPLATE1_BASE_PRESET.hero,
  'header-2': TEMPLATE2_BASE_PRESET.hero,
  'header-3': TEMPLATE3_BASE_PRESET.hero,
  'header-4': TEMPLATE4_BASE_PRESET.hero,
  'header-5': {
    marginBottom: 22,
    paddingX: 22,
    paddingY: 14,
    paddingTop: 132,
    paddingBottom: 18,
    sectionHeaderPaddingX: 0,
    sectionHeaderPaddingY: 0,
    inlineGap: 10,
    sectionHeaderGap: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    backgroundColor: 'transparent',
    boxShadow: 'none',
    titleColor: '#0f172a',
    bodyColor: '#8b95a5',
    titleFontSize: 62,
    titleLineHeight: 1.04,
    bodyFontSize: 12,
    bodyLineHeight: 1.52,
    paragraphGap: 14,
    nameFontSize: 62,
    nameLineHeight: 1.04,
    headlineFontSize: 17,
    headlineLineHeight: 1.32,
    metaFontSize: 12,
    metaLineHeight: 1.42,
    metaGap: 24,
  },
}

const SECTION_STYLE_MAP: Record<ReactiveSectionVariant, ComposedPreset['section']> = {
  'section-1': TEMPLATE1_BASE_PRESET.section,
  'section-2': TEMPLATE2_BASE_PRESET.section,
  'section-3': TEMPLATE3_BASE_PRESET.section,
  'section-4': TEMPLATE4_BASE_PRESET.section,
}

function composePresetWithHeaderAndSection(
  basePreset: ComposedPreset,
  headerVariant: ReactiveHeaderVariant,
  sectionVariant: ReactiveSectionVariant,
): ComposedPreset {
  return {
    ...basePreset,
    hero: {
      ...HEADER_HERO_STYLE_MAP[headerVariant],
    },
    section: {
      ...SECTION_STYLE_MAP[sectionVariant],
    },
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

function applyPageSpacingToPreset(basePreset: ComposedPreset, data: ResumeData): ComposedPreset {
  const gapX = clamp(data.metadata.page.gapX, 1, 18, SYSTEM_PAGE_GAP_X_PT)
  const gapY = clamp(data.metadata.page.gapY, 1, 22, SYSTEM_PAGE_GAP_Y_PT)
  const scaleX = gapX / SYSTEM_PAGE_GAP_X_PT
  const scaleY = gapY / SYSTEM_PAGE_GAP_Y_PT

  const scaleBlock = (block: ComposedBlockStyle): ComposedBlockStyle => ({
    ...block,
    marginBottom: round2(block.marginBottom * scaleY),
    paddingX: round2(block.paddingX * scaleX),
    paddingY: round2(block.paddingY * scaleY),
    paddingTop: round2((block.paddingTop ?? block.paddingY) * scaleY),
    paddingBottom: round2((block.paddingBottom ?? block.paddingY) * scaleY),
    sectionHeaderPaddingX: round2(block.sectionHeaderPaddingX * scaleX),
    sectionHeaderPaddingY: round2(block.sectionHeaderPaddingY * scaleY),
    inlineGap: round2(block.inlineGap * scaleX),
    sectionHeaderGap: round2(block.sectionHeaderGap * scaleY),
    paragraphGap: round2(block.paragraphGap * scaleY),
  })

  return {
    hero: {
      ...(scaleBlock(basePreset.hero) as ComposedHeroStyle),
      metaGap: round2(basePreset.hero.metaGap * Math.max(0.78, scaleX)),
    },
    section: scaleBlock(basePreset.section),
  }
}

function applyTypographyToPreset(basePreset: ComposedPreset, data: ResumeData): ComposedPreset {
  const bodyFontSize = clamp(data.metadata.typography.body.fontSize, 10, 18, basePreset.section.bodyFontSize)
  const bodyLineHeight = clamp(data.metadata.typography.body.lineHeight, 0.5, 4, basePreset.section.bodyLineHeight)
  const headingFontSize = clamp(data.metadata.typography.heading.fontSize, 10, 20, basePreset.section.titleFontSize)
  const headingLineHeight = clamp(data.metadata.typography.heading.lineHeight, 0.5, 4, basePreset.section.titleLineHeight)

  const bodyScale = bodyFontSize / 10
  const headingScale = headingFontSize / 14

  return {
    hero: {
      ...basePreset.hero,
      titleFontSize: headingFontSize,
      titleLineHeight: headingLineHeight,
      bodyFontSize,
      bodyLineHeight,
      nameFontSize: round2(basePreset.hero.nameFontSize * headingScale),
      nameLineHeight: headingLineHeight,
      headlineFontSize: round2(basePreset.hero.headlineFontSize * bodyScale),
      headlineLineHeight: bodyLineHeight,
      metaFontSize: bodyFontSize,
      metaLineHeight: bodyLineHeight,
    },
    section: {
      ...basePreset.section,
      titleFontSize: headingFontSize,
      titleLineHeight: headingLineHeight,
      bodyFontSize,
      bodyLineHeight,
    },
  }
}

export function resolveRuntimePreset(
  basePreset: ComposedPreset,
  data: ResumeData,
  headerVariant: ReactiveHeaderVariant,
  sectionVariant: ReactiveSectionVariant,
): ComposedPreset {
  const presetWithHeader = composePresetWithHeaderAndSection(basePreset, headerVariant, sectionVariant)
  return applyTypographyToPreset(applyPageSpacingToPreset(presetWithHeader, data), data)
}
