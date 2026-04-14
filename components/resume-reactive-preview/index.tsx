'use client'

import { Fragment, type CSSProperties, type HTMLAttributes, type ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import { sanitizeHtml } from '@/lib/resume/sanitize'
import { RESUME_EDITOR_LIMITS, clampToRange } from '@/lib/resume/editor-limits'
import { resolveResumeFontFamilyStack } from '@/lib/resume/fonts'
import { resolveSkillPercent as resolveCanonicalSkillPercent, resolveSkillProficiencyLabel as resolveCanonicalSkillProficiencyLabel } from '@/lib/resume/skills'
import {
  type CustomSectionType,
  type ResumePageFormat,
  type ResumeData,
  type StandardSectionType,
} from '@/lib/resume/types'
import {
  Award,
  BadgeCheck,
  BookText,
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  Globe,
  GraduationCap,
  HandHeart,
  Heart,
  Languages,
  type LucideIcon,
  Users,
  Wrench,
} from 'lucide-react'
import renderComposedTemplate from './templates/composed-template-renderer'
import {
  collectVisibleSectionIds,
  estimateCurrentTemplateHeight,
  estimateCurrentTemplatePages,
  hasRenderableCustomItem,
  hasRenderableStandardItem,
  resolveTemplateContentMetrics,
  stripHtml,
  supportsMeasuredTemplatePagination,
} from './templates/estimate-current-template-height'
import type {
  TemplateHelpers as RuntimeTemplateHelpers,
  TemplateRenderContext as RuntimeTemplateRenderContext,
} from './templates/types'
import type { HeightDebugSnapshot } from './height-debug'
import styles from './preview.module.scss'

interface ResumeReactivePreviewProps {
  data: ResumeData
  className?: string
  showPageNumbers?: boolean
  onNavigate?: (target: PreviewNavigationTarget) => void
  onHeightDebugSnapshot?: (snapshot: HeightDebugSnapshot | null) => void
}

export interface PreviewNavigationTarget {
  sectionId: string
  itemId?: string
  fieldKey?: string
}

type TemplateRenderer = (context: RuntimeTemplateRenderContext, helpers: RuntimeTemplateHelpers) => ReactElement | null

type HeadingVariant = 'icon-line' | 'pill' | 'text-line' | 'striped' | 'sidebar' | 'gray-tab'
type ItemVariant = 'compact' | 'default' | 'timeline'

const PAGE_DIMENSIONS: Record<ResumePageFormat, { width: string; height: string }> = {
  a4: { width: '210mm', height: '297mm' },
  'free-form': { width: '210mm', height: '297mm' },
}

const SECTION_TITLE_MAP: Record<StandardSectionType, string> = {
  profiles: '社交资料',
  experience: '工作经验',
  education: '教育背景',
  projects: '项目经历',
  skills: '技能特长',
  languages: '语言能力',
  interests: '兴趣爱好',
  awards: '荣誉奖项',
  certifications: '荣誉证书',
  publications: '出版物',
  volunteer: '志愿经历',
  references: '推荐人',
}

const SECTION_ICON_MAP: Record<string, LucideIcon> = {
  summary: FileText,
  profiles: Globe,
  experience: BriefcaseBusiness,
  education: GraduationCap,
  projects: FolderKanban,
  skills: Wrench,
  languages: Languages,
  interests: Heart,
  awards: Award,
  certifications: BadgeCheck,
  publications: BookText,
  volunteer: HandHeart,
  references: Users,
}

const DEFAULT_AVATAR = '/templates/shared/avatar-default.png'
const AVATAR_ASPECT_RATIO = 295 / 413
const AVATAR_SIZE_SCALE = 1.6
const SECTION_PRIMARY_FIELD_MAP: Partial<Record<StandardSectionType, string>> = {
  profiles: 'network',
  experience: 'company',
  education: 'school',
  projects: 'name',
  languages: 'language',
  interests: 'name',
  awards: 'title',
  certifications: 'title',
  publications: 'title',
  volunteer: 'organization',
  references: 'name',
}
const SECTION_SECONDARY_FIELD_MAP: Partial<Record<StandardSectionType, string>> = {
  profiles: 'username',
  experience: 'position',
  education: 'degree',
  projects: 'website.label',
  languages: 'fluency',
  awards: 'awarder',
  certifications: 'issuer',
  publications: 'publisher',
  volunteer: 'location',
  references: 'position',
}

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

function resolveWebsiteFieldKey(data: ResumeData) {
  if (data.basics.website.url.trim()) return 'website.url'
  if (data.basics.website.label.trim()) return 'website.label'
  return 'website.url'
}

function resolveLocationFieldKey(data: ResumeData) {
  return data.basics.nativePlace.trim() ? 'nativePlace' : 'location'
}

function getPreviewActionProps(
  onNavigate: ResumeReactivePreviewProps['onNavigate'],
  target: PreviewNavigationTarget | null | undefined,
  className?: string,
): HTMLAttributes<HTMLElement> {
  if (!onNavigate || !target) {
    return className ? { className } : {}
  }

  return {
    className: cx(className, styles.previewInteractive),
    role: 'button',
    tabIndex: 0,
    onClick: event => {
      event.stopPropagation()
      onNavigate(target)
    },
    onKeyDown: event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        onNavigate(target)
      }
    },
  }
}

function isStandardSection(sectionId: string): sectionId is StandardSectionType {
  return sectionId in SECTION_TITLE_MAP
}

function renderRichText(
  content: string,
  className?: string,
  onNavigate?: ResumeReactivePreviewProps['onNavigate'],
  target?: PreviewNavigationTarget,
) {
  const sanitized = sanitizeHtml(content)
  return (
    <div
      {...getPreviewActionProps(onNavigate, target, cx(styles.itemDescription, className, 'tiptap-content'))}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}

function renderInlineTargetList(
  items: Array<{ key: string; value: string; target: PreviewNavigationTarget }>,
  onNavigate?: ResumeReactivePreviewProps['onNavigate'],
) {
  const visibleItems = items.filter(item => hasMeaningfulText(item.value))
  return visibleItems.map((item, index) => (
    <Fragment key={item.key}>
      {index > 0 ? <span className={styles.previewInlineSeparator}>｜</span> : null}
      <span {...getPreviewActionProps(onNavigate, item.target, styles.previewInlineValue)}>{item.value}</span>
    </Fragment>
  ))
}

function shouldRenderAvatar(data: ResumeData) {
  return !data.picture.hidden
}

function getPictureUrl(data: ResumeData) {
  const uploadedUrl = String(data.picture.url || '').trim()
  return uploadedUrl || DEFAULT_AVATAR
}

function toPercentLevel(level: unknown) {
  const normalizedLevel = Number(level || 0)
  if (Number.isNaN(normalizedLevel) || normalizedLevel <= 0) return 0
  return Math.max(0, Math.min(100, (normalizedLevel / 5) * 100))
}

function normalizeToken(value: string) {
  return value.replace(/\s+/g, '').toLowerCase()
}

function parseFactPairs(data: ResumeData) {
  const pairs: Array<{ key: string; value: string }> = []
  data.basics.customFields.forEach(field => {
    String(field.text || '')
      .split(/[|｜\n]/)
      .map(item => item.trim())
      .filter(Boolean)
      .forEach(item => {
        const match = item.match(/^([^:：]+)[:：]\s*(.+)$/)
        if (!match) return
        pairs.push({
          key: match[1].trim(),
          value: match[2].trim(),
        })
      })
  })
  return pairs
}

function findFactValue(pairs: Array<{ key: string; value: string }>, keywords: string[]) {
  const normalizedKeywords = keywords.map(normalizeToken)
  for (const pair of pairs) {
    const normalizedKey = normalizeToken(pair.key)
    if (normalizedKeywords.some(keyword => normalizedKey.includes(keyword) || keyword.includes(normalizedKey))) {
      return pair.value
    }
  }
  return ''
}

function fallbackText(value: string, fallback = '-') {
  const normalized = value.trim()
  return normalized ? normalized : fallback
}

function hasMeaningfulText(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 && normalized !== '-'
}

function calculateAgeFromBirthDate(birthDate: string) {
  const normalized = birthDate.trim()
  if (!normalized) return ''

  const match = normalized.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/)
  if (!match) return ''

  const year = Number(match[1])
  const month = Number(match[2] || 1)
  const day = Number(match[3] || 1)
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return ''
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return ''

  const today = new Date()
  let age = today.getFullYear() - year
  const hasBirthdayPassed = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day)
  if (!hasBirthdayPassed) {
    age -= 1
  }

  if (age < 0 || age > 120) return ''
  return String(age)
}

function formatBirthDateText(value: string) {
  const normalized = value.trim()
  if (!normalized) return ''
  return normalized.replace(/-/g, '.')
}

function formatHeightText(value: string) {
  const normalized = value.trim()
  if (!normalized) return ''
  if (/[a-zA-Z\u4e00-\u9fa5]/.test(normalized)) return normalized
  return `${normalized}cm`
}

function formatWeightText(value: string) {
  const normalized = value.trim()
  if (!normalized) return ''
  if (/[a-zA-Z\u4e00-\u9fa5]/.test(normalized)) return normalized
  return `${normalized}kg`
}

function extractResumeFacts(data: ResumeData) {
  const factPairs = parseFactPairs(data)
  const position = fallbackText(
    data.basics.intentionPosition || findFactValue(factPairs, ['求职意向', '求职岗位', '应聘岗位', '岗位', '职位']),
  )
  const targetCity = fallbackText(
    data.basics.intentionCity || findFactValue(factPairs, ['意向城市', '求职城市', '期望城市']),
  )
  const salary = fallbackText(data.basics.intentionSalary || findFactValue(factPairs, ['期望薪资', '薪资', '薪酬', '工资']))
  const availability = fallbackText(
    data.basics.intentionAvailability || findFactValue(factPairs, ['入职时间', '到岗时间', '可到岗', '到岗']),
  )
  const ageByBirthDate = data.basics.convertBirthToAge ? calculateAgeFromBirthDate(data.basics.birthDate) : ''
  const rawBirthDate = fallbackText(formatBirthDateText(data.basics.birthDate) || findFactValue(factPairs, ['出生年月', '出生日期', '生日']), '')
  const rawAge = data.basics.convertBirthToAge ? fallbackText(ageByBirthDate || findFactValue(factPairs, ['年龄']), '') : ''
  const shouldDisplayAge = data.basics.convertBirthToAge && hasMeaningfulText(rawAge)
  const age = shouldDisplayAge ? rawAge : ''
  const gender = fallbackText(data.basics.gender || findFactValue(factPairs, ['性别']))
  const experience = fallbackText(data.basics.workYears || findFactValue(factPairs, ['工作经验', '工作年限', '经验']))
  const birthDate = shouldDisplayAge ? '' : rawBirthDate
  const height = fallbackText(formatHeightText(data.basics.heightCm) || findFactValue(factPairs, ['身高']))
  const weight = fallbackText(formatWeightText(data.basics.weightKg) || findFactValue(factPairs, ['体重', '重量']))
  const nativePlace = fallbackText(data.basics.nativePlace || findFactValue(factPairs, ['籍贯', '户籍', '户口']), '')
  const currentLocation = fallbackText(data.basics.location, '')
  const maritalStatus = fallbackText(data.basics.maritalStatus || findFactValue(factPairs, ['婚姻状况', '婚姻']))
  const ethnicity = fallbackText(data.basics.ethnicity || findFactValue(factPairs, ['民族']))
  const politicalStatus = fallbackText(data.basics.politicalStatus || findFactValue(factPairs, ['政治面貌', '政治状态']))
  const website = fallbackText(data.basics.website.label || data.basics.website.url, '')

  return {
    position,
    targetCity,
    salary,
    availability,
    age,
    birthDate,
    height,
    weight,
    gender,
    experience,
    nativePlace,
    currentLocation,
    maritalStatus,
    ethnicity,
    politicalStatus,
    website,
  }
}

function resolvePersonalLocation(facts: ReturnType<typeof extractResumeFacts>) {
  return facts.nativePlace || facts.currentLocation
}

function resolveStandardSectionTitle(data: ResumeData, sectionId: StandardSectionType) {
  return data.sections[sectionId].title || SECTION_TITLE_MAP[sectionId]
}

function resolveTemplate8SkillPercent(level: unknown, proficiency: string) {
  return resolveCanonicalSkillPercent(level, proficiency)
}

function resolveTemplate8SkillLabel(proficiency: string, percent: number) {
  return resolveCanonicalSkillProficiencyLabel(proficiency, percent)
}

const COMPOSED_TEMPLATE_RENDERER: TemplateRenderer = (context, helpers) => (
  renderComposedTemplate(context, helpers) as ReactElement | null
)

function renderStandardItem(
  section: StandardSectionType,
  item: Record<string, unknown>,
  variant: ItemVariant = 'default',
  onNavigate?: ResumeReactivePreviewProps['onNavigate'],
  navigationSectionId: string = section,
) {
  if (item.hidden) return null
  const itemId = String(item.id || '')
  const primaryFieldKey = SECTION_PRIMARY_FIELD_MAP[section]
  const secondaryFieldKey = SECTION_SECONDARY_FIELD_MAP[section]
  const articleTarget = primaryFieldKey ? { sectionId: navigationSectionId, itemId, fieldKey: primaryFieldKey } : null

  if (section === 'profiles') {
    const website = (item.website as { url?: string; label?: string } | undefined) || {}
    return (
      <article {...getPreviewActionProps(onNavigate, articleTarget, cx(styles.item, variant === 'compact' && styles.itemCompact))}>
        <div className={styles.itemHeader}>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'network' }, styles.recordPrimary)}>
            {String(item.network || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'username' }, styles.itemMeta)}>
            {String(item.username || '')}
          </span>
        </div>
        {website.url ? (
          <div {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'website.url' }, styles.recordMeta)}>
            {website.label || website.url}
          </div>
        ) : null}
      </article>
    )
  }

  if (section === 'education') {
    const educationRole = `${String(item.degree || '')}${item.area ? `（${String(item.area || '')}）` : ''}`.trim()
    return (
      <article {...getPreviewActionProps(onNavigate, articleTarget, cx(styles.item, variant === 'timeline' && styles.itemTimeline))}>
        <div className={cx(styles.recordHeader, variant === 'compact' && styles.recordHeaderCompact)}>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'period' }, styles.recordPeriod)}>
            {String(item.period || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'school' }, styles.recordPrimary)}>
            {String(item.school || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'degree' }, styles.recordRole)}>
            {educationRole}
          </span>
        </div>
        {'grade' in item && String(item.grade || '').trim() ? (
          <div {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'grade' }, styles.recordMeta)}>
            专业成绩：{String(item.grade || '')}
          </div>
        ) : null}
        {'description' in item
          ? renderRichText(String(item.description || ''), undefined, onNavigate, {
              sectionId: navigationSectionId,
              itemId,
              fieldKey: 'description',
            })
          : null}
      </article>
    )
  }

  if (section === 'experience') {
    return (
      <article {...getPreviewActionProps(onNavigate, articleTarget, cx(styles.item, variant === 'timeline' && styles.itemTimeline))}>
        <div className={cx(styles.recordHeader, variant === 'compact' && styles.recordHeaderCompact)}>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'period' }, styles.recordPeriod)}>
            {String(item.period || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'company' }, styles.recordPrimary)}>
            {String(item.company || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'position' }, styles.recordRole)}>
            {String(item.position || '')}
          </span>
        </div>
        {'location' in item && String(item.location || '').trim() ? (
          <div {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'location' }, styles.recordMeta)}>
            {String(item.location || '')}
          </div>
        ) : null}
        {'description' in item
          ? renderRichText(String(item.description || ''), undefined, onNavigate, {
              sectionId: navigationSectionId,
              itemId,
              fieldKey: 'description',
            })
          : null}
      </article>
    )
  }

  if (section === 'projects') {
    const projectWebsite = (item.website as { url?: string; label?: string } | undefined) || {}
    return (
      <article {...getPreviewActionProps(onNavigate, articleTarget, cx(styles.item, variant === 'timeline' && styles.itemTimeline))}>
        <div className={cx(styles.recordHeader, variant === 'compact' && styles.recordHeaderCompact)}>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'period' }, styles.recordPeriod)}>
            {String(item.period || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'name' }, styles.recordPrimary)}>
            {String(item.name || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'website.label' }, styles.recordRole)}>
            {String(projectWebsite.label || '')}
          </span>
        </div>
        {'description' in item
          ? renderRichText(String(item.description || ''), undefined, onNavigate, {
              sectionId: navigationSectionId,
              itemId,
              fieldKey: 'description',
            })
          : null}
      </article>
    )
  }

  if (section === 'languages') {
    const levelPercent = toPercentLevel(item.level)
    return (
      <article {...getPreviewActionProps(onNavigate, articleTarget, cx(styles.item, variant === 'compact' && styles.itemCompact))}>
        <div className={styles.itemHeader}>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'language' }, styles.recordPrimary)}>
            {String(item.language || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'fluency' }, styles.itemMeta)}>
            {String(item.fluency || '')}
          </span>
        </div>
        {levelPercent > 0 ? (
          <div {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'level' }, styles.levelTrack)}>
            <span className={styles.levelFill} style={{ width: `${levelPercent}%` }} />
          </div>
        ) : null}
      </article>
    )
  }

  if (section === 'interests') {
    const keywords = Array.isArray(item.keywords) ? item.keywords : []
    return (
      <article {...getPreviewActionProps(onNavigate, articleTarget, styles.item)}>
        <div className={styles.itemHeader}>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'name' }, styles.recordPrimary)}>
            {String(item.name || '')}
          </span>
        </div>
        {keywords.length > 0 ? (
          <div className={styles.tagList}>
            {keywords.map(keyword => (
              <span
                key={keyword}
                {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'keywords' }, styles.tag)}
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : null}
      </article>
    )
  }

  if (section === 'awards' || section === 'certifications' || section === 'publications') {
    const detailKey = section === 'awards' ? 'awarder' : section === 'certifications' ? 'issuer' : 'publisher'
    return (
      <article {...getPreviewActionProps(onNavigate, articleTarget, styles.item)}>
        <div className={styles.recordHeaderCompact}>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'title' }, styles.recordPrimary)}>
            {String(item.title || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'date' }, styles.recordPeriod)}>
            {String(item.date || '')}
          </span>
        </div>
        <div {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: detailKey }, styles.recordMeta)}>
          {String(item[detailKey] || '')}
        </div>
        {'description' in item
          ? renderRichText(String(item.description || ''), undefined, onNavigate, {
              sectionId: navigationSectionId,
              itemId,
              fieldKey: 'description',
            })
          : null}
      </article>
    )
  }

  if (section === 'volunteer') {
    return (
      <article {...getPreviewActionProps(onNavigate, articleTarget, styles.item)}>
        <div className={styles.recordHeader}>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'period' }, styles.recordPeriod)}>
            {String(item.period || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'organization' }, styles.recordPrimary)}>
            {String(item.organization || '')}
          </span>
          <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'location' }, styles.recordRole)}>
            {String(item.location || '')}
          </span>
        </div>
        {'description' in item
          ? renderRichText(String(item.description || ''), undefined, onNavigate, {
              sectionId: navigationSectionId,
              itemId,
              fieldKey: 'description',
            })
          : null}
      </article>
    )
  }

  return (
    <article {...getPreviewActionProps(onNavigate, articleTarget, styles.item)}>
      <div className={styles.recordHeaderCompact}>
        <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: primaryFieldKey || 'name' }, styles.recordPrimary)}>
          {String(item.name || '')}
        </span>
        <span {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: secondaryFieldKey || 'position' }, styles.recordRole)}>
          {String(item.position || '')}
        </span>
      </div>
      {'phone' in item && String(item.phone || '').trim() ? (
        <div {...getPreviewActionProps(onNavigate, { sectionId: navigationSectionId, itemId, fieldKey: 'phone' }, styles.recordMeta)}>
          联系方式：{String(item.phone || '')}
        </div>
      ) : null}
      {'description' in item
        ? renderRichText(String(item.description || ''), undefined, onNavigate, {
            sectionId: navigationSectionId,
            itemId,
            fieldKey: 'description',
          })
        : null}
    </article>
  )
}

function renderCustomItem(
  type: CustomSectionType,
  item: Record<string, unknown>,
  variant: ItemVariant = 'default',
  sectionId: string = type,
  onNavigate?: ResumeReactivePreviewProps['onNavigate'],
) {
  if (item.hidden) return null
  const itemId = String(item.id || '')
  if (type === 'summary') {
    return (
      <div {...getPreviewActionProps(onNavigate, { sectionId, itemId, fieldKey: 'content' }, styles.item)}>
        {'content' in item ? renderRichText(String(item.content || ''), undefined, onNavigate, { sectionId, itemId, fieldKey: 'content' }) : null}
      </div>
    )
  }
  if (type === 'cover-letter') {
    return (
      <div {...getPreviewActionProps(onNavigate, { sectionId, itemId, fieldKey: 'content' }, styles.item)}>
        {'recipient' in item ? (
          <div {...getPreviewActionProps(onNavigate, { sectionId, itemId, fieldKey: 'recipient' }, styles.recordMeta)}>
            {String(item.recipient || '')}
          </div>
        ) : null}
        {'content' in item ? renderRichText(String(item.content || ''), undefined, onNavigate, { sectionId, itemId, fieldKey: 'content' }) : null}
      </div>
    )
  }
  return renderStandardItem(type as StandardSectionType, item, variant, onNavigate, sectionId)
}

function renderSectionHeading(
  title: string,
  sectionId: string,
  variant: HeadingVariant,
  templateClass?: string,
  onNavigate?: ResumeReactivePreviewProps['onNavigate'],
) {
  const Icon = SECTION_ICON_MAP[sectionId] || FileText
  const showIcon = variant === 'icon-line' || variant === 'pill'
  const showDivider = variant === 'icon-line' || variant === 'text-line' || variant === 'striped'

  return (
    <div
      {...getPreviewActionProps(
        onNavigate,
        { sectionId },
        cx(
          styles.sectionHeading,
          variant === 'icon-line' && styles.headingIconLine,
          variant === 'pill' && styles.headingPill,
          variant === 'text-line' && styles.headingTextLine,
          variant === 'striped' && styles.headingStriped,
          variant === 'sidebar' && styles.headingSidebar,
          variant === 'gray-tab' && styles.headingGrayTab,
          templateClass,
        ),
      )}
    >
      {showIcon ? (
        <span className={styles.sectionIcon} aria-hidden>
          <Icon size={12} strokeWidth={2} />
        </span>
      ) : null}
      <h6 className={styles.sectionTitle}>{title}</h6>
      {showDivider ? <span className={styles.sectionDivider} /> : null}
    </div>
  )
}

function renderSectionById(
  data: ResumeData,
  sectionId: string,
  options?: {
    headingVariant?: HeadingVariant
    itemVariant?: ItemVariant
    sectionClassName?: string
    sectionHeadingClassName?: string
    onNavigate?: ResumeReactivePreviewProps['onNavigate']
  },
) {
  const headingVariant = options?.headingVariant || 'icon-line'
  const itemVariant = options?.itemVariant || 'default'
  const onNavigate = options?.onNavigate

  if (sectionId === 'summary') {
    if (data.summary.hidden || !stripHtml(data.summary.content)) return null
    const summaryTitle = data.summary.title || '自我评价'
    return (
      <section className={cx(styles.section, options?.sectionClassName)} key={sectionId}>
        {renderSectionHeading(summaryTitle, sectionId, headingVariant, options?.sectionHeadingClassName, onNavigate)}
        {renderRichText(data.summary.content, undefined, onNavigate, { sectionId: 'summary', fieldKey: 'content' })}
      </section>
    )
  }

  if (isStandardSection(sectionId)) {
    const section = data.sections[sectionId]
    const visibleItems = section.items.filter(item => hasRenderableStandardItem(sectionId, item as unknown as Record<string, unknown>))
    const hasIntro = stripHtml(section.intro || '').length > 0
    if (section.hidden || (visibleItems.length === 0 && !hasIntro)) return null
    const sectionTitle = section.title || SECTION_TITLE_MAP[sectionId]

    return (
      <section className={cx(styles.section, options?.sectionClassName)} key={sectionId}>
        {renderSectionHeading(sectionTitle, sectionId, headingVariant, options?.sectionHeadingClassName, onNavigate)}
        {hasIntro ? renderRichText(section.intro, styles.sectionIntro, onNavigate, { sectionId, fieldKey: 'intro' }) : null}
        {visibleItems.length > 0 ? (
          <div className={styles.sectionContent} style={{ gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }}>
            {visibleItems.map(item => (
              <div className={styles.sectionItem} key={String(item.id)}>
                {renderStandardItem(sectionId, item as unknown as Record<string, unknown>, itemVariant, onNavigate)}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    )
  }

  const customSection = data.customSections.find(section => section.id === sectionId)
  if (!customSection || customSection.hidden) return null
  const visibleItems = customSection.items.filter(item => hasRenderableCustomItem(customSection.type, item as unknown as Record<string, unknown>))
  if (visibleItems.length === 0) return null

  return (
    <section className={cx(styles.section, options?.sectionClassName)} key={customSection.id}>
      {customSection.type !== 'cover-letter'
        ? renderSectionHeading(customSection.title || '自定义板块', customSection.id, headingVariant, options?.sectionHeadingClassName, onNavigate)
        : null}
      <div className={styles.sectionContent} style={{ gridTemplateColumns: `repeat(${customSection.columns}, minmax(0, 1fr))` }}>
        {visibleItems.map(item => (
          <div className={styles.sectionItem} key={String(item.id)}>
            {renderCustomItem(customSection.type, item as unknown as Record<string, unknown>, itemVariant, customSection.id, onNavigate)}
          </div>
        ))}
      </div>
    </section>
  )
}

function renderSectionList(
  data: ResumeData,
  sectionIds: string[],
  options?: {
    headingVariant?: HeadingVariant
    itemVariant?: ItemVariant
    sectionClassName?: string
    sectionHeadingClassName?: string
    onNavigate?: ResumeReactivePreviewProps['onNavigate']
  },
) {
  return sectionIds.map(sectionId => renderSectionById(data, sectionId, options))
}

function Avatar({
  data,
  className,
  square = false,
  sizePt,
}: {
  data: ResumeData
  className?: string
  square?: boolean
  sizePt?: number
}) {
  if (!shouldRenderAvatar(data)) return null

  const finalSize = (sizePt || data.picture.size) * AVATAR_SIZE_SCALE
  const pictureStyle: CSSProperties = {
    width: `${(finalSize * AVATAR_ASPECT_RATIO).toFixed(2)}pt`,
    height: `${finalSize}pt`,
    borderRadius: square ? '6px' : '10px',
    objectFit: 'cover',
    objectPosition: 'center center',
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={getPictureUrl(data)} alt={data.basics.name || '头像'} className={cx(styles.avatar, className)} style={pictureStyle} />
  )
}

function buildCssVariables(data: ResumeData): CSSProperties {
  const dimensions = PAGE_DIMENSIONS[data.metadata.page.format]
  const headingWeights = data.metadata.typography.heading.fontWeights.map(Number)
  const bodyWeights = data.metadata.typography.body.fontWeights.map(Number)
  const spaceScale = 1
  const primaryColor = data.metadata.design.colors.primary.trim() || '#305d90'
  const textColor = data.metadata.design.colors.text.trim() || '#1f2937'
  const bodyFontFamily = resolveResumeFontFamilyStack(data.metadata.typography.body.fontFamily)
  const headingFontFamily = resolveResumeFontFamilyStack(
    data.metadata.typography.heading.fontFamily || data.metadata.typography.body.fontFamily,
  )

  return {
    ['--page-width' as string]: dimensions.width,
    ['--page-height' as string]: data.metadata.page.format === 'free-form' ? 'auto' : dimensions.height,
    ['--page-text-color' as string]: textColor,
    ['--page-primary-color' as string]: primaryColor,
    ['--page-background-color' as string]: '#ffffff',
    ['--page-body-font-family' as string]: bodyFontFamily,
    ['--page-body-font-weight' as string]: Math.min(...bodyWeights),
    ['--page-body-font-weight-bold' as string]: Math.max(...bodyWeights),
    ['--page-body-font-size' as string]: clampToRange(
      data.metadata.typography.body.fontSize,
      RESUME_EDITOR_LIMITS.typography.bodyFontSize.min,
      RESUME_EDITOR_LIMITS.typography.bodyFontSize.max,
    ),
    ['--page-body-line-height' as string]: clampToRange(
      data.metadata.typography.body.lineHeight,
      RESUME_EDITOR_LIMITS.typography.bodyLineHeight.min,
      RESUME_EDITOR_LIMITS.typography.bodyLineHeight.max,
    ),
    ['--page-heading-font-family' as string]: headingFontFamily,
    ['--page-heading-font-weight' as string]: Math.min(...headingWeights),
    ['--page-heading-font-weight-bold' as string]: Math.max(...headingWeights),
    ['--page-heading-font-size' as string]: clampToRange(
      data.metadata.typography.heading.fontSize,
      RESUME_EDITOR_LIMITS.typography.headingFontSize.min,
      RESUME_EDITOR_LIMITS.typography.headingFontSize.max,
    ),
    ['--page-heading-line-height' as string]: clampToRange(
      data.metadata.typography.heading.lineHeight,
      RESUME_EDITOR_LIMITS.typography.headingLineHeight.min,
      RESUME_EDITOR_LIMITS.typography.headingLineHeight.max,
    ),
    ['--page-margin-x' as string]: `${clampToRange(data.metadata.page.marginX, RESUME_EDITOR_LIMITS.page.marginX.min, RESUME_EDITOR_LIMITS.page.marginX.max)}pt`,
    ['--page-margin-y' as string]: `${clampToRange(data.metadata.page.marginY, RESUME_EDITOR_LIMITS.page.marginY.min, RESUME_EDITOR_LIMITS.page.marginY.max)}pt`,
    ['--page-gap-x' as string]: `${clampToRange(data.metadata.page.gapX, RESUME_EDITOR_LIMITS.page.gapX.min, RESUME_EDITOR_LIMITS.page.gapX.max)}pt`,
    ['--page-gap-y' as string]: `${clampToRange(data.metadata.page.gapY, RESUME_EDITOR_LIMITS.page.gapY.min, RESUME_EDITOR_LIMITS.page.gapY.max)}pt`,
    ['--smart-space-scale' as string]: spaceScale,
  }
}

function collectRuntimeSectionIds(data: ResumeData) {
  const layoutSectionIds = data.metadata.layout.pages.flatMap(page => [...(page.main || []), ...(page.sidebar || [])].filter(Boolean))
  return collectVisibleSectionIds(data, layoutSectionIds)
}

interface ComposedMetricBreakdown {
  textHeightPx: number
  paddingPx: number
  borderPx: number
  marginPx: number
  totalHeightPx: number
}

interface ElementScale {
  scaleX: number
  scaleY: number
}

function parseCssPx(value: string) {
  const parsed = Number.parseFloat(value || '0')
  return Number.isFinite(parsed) ? parsed : 0
}

function resolveElementScale(element: HTMLElement): ElementScale {
  const rect = element.getBoundingClientRect()
  const layoutWidth = element.offsetWidth || element.scrollWidth || 0
  const layoutHeight = element.offsetHeight || element.scrollHeight || 0

  const rawScaleX = layoutWidth > 0 ? rect.width / layoutWidth : 1
  const rawScaleY = layoutHeight > 0 ? rect.height / layoutHeight : 1

  return {
    scaleX: Number.isFinite(rawScaleX) && rawScaleX > 0.0001 ? rawScaleX : 1,
    scaleY: Number.isFinite(rawScaleY) && rawScaleY > 0.0001 ? rawScaleY : 1,
  }
}

function collectComposedActualBlockMetrics(pageElement: HTMLElement, scaleY = 1) {
  const blockMetricsById: Record<string, ComposedMetricBreakdown> = {}
  const blockElements = pageElement.querySelectorAll<HTMLElement>('[data-composed-block-id]')

  blockElements.forEach(block => {
    const blockId = block.dataset.composedBlockId
    if (!blockId) return

    const rect = block.getBoundingClientRect()
    const blockStyles = window.getComputedStyle(block)
    const paddingPx = parseCssPx(blockStyles.paddingTop) + parseCssPx(blockStyles.paddingBottom)
    const borderPx = parseCssPx(blockStyles.borderTopWidth) + parseCssPx(blockStyles.borderBottomWidth)
    const marginPx = parseCssPx(blockStyles.marginTop) + parseCssPx(blockStyles.marginBottom)
    const layoutHeight = rect.height / (Number.isFinite(scaleY) && scaleY > 0.0001 ? scaleY : 1)
    const textHeightPx = Math.max(0, layoutHeight - paddingPx - borderPx)

    blockMetricsById[blockId] = {
      textHeightPx,
      paddingPx,
      borderPx,
      marginPx,
      totalHeightPx: layoutHeight + marginPx,
    }
  })

  return blockMetricsById
}

function areBlockMetricMapsClose(
  prev: Record<string, ComposedMetricBreakdown>,
  next: Record<string, ComposedMetricBreakdown>,
  tolerancePx = 0.5,
) {
  const prevKeys = Object.keys(prev)
  const nextKeys = Object.keys(next)
  if (prevKeys.length !== nextKeys.length) return false

  return prevKeys.every(key => {
    if (!(key in next)) return false
    const previous = prev[key]
    const current = next[key]
    return (
      Math.abs(previous.textHeightPx - current.textHeightPx) < tolerancePx &&
      Math.abs(previous.paddingPx - current.paddingPx) < tolerancePx &&
      Math.abs(previous.borderPx - current.borderPx) < tolerancePx &&
      Math.abs(previous.marginPx - current.marginPx) < tolerancePx &&
      Math.abs(previous.totalHeightPx - current.totalHeightPx) < tolerancePx
    )
  })
}

function areScalesClose(prev: ElementScale, next: ElementScale, tolerance = 0.001) {
  return Math.abs(prev.scaleX - next.scaleX) < tolerance && Math.abs(prev.scaleY - next.scaleY) < tolerance
}

export function ResumeReactivePreview({
  data,
  className,
  showPageNumbers = false,
  onNavigate,
  onHeightDebugSnapshot,
}: ResumeReactivePreviewProps) {
  const cssVars = useMemo(() => buildCssVariables(data), [data])
  const runtimeSectionIds = useMemo(() => collectRuntimeSectionIds(data), [data])
  const interactiveNavigate = onNavigate
  const isFixedFormat = data.metadata.page.format !== 'free-form'
  const supportsMeasuredFlow = supportsMeasuredTemplatePagination(data.metadata.template)
  const composedContentMetrics = useMemo(
    () => (supportsMeasuredFlow ? resolveTemplateContentMetrics(data) : null),
    [data, supportsMeasuredFlow],
  )
  const composedPredictedContentWidthPx = composedContentMetrics?.contentWidthPx || 0
  const composedPredictedContentMaxHeightPx = composedContentMetrics?.contentMaxHeightPx ?? null
  const pageRef = useRef<HTMLDivElement | null>(null)
  const [composedActualContentHeightPx, setComposedActualContentHeightPx] = useState(0)
  const [composedPageViewportHeightPx, setComposedPageViewportHeightPx] = useState(0)
  const [composedFlowScale, setComposedFlowScale] = useState<ElementScale>({ scaleX: 1, scaleY: 1 })
  const [composedActualBlockMetricsById, setComposedActualBlockMetricsById] = useState<Record<string, ComposedMetricBreakdown>>({})
  const renderer = COMPOSED_TEMPLATE_RENDERER

  const templateHelpers = useMemo<RuntimeTemplateHelpers>(
    () => ({
      styles,
      cx,
      extractResumeFacts: data => extractResumeFacts(data),
      resolvePersonalLocation: facts => resolvePersonalLocation(facts),
      resolveLocationFieldKey: data => resolveLocationFieldKey(data),
      resolveWebsiteFieldKey: data => resolveWebsiteFieldKey(data),
      hasMeaningfulText: value => hasMeaningfulText(value),
      getPreviewActionProps: (navigate, target, className) => getPreviewActionProps(navigate, target, className),
      renderSectionList: (data, sectionIds, options) => renderSectionList(data, sectionIds, options),
      renderInlineTargetList: (items, navigate) => renderInlineTargetList(items, navigate),
      renderRichText: (content, className, navigate, target) => renderRichText(content, className, navigate, target),
      resolveStandardSectionTitle: (data, sectionId) => resolveStandardSectionTitle(data, sectionId),
      resolveTemplate8SkillPercent: (level, proficiency) => resolveTemplate8SkillPercent(level, proficiency),
      resolveTemplate8SkillLabel: (proficiency, percent) => resolveTemplate8SkillLabel(proficiency, percent),
      hasRenderableStandardItem: (sectionId, item) => hasRenderableStandardItem(sectionId, item),
      stripHtml: text => stripHtml(text),
      Avatar: props => <Avatar {...props} />,
    }),
    [],
  )

  useEffect(() => {
    if (!supportsMeasuredFlow) {
      setComposedActualContentHeightPx(0)
      setComposedPageViewportHeightPx(0)
      setComposedFlowScale({ scaleX: 1, scaleY: 1 })
      setComposedActualBlockMetricsById({})
      return
    }

    const pageElement = pageRef.current
    if (!pageElement || typeof MutationObserver === 'undefined') return

    let frame = 0
    let observedFlow: HTMLElement | null = null
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => scheduleUpdate())

    const update = () => {
      const flow = pageElement.querySelector<HTMLElement>('[data-composed-flow="true"]')
      if (!flow) return

      if (resizeObserver && observedFlow !== flow) {
        if (observedFlow) resizeObserver.unobserve(observedFlow)
        resizeObserver.observe(flow)
        observedFlow = flow
      }

      const rect = flow.getBoundingClientRect()
      const scale = resolveElementScale(flow)
      const unscaledHeight = rect.height / scale.scaleY
      const pageScale = resolveElementScale(pageElement)
      const pageRect = pageElement.getBoundingClientRect()
      const pageViewportHeight = pageRect.height / pageScale.scaleY

      setComposedFlowScale(prev => (areScalesClose(prev, scale) ? prev : scale))
      setComposedActualContentHeightPx(prev => (Math.abs(prev - unscaledHeight) < 0.5 ? prev : unscaledHeight))
      setComposedPageViewportHeightPx(prev => (Math.abs(prev - pageViewportHeight) < 0.5 ? prev : pageViewportHeight))

      const nextBlockMetricsById = collectComposedActualBlockMetrics(pageElement, scale.scaleY)
      setComposedActualBlockMetricsById(prev => (
        areBlockMetricMapsClose(prev, nextBlockMetricsById) ? prev : nextBlockMetricsById
      ))
    }

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    resizeObserver?.observe(pageElement)

    const mutationObserver = new MutationObserver(() => scheduleUpdate())
    mutationObserver.observe(pageElement, {
      subtree: true,
      childList: true,
      attributes: true,
    })

    scheduleUpdate()

    return () => {
      cancelAnimationFrame(frame)
      mutationObserver.disconnect()
      resizeObserver?.disconnect()
    }
  }, [data, supportsMeasuredFlow, runtimeSectionIds, renderer])

  const composedHeightEstimate = useMemo(() => {
    if (!supportsMeasuredFlow || composedPredictedContentWidthPx <= 1) return null
    return estimateCurrentTemplateHeight({
      data,
      sectionIds: runtimeSectionIds,
      contentWidthPx: composedPredictedContentWidthPx,
    })
  }, [data, supportsMeasuredFlow, runtimeSectionIds, composedPredictedContentWidthPx])
  const estimatedPages = useMemo(() => {
    if (!supportsMeasuredFlow || !isFixedFormat || composedPredictedContentWidthPx <= 1) {
      return [
        {
          pageIndex: 0,
          sectionIds: runtimeSectionIds,
          pageBlocks: [],
          includesHeader: true,
        },
      ]
    }

    const pagination = estimateCurrentTemplatePages({
      data,
      sectionIds: runtimeSectionIds,
      contentWidthPx: composedPredictedContentWidthPx,
    })

    return pagination.pages.length > 0
      ? pagination.pages
      : [
          {
            pageIndex: 0,
            sectionIds: runtimeSectionIds,
            pageBlocks: [],
            includesHeader: true,
          },
        ]
  }, [data, supportsMeasuredFlow, isFixedFormat, runtimeSectionIds, composedPredictedContentWidthPx])

  const composedBlockDebugRows = useMemo(() => {
    if (!composedHeightEstimate) return []
    return composedHeightEstimate.blockHeights.map(block => {
      const actual = composedActualBlockMetricsById[block.id] || null
      return {
        id: block.id,
        sectionId: block.sectionId,
        predicted: {
          textHeightPx: block.textHeightPx ?? block.contentHeightPx,
          paddingPx: block.paddingPx ?? 0,
          borderPx: block.borderPx ?? 0,
          marginPx: block.marginPx ?? block.marginBottomPx ?? 0,
          totalHeightPx: block.totalHeightPx,
        },
        actual,
      }
    })
  }, [composedHeightEstimate, composedActualBlockMetricsById])

  const composedComponentSummary = useMemo(() => {
    return composedBlockDebugRows.reduce(
      (acc, row) => {
        if (row.actual) {
          acc.predicted.textHeightPx += row.predicted.textHeightPx
          acc.predicted.paddingPx += row.predicted.paddingPx
          acc.predicted.borderPx += row.predicted.borderPx
          acc.predicted.marginPx += row.predicted.marginPx
          acc.predicted.totalHeightPx += row.predicted.totalHeightPx

          acc.actual.textHeightPx += row.actual.textHeightPx
          acc.actual.paddingPx += row.actual.paddingPx
          acc.actual.borderPx += row.actual.borderPx
          acc.actual.marginPx += row.actual.marginPx
          acc.actual.totalHeightPx += row.actual.totalHeightPx
          acc.measuredBlocks += 1
        }

        return acc
      },
      {
        measuredBlocks: 0,
        predicted: {
          textHeightPx: 0,
          paddingPx: 0,
          borderPx: 0,
          marginPx: 0,
          totalHeightPx: 0,
        },
        actual: {
          textHeightPx: 0,
          paddingPx: 0,
          borderPx: 0,
          marginPx: 0,
          totalHeightPx: 0,
        },
      },
    )
  }, [composedBlockDebugRows])

  const composedHeightDeltaPx =
    composedHeightEstimate && composedActualContentHeightPx > 0
      ? composedHeightEstimate.predictedHeightPx - composedActualContentHeightPx
      : 0
  const composedOverflowPx =
    composedActualContentHeightPx > 0 && composedPageViewportHeightPx > 0
      ? composedActualContentHeightPx - composedPageViewportHeightPx
      : 0
  const composedContentMaxOverflowPx =
    composedActualContentHeightPx > 0 && Number.isFinite(composedPredictedContentMaxHeightPx)
      ? composedActualContentHeightPx - (composedPredictedContentMaxHeightPx as number)
      : null

  const pageCount = estimatedPages.length
  const heightDebugSnapshot = useMemo<HeightDebugSnapshot>(() => ({
    available: supportsMeasuredFlow && pageCount === 1,
    pageCount,
    reason: !supportsMeasuredFlow ? 'unsupported-template' : pageCount === 1 ? undefined : 'multi-page',
    predictedHeightPx: composedHeightEstimate?.predictedHeightPx ?? null,
    actualContentHeightPx: composedActualContentHeightPx,
    heightDeltaPx: composedHeightEstimate ? composedHeightDeltaPx : null,
    pageViewportHeightPx: composedPageViewportHeightPx,
    contentMaxHeightPx: composedPredictedContentMaxHeightPx,
    overflowPx: composedPageViewportHeightPx > 0 ? composedOverflowPx : null,
    contentMaxOverflowPx: composedContentMaxOverflowPx,
    scaleX: composedFlowScale.scaleX,
    scaleY: composedFlowScale.scaleY,
    blockCount: composedHeightEstimate ? composedHeightEstimate.blockHeights.length : 0,
    measuredBlocks: composedComponentSummary.measuredBlocks,
    textDeltaPx: composedComponentSummary.predicted.textHeightPx - composedComponentSummary.actual.textHeightPx,
    paddingDeltaPx: composedComponentSummary.predicted.paddingPx - composedComponentSummary.actual.paddingPx,
    borderDeltaPx: composedComponentSummary.predicted.borderPx - composedComponentSummary.actual.borderPx,
    marginDeltaPx: composedComponentSummary.predicted.marginPx - composedComponentSummary.actual.marginPx,
    rows: composedBlockDebugRows,
  }), [
    composedActualContentHeightPx,
    composedBlockDebugRows,
    composedComponentSummary.actual.borderPx,
    composedComponentSummary.actual.marginPx,
    composedComponentSummary.actual.paddingPx,
    composedComponentSummary.actual.textHeightPx,
    composedComponentSummary.measuredBlocks,
    composedComponentSummary.predicted.borderPx,
    composedComponentSummary.predicted.marginPx,
    composedComponentSummary.predicted.paddingPx,
    composedComponentSummary.predicted.textHeightPx,
    composedContentMaxOverflowPx,
    composedFlowScale.scaleX,
    composedFlowScale.scaleY,
    composedHeightDeltaPx,
    composedHeightEstimate,
    composedOverflowPx,
    composedPageViewportHeightPx,
    composedPredictedContentMaxHeightPx,
    pageCount,
    supportsMeasuredFlow,
  ])

  useEffect(() => {
    onHeightDebugSnapshot?.(heightDebugSnapshot)
  }, [heightDebugSnapshot, onHeightDebugSnapshot])

  const pageNodes = estimatedPages.map(page => (
    <div
      key={`page-${page.pageIndex}-${page.pageBlocks.map(block => `${block.blockId}:${block.rowStart}-${block.rowEnd}`).join('|') || page.sectionIds.join('|') || 'empty'}`}
      ref={page.pageIndex === 0 ? pageRef : null}
      className={cx(styles.page, isFixedFormat && styles.pageFixed)}
      data-template={data.metadata.template}
    >
      {renderer({
        data,
        pageIndex: page.pageIndex,
        sectionIds: page.sectionIds,
        pageBlocks: page.pageBlocks,
        onNavigate: interactiveNavigate,
      }, templateHelpers)}

      {showPageNumbers ? (
        <div className={styles.pageNumber}>
          {page.pageIndex + 1}/{pageCount}
        </div>
      ) : null}
    </div>
  ))

  return (
    <div
      className={cx(
        styles.previewRoot,
        styles.previewFramelessMode,
        'resume-preview-root',
        className,
      )}
      style={cssVars}
    >
      {pageNodes}
    </div>
  )
}
