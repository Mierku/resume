import { clampToRange } from '@/lib/resume/editor-limits'
import { resolveHeaderVariantForTemplate } from '@/lib/resume/header'
import { resolveSectionVariantForTemplate } from '@/lib/resume/section'
import type { ReactiveHeaderVariant, ReactiveSectionVariant, ResumeData } from '@/lib/resume/types'
import type { ComposedPreset } from './composed-block-engine'
import {
  resolveRuntimePreset,
  TEMPLATE1_BASE_PRESET,
  TEMPLATE5_BASE_PRESET,
} from './composed-style-presets'
import { resolveTemplateLayoutSpec, type TemplateLayoutSpec } from './template-layouts'

interface ComposedRuntimeContext {
  layoutSpec: TemplateLayoutSpec
  headerVariant: ReactiveHeaderVariant
  sectionVariant: ReactiveSectionVariant
  preset: ComposedPreset
}

export function resolveTemplate5SidebarPercent(value: number) {
  return clampToRange(value, 20, 38)
}

export function resolveComposedRuntimeContext(data: ResumeData): ComposedRuntimeContext {
  const layoutSpec = resolveTemplateLayoutSpec(data.metadata.template)
  const headerVariant = resolveHeaderVariantForTemplate(data.metadata.template, data.metadata.design.headerVariant)
  const sectionVariant = resolveSectionVariantForTemplate(data.metadata.template, data.metadata.design.sectionVariant)
  const basePreset = layoutSpec.layout === 'left-aside' ? TEMPLATE5_BASE_PRESET : TEMPLATE1_BASE_PRESET
  const preset = resolveRuntimePreset(basePreset, data, headerVariant, sectionVariant)

  return {
    layoutSpec,
    headerVariant,
    sectionVariant,
    preset,
  }
}
