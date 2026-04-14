import type { HTMLAttributes, ReactNode } from 'react'
import type { ComposedBlockStyle } from './composed-block-engine'
import type { ResumeData, SkillItem, StandardSectionType } from '@/lib/resume/types'

export interface PreviewNavigationTarget {
  sectionId: string
  itemId?: string
  fieldKey?: string
}

export interface EstimatedPageBlock {
  blockId: string
  sectionId: string
  rowStart: number
  rowEnd: number
  continuedFromPreviousPage: boolean
  continuesToNextPage: boolean
}

export interface TemplateRenderContext {
  data: ResumeData
  pageIndex: number
  sectionIds: string[]
  pageBlocks?: EstimatedPageBlock[]
  onNavigate?: (target: PreviewNavigationTarget) => void
}

export type HeadingVariant = 'icon-line' | 'pill' | 'text-line' | 'striped' | 'sidebar' | 'gray-tab'
export type ItemVariant = 'compact' | 'default' | 'timeline'

export interface ResumeFacts {
  position: string
  targetCity: string
  salary: string
  availability: string
  age: string
  birthDate: string
  height: string
  weight: string
  gender: string
  experience: string
  nativePlace: string
  currentLocation: string
  maritalStatus: string
  ethnicity: string
  politicalStatus: string
  website: string
}

export interface RenderSectionListOptions {
  headingVariant?: HeadingVariant
  itemVariant?: ItemVariant
  sectionClassName?: string
  sectionHeadingClassName?: string
  onNavigate?: (target: PreviewNavigationTarget) => void
}

export interface TemplateHelpers {
  styles: Record<string, string>
  cx: (...classNames: Array<string | false | null | undefined>) => string
  extractResumeFacts: (data: ResumeData) => ResumeFacts
  resolvePersonalLocation: (facts: ResumeFacts) => string
  resolveLocationFieldKey: (data: ResumeData) => string
  resolveWebsiteFieldKey: (data: ResumeData) => string
  hasMeaningfulText: (value: string) => boolean
  getPreviewActionProps: (
    onNavigate: ((target: PreviewNavigationTarget) => void) | undefined,
    target: PreviewNavigationTarget | null | undefined,
    className?: string,
  ) => HTMLAttributes<HTMLElement>
  renderSectionList: (data: ResumeData, sectionIds: string[], options?: RenderSectionListOptions) => ReactNode
  renderInlineTargetList: (
    items: Array<{ key: string; value: string; target: PreviewNavigationTarget }>,
    onNavigate?: (target: PreviewNavigationTarget) => void,
  ) => ReactNode
  renderRichText: (
    content: string,
    className?: string,
    onNavigate?: (target: PreviewNavigationTarget) => void,
    target?: PreviewNavigationTarget,
  ) => ReactNode
  resolveStandardSectionTitle: (data: ResumeData, sectionId: StandardSectionType) => string
  resolveTemplate8SkillPercent: (level: unknown, proficiency: string) => number
  resolveTemplate8SkillLabel: (proficiency: string, percent: number) => string
  hasRenderableStandardItem: (sectionId: StandardSectionType, item: Record<string, unknown>) => boolean
  stripHtml: (text: string) => string
  Avatar: (props: { data: ResumeData; className?: string; square?: boolean; sizePt?: number }) => ReactNode
}

export interface SkillVariantRenderProps {
  items: SkillItem[]
  sectionId: string
  onNavigate?: (target: PreviewNavigationTarget) => void
  helpers: TemplateHelpers
}

export interface SkillVariantTextMeasureInput {
  text: string
  widthPx: number
  lineHeightPx: number
  fontFamily: string
  fontSizePx: number
  fontWeight: number
}

export interface SkillVariantLineMeasureInput {
  text: string
  fontFamily: string
  fontSizePx: number
  fontWeight: number
}

export interface SkillVariantEstimateProps {
  items: SkillItem[]
  contentWidthPx: number
  style: ComposedBlockStyle
  fontFamily: string
  measureTextHeight: (input: SkillVariantTextMeasureInput) => number
  measureSingleLineWidth: (input: SkillVariantLineMeasureInput) => number
}

export type TemplateModuleRenderer = (context: TemplateRenderContext, helpers: TemplateHelpers) => ReactNode
