'use client'

import { Check, FileText, Maximize2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SearchField } from '@/components/ui/SearchField'
import { getTemplateDefaultPrimaryColor, RESUME_TEMPLATES } from '@/lib/constants'
import {
  RESUME_EDITOR_LIMITS,
} from '@/lib/resume/editor-limits'
import {
  normalizeResumeFontFamily,
  resolveResumeFontFamilyStack,
  resolveResumeFontPreset,
  RESUME_FONT_PRESETS,
} from '@/lib/resume/fonts'
import type { ReactiveTemplateId } from '@/lib/resume/types'
import { resolveHeaderVariantForTemplate } from '@/lib/resume/header'
import { resolveSkillsVariant } from '@/lib/resume/skills'
import { resolveSectionVariantForTemplate } from '@/lib/resume/section'
import { ResumeColorPickerControl } from '../../../../controls/ResumeColorPickerControl/ResumeColorPickerControl'
import { Slider } from '../../../../primitives'
import { useResumeBuilderStore } from '../../../../store/useResumeBuilderStore'
import { ToolSliderField } from '../../../../controls/ToolSliderField/ToolSliderField'
import type { SmartOnePageComputation } from '@/components/resume-reactive-preview/templates/smart-one-page'
import type { StyleTool } from '../../../types'
import sharedStyles from '../shared/PanelControlPrimitives.module.scss'
import styles from './LayoutAndStylePanel.module.scss'

type StyleBrowserCategory = 'template' | 'header' | 'section' | 'skills'
type StylePreviewKind =
  | 'layout-grid'
  | 'layout-split'
  | 'layout-column'
  | 'layout-aside'
  | 'header-centered'
  | 'header-avatar'
  | 'title-band'
  | 'timeline-vertical'
  | 'skills-pill'
  | 'skills-bars'
  | 'skills-inline'
  | 'skills-rating'

interface StyleBrowserCard {
  id: string
  label: string
  preview: StylePreviewKind
  previewImage: string
  category: StyleBrowserCategory
  groupId: string
  groupTitle: string
  keywords: string[]
  selected: boolean
  wide?: boolean
  onSelect: () => void
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

function StyleBrowserPreview({ kind, image }: { kind: StylePreviewKind; image: string }) {
  if (kind === 'layout-grid') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet">
          <span className="resume-style-browser-preview-line is-lg" />
          <span className="resume-style-browser-preview-line" />
          <span className="resume-style-browser-preview-line is-sm" />
        </div>
      </div>
    )
  }

  if (kind === 'layout-split') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet">
          <span className="resume-style-browser-preview-column is-narrow" />
          <div className="resume-style-browser-preview-stack">
            <span className="resume-style-browser-preview-line is-md" />
            <span className="resume-style-browser-preview-line is-sm" />
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'layout-column') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet">
          <div className="resume-style-browser-preview-stack">
            <span className="resume-style-browser-preview-line is-md" />
            <span className="resume-style-browser-preview-line" />
            <span className="resume-style-browser-preview-line is-sm" />
          </div>
          <div className="resume-style-browser-preview-stack">
            <span className="resume-style-browser-preview-line is-md" />
            <span className="resume-style-browser-preview-line is-sm" />
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'layout-aside') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet">
          <span className="resume-style-browser-preview-column is-narrow" />
          <div className="resume-style-browser-preview-stack">
            <span className="resume-style-browser-preview-line is-avatar-line" />
            <span className="resume-style-browser-preview-line is-md" />
            <span className="resume-style-browser-preview-line is-sm" />
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'header-centered') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet">
          <span className="resume-style-browser-preview-line is-avatar-line" />
          <span className="resume-style-browser-preview-line" />
          <div className="resume-style-browser-preview-dots">
            <span />
            <span />
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'header-avatar') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet is-side-avatar">
          <span className="resume-style-browser-preview-avatar" />
          <div className="resume-style-browser-preview-stack">
            <span className="resume-style-browser-preview-line is-md" />
            <span className="resume-style-browser-preview-line is-sm" />
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'title-band') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet is-title-band">
          <span className="resume-style-browser-preview-band" />
          <div className="resume-style-browser-preview-stack">
            <span className="resume-style-browser-preview-line is-md" />
            <span className="resume-style-browser-preview-line is-sm" />
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'timeline-vertical') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet is-timeline">
          <div className="resume-style-browser-preview-rail">
            <span className="resume-style-browser-preview-node" />
            <span className="resume-style-browser-preview-node" />
          </div>
          <div className="resume-style-browser-preview-stack">
            <span className="resume-style-browser-preview-line is-md" />
            <span className="resume-style-browser-preview-line is-sm" />
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'skills-pill') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet">
          <div className="resume-style-browser-preview-tag-grid">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'skills-inline') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet">
          <div className="resume-style-browser-preview-inline">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    )
  }

  if (kind === 'skills-rating') {
    return (
      <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
        <div className="resume-style-browser-preview-sheet">
          <div className="resume-style-browser-preview-leaders">
            <div className="resume-style-browser-preview-leader-row">
              <span className="resume-style-browser-preview-line is-md" />
              <i className="resume-style-browser-preview-leader-line" />
              <b className="resume-style-browser-preview-leader-value" />
            </div>
            <div className="resume-style-browser-preview-leader-row">
              <span className="resume-style-browser-preview-line is-sm" />
              <i className="resume-style-browser-preview-leader-line" />
              <b className="resume-style-browser-preview-leader-value is-short" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="resume-style-browser-preview" data-preview-kind={kind} style={{ ['--resume-style-preview-image' as string]: `url(${image})` }}>
      <div className="resume-style-browser-preview-sheet">
        <div className="resume-style-browser-preview-bars">
          <span className="resume-style-browser-preview-bar is-strong" />
          <span className="resume-style-browser-preview-bar is-soft" />
          <span className="resume-style-browser-preview-bar is-mid" />
          <span className="resume-style-browser-preview-bar is-soft" />
        </div>
      </div>
    </div>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  displayValue,
  formatter,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  displayValue?: number
  formatter?: (value: number) => string
}) {
  const shown = typeof displayValue === 'number' ? displayValue : value
  const renderValue = formatter ? formatter(shown) : String(shown)

  return (
    <div className={joinClassNames('resume-slider-field', sharedStyles.surfaceCard, sharedStyles.stackSm)}>
      <div className={joinClassNames('resume-slider-field-head', sharedStyles.splitBaseline)}>
        <span className="resume-slider-field-label">{label}</span>
        <span className="resume-slider-field-value">{renderValue}</span>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        className="resume-slider-control"
      />
    </div>
  )
}

function SliderChoiceField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  const currentIndex = Math.max(
    0,
    options.findIndex(option => option.value === value),
  )
  const activeIndex = currentIndex >= 0 ? currentIndex : 0
  const activeOption = options[activeIndex] || options[0]

  return (
    <div className={joinClassNames('resume-slider-field', sharedStyles.surfaceCard, sharedStyles.stackSm)}>
      <div className={joinClassNames('resume-slider-field-head', sharedStyles.splitBaseline)}>
        <span className="resume-slider-field-label">{label}</span>
        <span className="resume-slider-field-value">{activeOption.label}</span>
      </div>
      <Slider
        value={activeIndex}
        min={0}
        max={Math.max(options.length - 1, 0)}
        step={1}
        onChange={nextIndex => {
          const nextOption = options[Math.max(0, Math.min(options.length - 1, Math.round(nextIndex)))]
          if (nextOption) {
            onChange(nextOption.value)
          }
        }}
        className="resume-slider-control"
      />
    </div>
  )
}

function formatCompactNumber(value: number, digits = 1) {
  return String(Number(value.toFixed(digits)))
}

function TypesettingSwitch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      className="resume-typesetting-switch-row"
      onClick={onChange}
      role="switch"
      aria-checked={checked}
    >
      <span className={`resume-typesetting-switch${checked ? ' is-on' : ''}`} aria-hidden="true">
        <span className="resume-typesetting-switch-thumb" />
      </span>
      <span className={`resume-typesetting-switch-label${checked ? ' is-on' : ''}`}>{label}</span>
    </button>
  )
}

function FontPreviewCard({
  label,
  family,
  selected,
  onSelect,
}: {
  label: string
  family: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={joinClassNames('resume-font-preview-card', selected && 'is-selected')}
      onClick={onSelect}
      aria-pressed={selected}
      title={`选择 ${label}`}
    >
      <div className="resume-font-preview-card-head">
        <span className="resume-font-preview-card-name">{label}</span>
        {selected ? (
          <span className="resume-font-preview-card-check" aria-hidden="true">
            <Check size={15} />
          </span>
        ) : null}
      </div>
      <div className="resume-font-preview-card-sample" style={{ fontFamily: family }}>
        <strong>沉浸式网申</strong>
      </div>
    </button>
  )
}

export function LayoutAndStylePanel({
  pane,
  smartOnePage,
}: {
  pane: StyleTool
  smartOnePage: SmartOnePageComputation
}) {
  const data = useResumeBuilderStore(state => state.data)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)
  const [styleCategory, setStyleCategory] = useState<StyleBrowserCategory>('template')
  const [styleQuery, setStyleQuery] = useState('')
  const [activeTypographySection, setActiveTypographySection] = useState<'body' | 'heading' | 'family' | null>('body')
  const [hoveredPageGuide, setHoveredPageGuide] = useState<'x' | 'y' | null>(null)
  const primaryColor = data.metadata.design.colors.primary || getTemplateDefaultPrimaryColor(data.metadata.template)
  const textColor = data.metadata.design.colors.text || '#111111'
  const activeHeaderVariant = resolveHeaderVariantForTemplate(
    data.metadata.template,
    data.metadata.design.headerVariant || null,
  )
  const activeSectionVariant = resolveSectionVariantForTemplate(
    data.metadata.template,
    data.metadata.design.sectionVariant || null,
  )
  const activeSkillsVariant = resolveSkillsVariant(
    data.metadata.design.skillsVariant || null,
  )
  const [searchKeyword, smartOnePageStatusText] = [
    styleQuery.trim().toLowerCase(),
    smartOnePage.enabled && smartOnePage.active
      ? `当前已接管版面，正文约 ${smartOnePage.effectiveData.metadata.typography.body.fontSize.toFixed(1)}pt / 行高 ${smartOnePage.effectiveData.metadata.typography.body.lineHeight.toFixed(2)}。`
      : smartOnePage.enabled
        ? '智能一页已开启，当前内容暂不需要自动压缩。'
        : '关闭时将使用你当前设置的字号与留白。',
  ]
  const smartOnePageActive = smartOnePage.enabled && smartOnePage.active
  const smartEffectiveBodyFontSize = smartOnePageActive ? smartOnePage.effectiveData.metadata.typography.body.fontSize : undefined
  const smartEffectiveBodyLineHeight = smartOnePageActive ? smartOnePage.effectiveData.metadata.typography.body.lineHeight : undefined
  const unifiedFontFamily = normalizeResumeFontFamily(
    data.metadata.typography.body.fontFamily || data.metadata.typography.heading.fontFamily,
  )
  const unifiedFontPreset = resolveResumeFontPreset(unifiedFontFamily)
  const pagePreviewWidth = 128
  const pagePreviewHeight = data.metadata.page.format === 'free-form' ? 220 : 176
  const pagePreviewInsetX = data.metadata.page.marginX * 0.8
  const pagePreviewInsetY = data.metadata.page.marginY * 0.8

  const setTemplate = (templateId: ReactiveTemplateId) => {
    updateResumeData(draft => {
      draft.metadata.template = templateId
      draft.metadata.design.colors.primary = getTemplateDefaultPrimaryColor(templateId)
      draft.metadata.design.headerVariant = 'auto'
      draft.metadata.design.sectionVariant = 'auto'
      draft.metadata.design.skillsVariant = resolveSkillsVariant(draft.metadata.design.skillsVariant)
    })
  }

  const layoutCards = useMemo<StyleBrowserCard[]>(
    () => [
      {
        id: 'template-1',
        label: '铜版网格',
        preview: 'layout-grid',
        previewImage: '/template-style-previews/layout-bronze-grid.png',
        category: 'template',
        groupId: 'template',
        groupTitle: '简历模板',
        keywords: ['简历', '模板', '布局', '卡片', '双栏'],
        selected: data.metadata.template === 'template-1',
        onSelect: () => setTemplate('template-1'),
      },
      {
        id: 'template-2',
        label: '雪纹简章',
        preview: 'layout-split',
        previewImage: '/template-style-previews/layout-snow-booklet.png',
        category: 'template',
        groupId: 'template',
        groupTitle: '简历模板',
        keywords: ['简历', '模板', '布局', '雪纹', '分栏'],
        selected: data.metadata.template === 'template-2',
        onSelect: () => setTemplate('template-2'),
      },
      {
        id: 'template-3',
        label: '签条布局',
        preview: 'layout-column',
        previewImage: '/template-style-previews/layout-strip.png',
        category: 'template',
        groupId: 'template',
        groupTitle: '简历模板',
        keywords: ['简历', '模板', '布局', '签条', '结构'],
        selected: data.metadata.template === 'template-3',
        onSelect: () => setTemplate('template-3'),
      },
      {
        id: 'template-4',
        label: '浅紫书页',
        preview: 'layout-column',
        previewImage: '/template-style-previews/layout-lavender-page.png',
        category: 'template',
        groupId: 'template',
        groupTitle: '简历模板',
        keywords: ['简历', '模板', '布局', '浅紫', '书页'],
        selected: data.metadata.template === 'template-4',
        onSelect: () => setTemplate('template-4'),
      },
      {
        id: 'template-5',
        label: '双栏分区',
        preview: 'layout-aside',
        previewImage: '/template-style-previews/layout-dual-sidebar.png',
        category: 'template',
        groupId: 'template',
        groupTitle: '简历模板',
        keywords: ['简历', '模板', '双栏', '侧栏', '结构化'],
        selected: data.metadata.template === 'template-5',
        onSelect: () => setTemplate('template-5'),
      },
    ],
    [data.metadata.template],
  )

  const elementCards = useMemo<StyleBrowserCard[]>(
    () => [
      {
        id: 'header-1',
        label: '铜版卡片',
        preview: 'header-centered',
        previewImage: '/template-style-previews/header-bronze-card.png',
        category: 'header',
        groupId: 'header',
        groupTitle: '页眉样式',
        keywords: ['页眉', '铜版', '卡片', 'header 1'],
        selected: activeHeaderVariant === 'header-1',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.headerVariant = 'header-1' }),
      },
      {
        id: 'header-2',
        label: '雪纹线性',
        preview: 'header-centered',
        previewImage: '/template-style-previews/header-snow-line.png',
        category: 'header',
        groupId: 'header',
        groupTitle: '页眉样式',
        keywords: ['页眉', '线性', '雪纹', 'header 2'],
        selected: activeHeaderVariant === 'header-2',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.headerVariant = 'header-2' }),
      },
      {
        id: 'header-3',
        label: '绯红横幅',
        preview: 'header-centered',
        previewImage: '/template-style-previews/header-crimson-banner.png',
        category: 'header',
        groupId: 'header',
        groupTitle: '页眉样式',
        keywords: ['页眉', '横幅', '绯红', 'header 3'],
        selected: activeHeaderVariant === 'header-3',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.headerVariant = 'header-3' }),
      },
      {
        id: 'header-4',
        label: '经典居中',
        preview: 'header-centered',
        previewImage: '/template-style-previews/header-classic-centered.png',
        category: 'header',
        groupId: 'header',
        groupTitle: '页眉样式',
        keywords: ['页眉', '居中', '经典', '姓名'],
        selected: activeHeaderVariant === 'header-4',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.headerVariant = 'header-4' }),
      },
      {
        id: 'header-5',
        label: '侧重头像',
        preview: 'header-avatar',
        previewImage: '/template-style-previews/header-side-avatar.png',
        category: 'header',
        groupId: 'header',
        groupTitle: '页眉样式',
        keywords: ['页眉', '头像', '侧边'],
        selected: activeHeaderVariant === 'header-5',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.headerVariant = 'header-5' }),
      },
      {
        id: 'section-1',
        label: '铜版网格',
        preview: 'timeline-vertical',
        previewImage: '/template-style-previews/section-bronze-grid.png',
        category: 'section',
        groupId: 'section',
        groupTitle: '模块样式',
        keywords: ['section', '标题', '经历', '铜版', '网格'],
        selected: activeSectionVariant === 'section-1',
        wide: true,
        onSelect: () => updateResumeData(draft => { draft.metadata.design.sectionVariant = 'section-1' }),
      },
      {
        id: 'section-2',
        label: '雪纹简章',
        preview: 'title-band',
        previewImage: '/template-style-previews/section-snow-booklet.png',
        category: 'section',
        groupId: 'section',
        groupTitle: '模块样式',
        keywords: ['section', '标题', '经历', '雪纹', '简章'],
        selected: activeSectionVariant === 'section-2',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.sectionVariant = 'section-2' }),
      },
      {
        id: 'section-3',
        label: '强调签条',
        preview: 'title-band',
        previewImage: '/template-style-previews/title-accent-band.png',
        category: 'section',
        groupId: 'section',
        groupTitle: '模块样式',
        keywords: ['标题', '签条', '强调'],
        selected: activeSectionVariant === 'section-3',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.sectionVariant = 'section-3' }),
      },
      {
        id: 'section-4',
        label: '浅紫书页',
        preview: 'timeline-vertical',
        previewImage: '/template-style-previews/section-lavender-page.png',
        category: 'section',
        groupId: 'section',
        groupTitle: '模块样式',
        keywords: ['section', '标题', '经历', '浅紫', '书页'],
        selected: activeSectionVariant === 'section-4',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.sectionVariant = 'section-4' }),
      },
      {
        id: 'skills-1',
        label: '标签形式',
        preview: 'skills-pill',
        previewImage: '/template-style-previews/skills-tags.png',
        category: 'skills',
        groupId: 'skills',
        groupTitle: '技能样式',
        keywords: ['技能', '标签', '方块', 'chip'],
        selected: activeSkillsVariant === 'skills-1',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.skillsVariant = 'skills-1' }),
      },
      {
        id: 'skills-2',
        label: '进度条',
        preview: 'skills-bars',
        previewImage: '/template-style-previews/skills-progress.png',
        category: 'skills',
        groupId: 'skills',
        groupTitle: '技能样式',
        keywords: ['技能', '进度条', '百分比'],
        selected: activeSkillsVariant === 'skills-2',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.skillsVariant = 'skills-2' }),
      },
      {
        id: 'skills-3',
        label: '逗号分隔',
        preview: 'skills-inline',
        previewImage: '/template-style-previews/skills-inline.png',
        category: 'skills',
        groupId: 'skills',
        groupTitle: '技能样式',
        keywords: ['技能', '逗号', '一行'],
        selected: activeSkillsVariant === 'skills-3',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.skillsVariant = 'skills-3' }),
      },
      {
        id: 'skills-4',
        label: '熟练度对照',
        preview: 'skills-rating',
        previewImage: '/template-style-previews/skills-rating.png',
        category: 'skills',
        groupId: 'skills',
        groupTitle: '技能样式',
        keywords: ['技能', '熟练度', '左右'],
        selected: activeSkillsVariant === 'skills-4',
        onSelect: () => updateResumeData(draft => { draft.metadata.design.skillsVariant = 'skills-4' }),
      },
    ],
    [activeHeaderVariant, activeSectionVariant, activeSkillsVariant, updateResumeData],
  )

  const filteredLayoutCards = useMemo(
    () => layoutCards.filter(card => !searchKeyword || [card.label, ...card.keywords].some(keyword => keyword.toLowerCase().includes(searchKeyword))),
    [layoutCards, searchKeyword],
  )

  const filteredStyleCards = useMemo(
    () =>
      [...filteredLayoutCards, ...elementCards].filter(card => {
        const matchesCategory = card.category === styleCategory
        if (!matchesCategory) return false
        if (!searchKeyword) return true
        return [card.label, card.groupTitle, ...card.keywords].some(keyword => keyword.toLowerCase().includes(searchKeyword))
      }),
    [elementCards, filteredLayoutCards, searchKeyword, styleCategory],
  )

  const groupedStyleCards = useMemo(() => {
    const groups = new Map<string, { title: string; cards: StyleBrowserCard[] }>()
    filteredStyleCards.forEach(card => {
      const current = groups.get(card.groupId)
      if (current) {
        current.cards.push(card)
        return
      }
      groups.set(card.groupId, { title: card.groupTitle, cards: [card] })
    })
    return Array.from(groups.entries()).map(([id, value]) => ({ id, ...value }))
  }, [filteredStyleCards])

  const renderStyleCard = (card: StyleBrowserCard) => (
    <button
      key={card.id}
      type="button"
      className={joinClassNames('resume-style-browser-card', card.selected && 'is-selected', card.wide && 'is-wide')}
      onClick={card.onSelect}
      aria-pressed={card.selected}
      title={card.label}
    >
      <div className="resume-style-browser-card-frame">
        <StyleBrowserPreview kind={card.preview} image={card.previewImage} />
      </div>
      <span className="resume-style-browser-card-label">{card.label}</span>
    </button>
  )

  const toggleTypographySection = (key: 'body' | 'heading' | 'family') => {
    setActiveTypographySection(current => (current === key ? null : key))
  }

  if (pane === 'typography') {
    return (
      <div className={`${styles.panel} ${styles.typography} resume-typography-panel`}>
        <div className="resume-typography-row">
          <span className="resume-typography-row-label">文字颜色</span>
          <ResumeColorPickerControl
            value={textColor}
            onChange={next => updateResumeData(draft => { draft.metadata.design.colors.text = next })}
            ariaLabel="字体色"
          />
        </div>
        <section className={`resume-typography-collapse${activeTypographySection === 'heading' ? ' is-open' : ''}`}>
          <button
            type="button"
            className="resume-typography-collapse-trigger"
            aria-expanded={activeTypographySection === 'heading'}
            onClick={() => toggleTypographySection('heading')}
          >
            <span className="resume-typography-collapse-title">标题</span>
            <span className="resume-typography-collapse-meta">
              <span>{formatCompactNumber(data.metadata.typography.heading.fontSize, 1)}</span>
              <span>/</span>
              <span>{formatCompactNumber(data.metadata.typography.heading.lineHeight, 2)}</span>
            </span>
          </button>

          {activeTypographySection === 'heading' ? (
            <div className="resume-typography-collapse-content">
              <ToolSliderField
                label="字号"
                value={data.metadata.typography.heading.fontSize}
                min={RESUME_EDITOR_LIMITS.typography.headingFontSize.min}
                max={RESUME_EDITOR_LIMITS.typography.headingFontSize.max}
                step={RESUME_EDITOR_LIMITS.typography.headingFontSize.step}
                formatter={value => formatCompactNumber(value, 1)}
                onChange={next => updateResumeData(draft => { draft.metadata.typography.heading.fontSize = next })}
                inputClassName="resume-typography-slider-input"
              />
              <ToolSliderField
                label="行距"
                value={data.metadata.typography.heading.lineHeight}
                min={RESUME_EDITOR_LIMITS.typography.headingLineHeight.min}
                max={RESUME_EDITOR_LIMITS.typography.headingLineHeight.max}
                step={RESUME_EDITOR_LIMITS.typography.headingLineHeight.step}
                formatter={value => formatCompactNumber(value, 2)}
                onChange={next => updateResumeData(draft => { draft.metadata.typography.heading.lineHeight = next })}
                inputClassName="resume-typography-slider-input"
              />
            </div>
          ) : null}
        </section>
        <section className={`resume-typography-collapse${activeTypographySection === 'body' ? ' is-open' : ''}`}>
          <button
            type="button"
            className="resume-typography-collapse-trigger"
            aria-expanded={activeTypographySection === 'body'}
            onClick={() => toggleTypographySection('body')}
          >
            <span className="resume-typography-collapse-title">正文</span>
            <span className="resume-typography-collapse-meta">
              <span>{formatCompactNumber(typeof smartEffectiveBodyFontSize === 'number' ? smartEffectiveBodyFontSize : data.metadata.typography.body.fontSize, 1)}</span>
              <span>/</span>
              <span>{formatCompactNumber(typeof smartEffectiveBodyLineHeight === 'number' ? smartEffectiveBodyLineHeight : data.metadata.typography.body.lineHeight, 2)}</span>
            </span>
          </button>

          {activeTypographySection === 'body' ? (
            <div className="resume-typography-collapse-content">
              <ToolSliderField
                label="字号"
                value={data.metadata.typography.body.fontSize}
                displayValue={smartEffectiveBodyFontSize}
                min={RESUME_EDITOR_LIMITS.typography.bodyFontSize.min}
                max={RESUME_EDITOR_LIMITS.typography.bodyFontSize.max}
                step={RESUME_EDITOR_LIMITS.typography.bodyFontSize.step}
                formatter={value => formatCompactNumber(value, 1)}
                onChange={next => updateResumeData(draft => { draft.metadata.typography.body.fontSize = next })}
                inputClassName="resume-typography-slider-input"
              />
              <ToolSliderField
                label="行距"
                value={data.metadata.typography.body.lineHeight}
                displayValue={smartEffectiveBodyLineHeight}
                min={RESUME_EDITOR_LIMITS.typography.bodyLineHeight.min}
                max={RESUME_EDITOR_LIMITS.typography.bodyLineHeight.max}
                step={RESUME_EDITOR_LIMITS.typography.bodyLineHeight.step}
                formatter={value => formatCompactNumber(value, 2)}
                onChange={next => updateResumeData(draft => { draft.metadata.typography.body.lineHeight = next })}
                inputClassName="resume-typography-slider-input"
              />
            </div>
          ) : null}
        </section>



        <section className={`resume-typography-collapse${activeTypographySection === 'family' ? ' is-open' : ''}`}>
          <button
            type="button"
            className="resume-typography-collapse-trigger"
            aria-expanded={activeTypographySection === 'family'}
            onClick={() => toggleTypographySection('family')}
          >
            <span className="resume-typography-collapse-title">字体</span>
            <span className="resume-typography-collapse-meta">
              <span>{unifiedFontPreset.label}</span>
              <span className="resume-typography-font-count">{RESUME_FONT_PRESETS.length} 选项</span>
            </span>
          </button>

          {activeTypographySection === 'family' ? (
            <div className="resume-typography-collapse-content is-font-grid">
              <div className="resume-font-preview-grid">
                {RESUME_FONT_PRESETS.map(font => (
                  <FontPreviewCard
                    key={font.value}
                    label={font.label}
                    family={resolveResumeFontFamilyStack(font.value)}
                    selected={unifiedFontFamily === font.value}
                    onSelect={() =>
                      updateResumeData(draft => {
                        const normalized = normalizeResumeFontFamily(font.value)
                        draft.metadata.typography.body.fontFamily = normalized
                        draft.metadata.typography.heading.fontFamily = normalized
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {smartOnePage.enabled ? (
          <div className="resume-typography-smart-note">{smartOnePageStatusText}</div>
        ) : null}
      </div>
    )
  }

  if (pane === 'typesetting') {
    return (
      <div className={`space-y-4 ${styles.panel} ${styles.typesetting}`}>
        <div className="resume-typesetting-preview-card">
          <div className="resume-typesetting-mode-switch" role="tablist" aria-label="纸张模式">
            {([
              ['a4', 'A4 模式', <FileText size={12} key="a4-icon" />],
              ['free-form', '自由高度', <Maximize2 size={12} key="free-icon" />],
            ] as const).map(([formatValue, formatLabel, formatIcon]) => (
              <button
                key={formatValue}
                type="button"
                className={`resume-typesetting-mode-tab${data.metadata.page.format === formatValue ? ' is-active' : ''}`}
                onClick={() =>
                  updateResumeData(draft => {
                    draft.metadata.page.format = formatValue
                  })
                }
              >
                <span className="resume-typesetting-mode-icon" aria-hidden="true">{formatIcon}</span>
                <span>{formatLabel}</span>
              </button>
            ))}
          </div>

          <div className="resume-typesetting-preview-stage">
            <div
              className={`resume-typesetting-layout-preview${data.metadata.page.format === 'free-form' ? ' is-free-form' : ''}`}
              style={{ height: `${pagePreviewHeight}px`, width: `${pagePreviewWidth}px` }}
            >
              <div
                className={`resume-typesetting-preview-edge is-vertical${hoveredPageGuide === 'y' ? ' is-hovered' : ''}`}
                style={{ top: `${pagePreviewInsetY}px`, bottom: `${pagePreviewInsetY}px` }}
              />
              <div
                className={`resume-typesetting-preview-edge is-horizontal${hoveredPageGuide === 'x' ? ' is-hovered' : ''}`}
                style={{ left: `${pagePreviewInsetX}px`, right: `${pagePreviewInsetX}px` }}
              />

              <div
                className="resume-typesetting-preview-content"
                style={{
                  top: `${pagePreviewInsetY}px`,
                  bottom: `${pagePreviewInsetY}px`,
                  left: `${pagePreviewInsetX}px`,
                  right: `${pagePreviewInsetX}px`,
                }}
              >
                <div className="resume-typesetting-preview-skeleton">
                  <div className="resume-typesetting-preview-skeleton-title" />
                  <div className="resume-typesetting-preview-skeleton-group">
                    <div className="resume-typesetting-preview-skeleton-line is-full" />
                    <div className="resume-typesetting-preview-skeleton-line is-full" />
                    <div className="resume-typesetting-preview-skeleton-line is-short" />
                  </div>
                  <div className="resume-typesetting-preview-skeleton-title is-secondary" />
                  <div className="resume-typesetting-preview-skeleton-group">
                    <div className="resume-typesetting-preview-skeleton-line is-full" />
                    <div className="resume-typesetting-preview-skeleton-line is-full" />
                    <div className="resume-typesetting-preview-skeleton-line is-full" />
                  </div>
                </div>
              </div>

              {data.metadata.page.format !== 'free-form' ? (
                <div className="resume-typesetting-preview-page-indicator" aria-hidden="true" />
              ) : null}
            </div>
          </div>

          <div className="resume-typesetting-preview-caption">
            {data.metadata.page.format === 'free-form'
              ? 'Content Adaptive Height'
              : 'Fixed 210 × 297 mm'}
          </div>
        </div>

        <ToolSliderField
          label="左右页边距"
          value={data.metadata.page.marginX}
          min={RESUME_EDITOR_LIMITS.page.marginX.min}
          max={RESUME_EDITOR_LIMITS.page.marginX.max}
          step={RESUME_EDITOR_LIMITS.page.marginX.step}
          formatter={value => `${value.toFixed(1)} pt`}
          onChange={next => updateResumeData(draft => { draft.metadata.page.marginX = next })}
          inputClassName="resume-typesetting-slider-input"
          onMouseEnter={() => setHoveredPageGuide('x')}
          onMouseLeave={() => setHoveredPageGuide(null)}
        />
        <ToolSliderField
          label="上下页边距"
          value={data.metadata.page.marginY}
          min={RESUME_EDITOR_LIMITS.page.marginY.min}
          max={RESUME_EDITOR_LIMITS.page.marginY.max}
          step={RESUME_EDITOR_LIMITS.page.marginY.step}
          formatter={value => `${value.toFixed(1)} pt`}
          onChange={next => updateResumeData(draft => { draft.metadata.page.marginY = next })}
          inputClassName="resume-typesetting-slider-input"
          onMouseEnter={() => setHoveredPageGuide('y')}
          onMouseLeave={() => setHoveredPageGuide(null)}
        />

        <div className="resume-typesetting-setting-card">
          <TypesettingSwitch
            label="智能一页"
            checked={data.metadata.page.smartOnePageEnabled}
            onChange={() =>
              updateResumeData(draft => {
                draft.metadata.page.smartOnePageEnabled = !draft.metadata.page.smartOnePageEnabled
              })
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.panel} ${styles.styleBrowser} resume-style-browser-shell`}>
      <SearchField
        value={styleQuery}
        onChange={event => setStyleQuery(event.target.value)}
        placeholder="搜索简历样式关键词..."
        aria-label="搜索简历样式关键词"
      />

      <div className="resume-style-browser-theme-row">
        <span className="resume-style-browser-theme-label">主题色</span>
        <ResumeColorPickerControl
          value={primaryColor}
          onChange={next => updateResumeData(draft => { draft.metadata.design.colors.primary = next })}
          ariaLabel="主题色"
        />
      </div>

      <div className="resume-style-browser-filters" role="tablist" aria-label="简历样式分类筛选">
        {([
          ['template', '模板'],
          ['header', '页眉'],
          ['section', '模块'],
          ['skills', '技能'],
        ] as Array<[StyleBrowserCategory, string]>).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="resume-style-browser-filter"
            data-active={styleCategory === value ? 'true' : undefined}
            onClick={() => setStyleCategory(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="resume-style-browser-content">
        {groupedStyleCards.map(group => (
          <section key={group.id} className="resume-style-browser-group">
            <div className="resume-style-browser-group-head">
              <div className="resume-style-browser-group-title">{group.title}</div>
            </div>
            <div className="resume-style-browser-grid">{group.cards.map(renderStyleCard)}</div>
          </section>
        ))}
      </div>
    </div>
  )
}
