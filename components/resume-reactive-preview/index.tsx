'use client'

import { Fragment, type CSSProperties, type HTMLAttributes, type ReactElement, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { sanitizeCss, sanitizeHtml } from '@/lib/resume/sanitize'
import { RESUME_EDITOR_LIMITS, clampToRange } from '@/lib/resume/editor-limits'
import {
  type CustomSectionType,
  type ReactiveTemplateId,
  type ResumeData,
  type StandardSectionType,
} from '@/lib/resume/types'
import {
  Award,
  AlertCircle,
  BadgeCheck,
  BookText,
  BriefcaseBusiness,
  Cake,
  CalendarDays,
  FileText,
  FolderKanban,
  Globe,
  GraduationCap,
  HandHeart,
  Heart,
  Languages,
  Mail,
  MapPin,
  Phone,
  Ruler,
  type LucideIcon,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react'
import styles from './preview.module.css'

interface ResumeReactivePreviewProps {
  data: ResumeData
  className?: string
  showPageNumbers?: boolean
  mode?: 'editor' | 'export'
  onNavigate?: (target: PreviewNavigationTarget) => void
}

export interface PreviewNavigationTarget {
  sectionId: string
  itemId?: string
  fieldKey?: string
}

interface TemplateRenderContext {
  data: ResumeData
  pageIndex: number
  sectionIds: string[]
  onNavigate?: (target: PreviewNavigationTarget) => void
}

type TemplateRenderer = (context: TemplateRenderContext) => ReactElement

type HeadingVariant = 'icon-line' | 'pill' | 'text-line' | 'striped' | 'sidebar' | 'gray-tab'
type ItemVariant = 'compact' | 'default' | 'timeline'

const PAGE_DIMENSIONS: Record<'a4' | 'letter' | 'free-form', { width: string; height: string }> = {
  a4: { width: '210mm', height: '297mm' },
  letter: { width: '216mm', height: '279mm' },
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

const SIDEBAR_SECTION_IDS = new Set(['skills', 'languages', 'interests', 'profiles', 'certifications', 'awards', 'publications'])
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

function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, '').trim()
}

function hasTextValue(value: unknown) {
  return String(value || '').trim().length > 0
}

function hasRenderableStandardItem(sectionId: StandardSectionType, item: Record<string, unknown>) {
  if (item.hidden) return false

  switch (sectionId) {
    case 'profiles':
      return (
        hasTextValue(item.network) ||
        hasTextValue(item.username) ||
        hasTextValue((item.website as { url?: string; label?: string } | undefined)?.url) ||
        hasTextValue((item.website as { url?: string; label?: string } | undefined)?.label)
      )
    case 'experience':
      return (
        hasTextValue(item.company) ||
        hasTextValue(item.position) ||
        hasTextValue(item.location) ||
        hasTextValue(item.period) ||
        hasTextValue(stripHtml(String(item.description || '')))
      )
    case 'education':
      return (
        hasTextValue(item.school) ||
        hasTextValue(item.degree) ||
        hasTextValue(item.area) ||
        hasTextValue(item.grade) ||
        hasTextValue(item.location) ||
        hasTextValue(item.period) ||
        hasTextValue(stripHtml(String(item.description || '')))
      )
    case 'projects':
      return (
        hasTextValue(item.name) ||
        hasTextValue(item.period) ||
        hasTextValue((item.website as { url?: string; label?: string } | undefined)?.url) ||
        hasTextValue((item.website as { url?: string; label?: string } | undefined)?.label) ||
        hasTextValue(stripHtml(String(item.description || '')))
      )
    case 'skills':
      return false
    case 'languages':
      return hasTextValue(item.language) || hasTextValue(item.fluency) || Number(item.level || 0) > 0
    case 'interests':
      return hasTextValue(item.name) || (Array.isArray(item.keywords) && item.keywords.length > 0)
    case 'awards':
    case 'certifications':
    case 'publications':
      return hasTextValue(item.title) || hasTextValue(item.date) || hasTextValue(stripHtml(String(item.description || '')))
    case 'volunteer':
      return hasTextValue(item.organization) || hasTextValue(item.location) || hasTextValue(item.period) || hasTextValue(stripHtml(String(item.description || '')))
    case 'references':
      return hasTextValue(item.name) || hasTextValue(item.position) || hasTextValue(item.phone) || hasTextValue(stripHtml(String(item.description || '')))
    default:
      return false
  }
}

function hasRenderableCustomItem(type: CustomSectionType, item: Record<string, unknown>) {
  if (item.hidden) return false
  if (type === 'summary' || type === 'cover-letter') {
    return hasTextValue(stripHtml(String(item.content || ''))) || hasTextValue(item.recipient)
  }
  return hasRenderableStandardItem(type as StandardSectionType, item)
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

function getVisibleSections(data: ResumeData, sectionIds: string[]) {
  return sectionIds.filter(sectionId => {
    if (sectionId === 'summary') {
      return !data.summary.hidden && stripHtml(data.summary.content).length > 0
    }

    if (isStandardSection(sectionId)) {
      const section = data.sections[sectionId]
      return (
        !section.hidden &&
        (
          section.items.some(item => hasRenderableStandardItem(sectionId, item as unknown as Record<string, unknown>)) ||
          stripHtml(section.intro || '').length > 0
        )
      )
    }

    const custom = data.customSections.find(item => item.id === sectionId)
    if (!custom || custom.hidden) return false
    return custom.items.some(item => hasRenderableCustomItem(custom.type, item as unknown as Record<string, unknown>))
  })
}

function getOrderedSectionIds(data: ResumeData, sectionIds: string[]) {
  const canonical = ['summary', ...Object.keys(data.sections), ...data.customSections.map(section => section.id)]
  const known = new Set(canonical)
  const base = Array.from(new Set(sectionIds.filter(sectionId => known.has(sectionId))))
  const missing = canonical.filter(sectionId => !base.includes(sectionId))
  return [...base, ...missing]
}

function splitSectionsForSidebar(sectionIds: string[]) {
  const sidebar: string[] = []
  const main: string[] = []
  sectionIds.forEach(sectionId => {
    if (SIDEBAR_SECTION_IDS.has(sectionId)) {
      sidebar.push(sectionId)
    } else {
      main.push(sectionId)
    }
  })
  return { sidebar, main }
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

function Template1({ data, sectionIds, onNavigate }: TemplateRenderContext) {
  const facts = extractResumeFacts(data)
  const personalLocation = resolvePersonalLocation(facts)
  const visible = getVisibleSections(data, sectionIds)
  const { sidebar, main } = splitSectionsForSidebar(visible)
  const sidebarInfo: Array<{ icon: LucideIcon; value: string; fieldKey: string }> = [
    { icon: CalendarDays, value: facts.age, fieldKey: 'birthDate' },
    { icon: Cake, value: facts.birthDate, fieldKey: 'birthDate' },
    { icon: UserRound, value: facts.gender, fieldKey: 'gender' },
    { icon: Heart, value: facts.maritalStatus, fieldKey: 'maritalStatus' },
    { icon: Users, value: facts.ethnicity, fieldKey: 'ethnicity' },
    { icon: BadgeCheck, value: facts.politicalStatus, fieldKey: 'politicalStatus' },
    { icon: MapPin, value: personalLocation, fieldKey: resolveLocationFieldKey(data) },
    { icon: Ruler, value: facts.height, fieldKey: 'heightCm' },
    { icon: Ruler, value: facts.weight, fieldKey: 'weightKg' },
    { icon: BriefcaseBusiness, value: facts.experience, fieldKey: 'workYears' },
    { icon: Phone, value: data.basics.phone, fieldKey: 'phone' },
    { icon: Mail, value: data.basics.email, fieldKey: 'email' },
    { icon: Globe, value: facts.website, fieldKey: resolveWebsiteFieldKey(data) },
  ].filter(item => hasMeaningfulText(item.value))
  const intentionItems = [
    { label: '求职意向', value: facts.position, fieldKey: 'intentionPosition' },
    { label: '意向城市', value: facts.targetCity, fieldKey: 'intentionCity' },
    { label: '期望薪资', value: facts.salary, fieldKey: 'intentionSalary' },
    { label: '入职时间', value: facts.availability, fieldKey: 'intentionAvailability' },
  ].filter(item => hasMeaningfulText(item.value))
  return (
    <div className={styles.template1}>
      <aside className={styles.t1Sidebar}>
        <div {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' }, styles.t1AvatarWrap)}>
          <Avatar data={data} className={styles.t1Avatar} square sizePt={66} />
        </div>

        <div className={styles.t1SidebarInfo}>
          {sidebarInfo.map(item => (
            <div
              key={`${item.icon.displayName || item.icon.name}-${item.value}`}
              {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey }, styles.t1SidebarInfoItem)}
            >
              <span className={styles.t1SidebarInfoIcon}>
                <item.icon size={12} />
              </span>
              <span>{item.value}</span>
            </div>
          ))}
        </div>

        <div className={styles.t1SidebarSections}>
          {renderSectionList(data, sidebar, {
            headingVariant: 'sidebar',
            itemVariant: 'compact',
            sectionHeadingClassName: styles.t1SidebarHeading,
            sectionClassName: styles.t1SidebarSection,
            onNavigate,
          })}
        </div>
      </aside>

      <main className={styles.t1Main}>
        <div className={styles.t1MainHeader}>
          <h1 {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '全民简历'}</h1>
          {intentionItems.length > 0 ? (
            <div className={styles.t1IntentGrid}>
              {intentionItems.map(item => (
                <div
                  key={item.label}
                  {...getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: item.fieldKey }, styles.t1IntentItem)}
                >
                  <span>{item.label}：</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.templateMain}>
          {renderSectionList(data, main, {
            headingVariant: 'icon-line',
            itemVariant: 'compact',
            sectionHeadingClassName: styles.t1MainHeading,
            onNavigate,
          })}
        </div>
      </main>
    </div>
  )
}

function Template2({ data, sectionIds, onNavigate }: TemplateRenderContext) {
  const facts = extractResumeFacts(data)
  const personalLocation = resolvePersonalLocation(facts)
  const basicFields = [
    { label: '姓 名', value: data.basics.name || '全民简历', fieldKey: 'name', sectionId: 'basics' },
    { label: '出生年月', value: facts.birthDate, fieldKey: 'birthDate', sectionId: 'basics' },
    { label: '年 龄', value: facts.age, fieldKey: 'birthDate', sectionId: 'basics' },
    { label: '性 别', value: facts.gender, fieldKey: 'gender', sectionId: 'basics' },
    { label: '婚姻状况', value: facts.maritalStatus, fieldKey: 'maritalStatus', sectionId: 'basics' },
    { label: '民 族', value: facts.ethnicity, fieldKey: 'ethnicity', sectionId: 'basics' },
    { label: '政治面貌', value: facts.politicalStatus, fieldKey: 'politicalStatus', sectionId: 'basics' },
    { label: '身 高', value: facts.height, fieldKey: 'heightCm', sectionId: 'basics' },
    { label: '体 重', value: facts.weight, fieldKey: 'weightKg', sectionId: 'basics' },
    { label: '籍 贯', value: personalLocation, fieldKey: resolveLocationFieldKey(data), sectionId: 'basics' },
    { label: '工作年限', value: facts.experience, fieldKey: 'workYears', sectionId: 'basics' },
    { label: '求职岗位', value: facts.position, fieldKey: 'intentionPosition', sectionId: 'intention' },
    { label: '电 话', value: data.basics.phone, fieldKey: 'phone', sectionId: 'basics' },
    { label: '邮 箱', value: data.basics.email, fieldKey: 'email', sectionId: 'basics' },
    { label: '网 站', value: facts.website, fieldKey: resolveWebsiteFieldKey(data), sectionId: 'basics' },
  ].filter(item => item.label === '姓 名' || hasMeaningfulText(String(item.value || '')))

  return (
    <div className={styles.template2}>
      <div className={styles.t2Header}>
        <div className={styles.t2HeaderTitle}>
          <h1>个人简历</h1>
          <span className={styles.t2HeaderDivider} />
          <div className={styles.t2HeaderSubtitle}>
            <span>细心从每一个细节开始</span>
            <strong>求职简历</strong>
          </div>
        </div>

        <div className={styles.t2HeaderActions}>
          <span className={styles.t2ActionIcon}>
            <Mail size={12} />
          </span>
          <span className={styles.t2ActionIcon}>
            <BriefcaseBusiness size={12} />
          </span>
        </div>
      </div>

      <div className={styles.t2Ribbon}>
        <span className={styles.t2RibbonLabel}>基本信息</span>
      </div>

      <section className={styles.t2Basics}>
        <div className={styles.t2BasicsGrid}>
          {basicFields.map(item => (
            <div
              key={item.label}
              {...getPreviewActionProps(onNavigate, { sectionId: item.sectionId, fieldKey: item.fieldKey }, styles.t2BasicItem)}
            >
              <span>{item.label}：</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <div {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t2Avatar} square sizePt={58} />
        </div>
      </section>

      <div className={styles.templateMain}>
        {renderSectionList(data, sectionIds, {
          headingVariant: 'striped',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t2Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

function Template3({ data, sectionIds, onNavigate }: TemplateRenderContext) {
  const facts = extractResumeFacts(data)
  const personalLocation = resolvePersonalLocation(facts)
  const headline = String(data.basics.headline || '').trim()
  const intentionItems = [
    { key: 'position', value: facts.position, target: { sectionId: 'intention', fieldKey: 'intentionPosition' } },
    { key: 'target-city', value: facts.targetCity, target: { sectionId: 'intention', fieldKey: 'intentionCity' } },
    { key: 'salary', value: facts.salary, target: { sectionId: 'intention', fieldKey: 'intentionSalary' } },
    { key: 'availability', value: facts.availability, target: { sectionId: 'intention', fieldKey: 'intentionAvailability' } },
  ]
  const infoItems: Array<{ icon: LucideIcon; label: string; value: string; fieldKey: string }> = [
    { icon: Cake, label: '出生年月', value: facts.birthDate, fieldKey: 'birthDate' },
    { icon: CalendarDays, label: '年 龄', value: facts.age, fieldKey: 'birthDate' },
    { icon: UserRound, label: '性 别', value: facts.gender, fieldKey: 'gender' },
    { icon: Heart, label: '婚姻状况', value: facts.maritalStatus, fieldKey: 'maritalStatus' },
    { icon: Users, label: '民 族', value: facts.ethnicity, fieldKey: 'ethnicity' },
    { icon: BadgeCheck, label: '政治面貌', value: facts.politicalStatus, fieldKey: 'politicalStatus' },
    { icon: MapPin, label: '籍 贯', value: personalLocation, fieldKey: resolveLocationFieldKey(data) },
    { icon: Ruler, label: '身 高', value: facts.height, fieldKey: 'heightCm' },
    { icon: Ruler, label: '体 重', value: facts.weight, fieldKey: 'weightKg' },
    { icon: BriefcaseBusiness, label: '工作年限', value: facts.experience, fieldKey: 'workYears' },
    { icon: Phone, label: '电 话', value: data.basics.phone, fieldKey: 'phone' },
    { icon: Mail, label: '邮 箱', value: data.basics.email, fieldKey: 'email' },
    { icon: Globe, label: '网 站', value: facts.website, fieldKey: resolveWebsiteFieldKey(data) },
  ].filter(item => hasMeaningfulText(item.value))

  return (
    <div className={styles.template3}>
      <div className={styles.t3Header}>
        <div className={styles.t3HeaderMain}>
          <h1 {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '全民简历'}</h1>
          {headline ? (
            <p {...getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: 'intentionPosition' }, styles.t3Subtitle)}>
              {headline}
            </p>
          ) : null}
          {intentionItems.some(item => hasMeaningfulText(item.value)) ? (
            <p className={styles.t3IntentLine}>
              <span>求职意向：</span>
              <strong>{renderInlineTargetList(intentionItems, onNavigate)}</strong>
            </p>
          ) : null}

          {infoItems.length > 0 ? (
            <div className={styles.t3InfoGrid}>
              {infoItems.map(item => (
                <div
                  key={item.label}
                  {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey }, styles.t3InfoItem)}
                >
                  <item.icon size={12} />
                  <span>{item.label}：</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t3Avatar} square sizePt={64} />
        </div>
      </div>

      <div className={styles.t3Body}>
        {renderSectionList(data, sectionIds, {
          headingVariant: 'icon-line',
          itemVariant: 'timeline',
          sectionHeadingClassName: styles.t3Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

function Template4({ data, sectionIds, onNavigate }: TemplateRenderContext) {
  const facts = extractResumeFacts(data)
  const personalLocation = resolvePersonalLocation(facts)
  const intentionItems = [
    { key: 'position', value: facts.position, target: { sectionId: 'intention', fieldKey: 'intentionPosition' } },
    { key: 'target-city', value: facts.targetCity, target: { sectionId: 'intention', fieldKey: 'intentionCity' } },
    { key: 'salary', value: facts.salary, target: { sectionId: 'intention', fieldKey: 'intentionSalary' } },
    { key: 'availability', value: facts.availability, target: { sectionId: 'intention', fieldKey: 'intentionAvailability' } },
  ]
  const profileItems = [
    { key: 'birth', value: facts.birthDate, target: { sectionId: 'basics', fieldKey: 'birthDate' } },
    { key: 'age', value: facts.age, target: { sectionId: 'basics', fieldKey: 'birthDate' } },
    { key: 'gender', value: facts.gender, target: { sectionId: 'basics', fieldKey: 'gender' } },
    { key: 'marital', value: facts.maritalStatus, target: { sectionId: 'basics', fieldKey: 'maritalStatus' } },
    { key: 'ethnicity', value: facts.ethnicity, target: { sectionId: 'basics', fieldKey: 'ethnicity' } },
    { key: 'political', value: facts.politicalStatus, target: { sectionId: 'basics', fieldKey: 'politicalStatus' } },
  ]
  const profileExtraItems = [
    { key: 'location', value: personalLocation, target: { sectionId: 'basics', fieldKey: resolveLocationFieldKey(data) } },
    { key: 'height', value: facts.height, target: { sectionId: 'basics', fieldKey: 'heightCm' } },
    { key: 'weight', value: facts.weight, target: { sectionId: 'basics', fieldKey: 'weightKg' } },
    { key: 'experience', value: facts.experience, target: { sectionId: 'basics', fieldKey: 'workYears' } },
  ]
  const contactItems = [
    { key: 'phone', value: data.basics.phone, target: { sectionId: 'basics', fieldKey: 'phone' } },
    { key: 'email', value: data.basics.email, target: { sectionId: 'basics', fieldKey: 'email' } },
    { key: 'website', value: facts.website, target: { sectionId: 'basics', fieldKey: resolveWebsiteFieldKey(data) } },
  ]

  return (
    <div className={styles.template4}>
      <div className={styles.t4Header}>
        <div className={styles.t4TitleLine}>
          <h1 {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '全民简历'}</h1>
        </div>
        {intentionItems.some(item => hasMeaningfulText(item.value)) ? <p>{renderInlineTargetList(intentionItems, onNavigate)}</p> : null}
        {profileItems.some(item => hasMeaningfulText(item.value)) ? <p>{renderInlineTargetList(profileItems, onNavigate)}</p> : null}
        {profileExtraItems.some(item => hasMeaningfulText(item.value)) ? <p>{renderInlineTargetList(profileExtraItems, onNavigate)}</p> : null}
        {contactItems.some(item => hasMeaningfulText(item.value)) ? <p>{renderInlineTargetList(contactItems, onNavigate)}</p> : null}
        <div {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t4Avatar} square sizePt={62} />
        </div>
      </div>

      <div className={styles.templateMain}>
        {renderSectionList(data, sectionIds, {
          headingVariant: 'text-line',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t4Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

function Template5({ data, sectionIds, onNavigate }: TemplateRenderContext) {
  const facts = extractResumeFacts(data)
  const personalLocation = resolvePersonalLocation(facts)
  const profileItems = [
    { key: facts.age ? 'age' : 'birth', value: facts.age || facts.birthDate, target: { sectionId: 'basics', fieldKey: 'birthDate' } },
    { key: 'gender', value: facts.gender, target: { sectionId: 'basics', fieldKey: 'gender' } },
    { key: 'marital', value: facts.maritalStatus, target: { sectionId: 'basics', fieldKey: 'maritalStatus' } },
    { key: 'ethnicity', value: facts.ethnicity, target: { sectionId: 'basics', fieldKey: 'ethnicity' } },
    { key: 'political', value: facts.politicalStatus, target: { sectionId: 'basics', fieldKey: 'politicalStatus' } },
  ]
  const profileExtraItems = [
    { key: 'height', value: facts.height, target: { sectionId: 'basics', fieldKey: 'heightCm' } },
    { key: 'weight', value: facts.weight, target: { sectionId: 'basics', fieldKey: 'weightKg' } },
    { key: 'location', value: personalLocation, target: { sectionId: 'basics', fieldKey: resolveLocationFieldKey(data) } },
    { key: 'position', value: facts.position, target: { sectionId: 'intention', fieldKey: 'intentionPosition' } },
    { key: 'experience', value: facts.experience, target: { sectionId: 'basics', fieldKey: 'workYears' } },
  ]
  const contactItems = [
    { icon: Phone, label: '电话', value: data.basics.phone, fieldKey: 'phone' },
    { icon: Mail, label: '邮箱', value: data.basics.email, fieldKey: 'email' },
    { icon: Globe, label: '网站', value: facts.website, fieldKey: resolveWebsiteFieldKey(data) },
  ].filter(item => hasMeaningfulText(item.value))

  return (
    <div className={styles.template5}>
      <div className={styles.t5Header}>
        <div className={styles.t5HeaderMain}>
          <h1 {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '全民简历'}</h1>
          {profileItems.some(item => hasMeaningfulText(item.value)) ? <p>{renderInlineTargetList(profileItems, onNavigate)}</p> : null}
          {profileExtraItems.some(item => hasMeaningfulText(item.value)) ? <p>{renderInlineTargetList(profileExtraItems, onNavigate)}</p> : null}
          {contactItems.length > 0 ? (
            <div className={styles.t5Contact}>
              {contactItems.map(item => (
                <span
                  key={item.label}
                  {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey })}
                >
                  <item.icon size={11} />
                  {item.label}：{item.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t5Avatar} square sizePt={62} />
        </div>
      </div>

      <div className={styles.t5Body}>
        {renderSectionList(data, sectionIds, {
          headingVariant: 'text-line',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t5Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

function Template6({ data, sectionIds, onNavigate }: TemplateRenderContext) {
  const facts = extractResumeFacts(data)
  const personalLocation = resolvePersonalLocation(facts)
  const intentFields = [
    { label: '求职意向', value: facts.position, fieldKey: 'intentionPosition' },
    { label: '意向城市', value: facts.targetCity, fieldKey: 'intentionCity' },
    { label: '期望薪资', value: facts.salary, fieldKey: 'intentionSalary' },
    { label: '入职时间', value: facts.availability, fieldKey: 'intentionAvailability' },
  ].filter(item => hasMeaningfulText(item.value))
  const infoItems: Array<{ icon: LucideIcon; value: string; fieldKey: string }> = [
    { icon: Cake, value: facts.birthDate, fieldKey: 'birthDate' },
    { icon: CalendarDays, value: facts.age, fieldKey: 'birthDate' },
    { icon: UserRound, value: facts.gender, fieldKey: 'gender' },
    { icon: Heart, value: facts.maritalStatus, fieldKey: 'maritalStatus' },
    { icon: Users, value: facts.ethnicity, fieldKey: 'ethnicity' },
    { icon: BadgeCheck, value: facts.politicalStatus, fieldKey: 'politicalStatus' },
    { icon: MapPin, value: personalLocation, fieldKey: resolveLocationFieldKey(data) },
    { icon: Ruler, value: facts.height, fieldKey: 'heightCm' },
    { icon: Ruler, value: facts.weight, fieldKey: 'weightKg' },
    { icon: BriefcaseBusiness, value: facts.experience, fieldKey: 'workYears' },
    { icon: Phone, value: data.basics.phone, fieldKey: 'phone' },
    { icon: Mail, value: data.basics.email, fieldKey: 'email' },
    { icon: Globe, value: facts.website, fieldKey: resolveWebsiteFieldKey(data) },
  ].filter(item => hasMeaningfulText(item.value))

  return (
    <div className={styles.template6}>
      <div className={styles.t6Header}>
        <div className={styles.t6HeaderMain}>
          <h1 {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '全民简历'}</h1>
          {intentFields.length > 0 ? (
            <div className={styles.t6IntentGrid}>
              {intentFields.map(item => (
                <div
                  key={item.label}
                  {...getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: item.fieldKey }, styles.t6IntentItem)}
                >
                  <span>{item.label}：</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {infoItems.length > 0 ? (
          <div className={styles.t6InfoGrid}>
            {infoItems.map(item => (
              <div
                key={`${item.icon.displayName || item.icon.name}-${item.value}`}
                {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey }, styles.t6InfoItem)}
              >
                <item.icon size={12} />
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        <div {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t6Avatar} square sizePt={62} />
        </div>
      </div>

      <div className={styles.t6Body}>
        {renderSectionList(data, sectionIds, {
          headingVariant: 'icon-line',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t6Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

function Template7({ data, sectionIds, onNavigate }: TemplateRenderContext) {
  const facts = extractResumeFacts(data)
  const personalLocation = resolvePersonalLocation(facts)
  const infoItems: Array<{ icon: LucideIcon; label: string; value: string; fieldKey: string }> = [
    { icon: Cake, label: '出生年月', value: facts.birthDate, fieldKey: 'birthDate' },
    { icon: CalendarDays, label: '年 龄', value: facts.age, fieldKey: 'birthDate' },
    { icon: UserRound, label: '性 别', value: facts.gender, fieldKey: 'gender' },
    { icon: Heart, label: '婚姻状况', value: facts.maritalStatus, fieldKey: 'maritalStatus' },
    { icon: Users, label: '民 族', value: facts.ethnicity, fieldKey: 'ethnicity' },
    { icon: BadgeCheck, label: '政治面貌', value: facts.politicalStatus, fieldKey: 'politicalStatus' },
    { icon: MapPin, label: '籍 贯', value: personalLocation, fieldKey: resolveLocationFieldKey(data) },
    { icon: Ruler, label: '身 高', value: facts.height, fieldKey: 'heightCm' },
    { icon: Ruler, label: '体 重', value: facts.weight, fieldKey: 'weightKg' },
    { icon: BriefcaseBusiness, label: '工作年限', value: facts.experience, fieldKey: 'workYears' },
    { icon: Phone, label: '电 话', value: data.basics.phone, fieldKey: 'phone' },
    { icon: Mail, label: '邮 箱', value: data.basics.email, fieldKey: 'email' },
    { icon: Globe, label: '网 站', value: facts.website, fieldKey: resolveWebsiteFieldKey(data) },
  ].filter(item => hasMeaningfulText(item.value))

  return (
    <div className={styles.template7}>
      <div className={styles.t7Header}>
        <div {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t7Avatar} square sizePt={54} />
        </div>

        <div className={styles.t7HeaderMain}>
          <h1 {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '全民简历'}</h1>
          {hasMeaningfulText(facts.position) ? (
            <p {...getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: 'intentionPosition' })}>求职岗位：{facts.position}</p>
          ) : null}
          {infoItems.length > 0 ? (
            <div className={styles.t7InfoGrid}>
              {infoItems.map(item => (
                <div
                  key={item.label}
                  {...getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey }, styles.t7InfoItem)}
                >
                  <item.icon size={11} />
                  <span>{item.label}：</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.t7Badge}>个人简历</div>
      </div>

      <div className={styles.t7Separator} />

      <div className={styles.t7Body}>
        {renderSectionList(data, sectionIds, {
          headingVariant: 'gray-tab',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t7Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

const templateRenderers: Record<ReactiveTemplateId, TemplateRenderer> = {
  'template-1': Template1,
  'template-2': Template2,
  'template-3': Template3,
  'template-4': Template4,
  'template-5': Template5,
  'template-6': Template6,
  'template-7': Template7,
}

function scopeCustomCss(css: string) {
  return css
    .split(/\n(?=\s*[.#a-zA-Z])/)
    .map(rule => {
      const trimmed = rule.trim()
      if (!trimmed || trimmed.startsWith('@')) return trimmed
      return trimmed.replace(/^([^{]+)(\{)/, (_match, selectors, brace) => {
        const scopedSelectors = selectors
          .split(',')
          .map((selector: string) => `.resume-preview-root ${selector.trim()}`)
          .join(', ')
        return `${scopedSelectors}${brace}`
      })
    })
    .join('\n')
}

function buildCssVariables(data: ResumeData): CSSProperties {
  const dimensions = PAGE_DIMENSIONS[data.metadata.page.format]
  const headingWeights = data.metadata.typography.heading.fontWeights.map(Number)
  const bodyWeights = data.metadata.typography.body.fontWeights.map(Number)
  const typographyLimits = RESUME_EDITOR_LIMITS.typography
  const pageLimits = RESUME_EDITOR_LIMITS.page
  const smartOnePage = data.metadata.page.smartOnePage || { enabled: false, status: 'idle', appliedScale: 0 }
  const smartScale = smartOnePage.enabled ? Math.max(0, Math.min(5, smartOnePage.appliedScale || 0)) : 0
  const spaceScale = Math.max(0.6, 1 - smartScale * 0.08)
  const bodyFontSize = clampToRange(
    data.metadata.typography.body.fontSize - smartScale * 0.3,
    typographyLimits.bodyFontSize.min,
    typographyLimits.bodyFontSize.max,
  )
  const headingFontSize = clampToRange(
    data.metadata.typography.heading.fontSize - smartScale * 0.4,
    typographyLimits.headingFontSize.min,
    typographyLimits.headingFontSize.max,
  )
  const bodyLineHeight = clampToRange(
    data.metadata.typography.body.lineHeight - smartScale * 0.05,
    typographyLimits.bodyLineHeight.min,
    typographyLimits.bodyLineHeight.max,
  )
  const headingLineHeight = clampToRange(
    data.metadata.typography.heading.lineHeight - smartScale * 0.05,
    typographyLimits.headingLineHeight.min,
    typographyLimits.headingLineHeight.max,
  )
  const marginX = clampToRange(data.metadata.page.marginX - smartScale * 1.2, pageLimits.marginX.min, pageLimits.marginX.max)
  const marginY = clampToRange(data.metadata.page.marginY - smartScale * 1.2, pageLimits.marginY.min, pageLimits.marginY.max)
  const gapX = clampToRange(data.metadata.page.gapX - smartScale * 0.6, pageLimits.gapX.min, pageLimits.gapX.max)
  const gapY = clampToRange(data.metadata.page.gapY - smartScale * 0.6, pageLimits.gapY.min, pageLimits.gapY.max)

  return {
    ['--page-width' as string]: dimensions.width,
    ['--page-height' as string]: data.metadata.page.format === 'free-form' ? 'auto' : dimensions.height,
    ['--page-text-color' as string]: data.metadata.design.colors.text,
    ['--page-primary-color' as string]: data.metadata.design.colors.primary,
    ['--page-background-color' as string]: '#ffffff',
    ['--page-body-font-family' as string]: `'${data.metadata.typography.body.fontFamily}', system-ui, -apple-system, sans-serif`,
    ['--page-body-font-weight' as string]: Math.min(...bodyWeights),
    ['--page-body-font-weight-bold' as string]: Math.max(...bodyWeights),
    ['--page-body-font-size' as string]: bodyFontSize,
    ['--page-body-line-height' as string]: bodyLineHeight,
    ['--page-heading-font-family' as string]: `'${data.metadata.typography.heading.fontFamily}', system-ui, -apple-system, sans-serif`,
    ['--page-heading-font-weight' as string]: Math.min(...headingWeights),
    ['--page-heading-font-weight-bold' as string]: Math.max(...headingWeights),
    ['--page-heading-font-size' as string]: headingFontSize,
    ['--page-heading-line-height' as string]: headingLineHeight,
    ['--page-margin-x' as string]: `${marginX}pt`,
    ['--page-margin-y' as string]: `${marginY}pt`,
    ['--page-gap-x' as string]: `${gapX}pt`,
    ['--page-gap-y' as string]: `${gapY}pt`,
    ['--smart-space-scale' as string]: spaceScale,
  }
}

function collectRuntimeSectionIds(data: ResumeData) {
  const layoutSectionIds = data.metadata.layout.pages.flatMap(page => [...(page.main || []), ...(page.sidebar || [])].filter(Boolean))
  const dedupedLayoutSectionIds = Array.from(new Set(layoutSectionIds))
  const sectionOrder = dedupedLayoutSectionIds.length > 0 ? dedupedLayoutSectionIds : getOrderedSectionIds(data, [])
  return getVisibleSections(data, sectionOrder)
}

interface TextLineBox {
  top: number
  bottom: number
}

interface PageViewportMetrics {
  top: number
  bottom: number
  usableHeight: number
  firstBoundary: number
}

function parseCssLengthToPx(value: string, referenceElement: HTMLElement | null) {
  const normalized = value.trim()
  if (!normalized) return 0

  const numeric = Number.parseFloat(normalized)
  if (!Number.isFinite(numeric)) return 0

  if (normalized.endsWith('px')) return numeric
  if (normalized.endsWith('pt')) return numeric * (96 / 72)

  if (normalized.endsWith('rem')) {
    const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize || '16')
    return numeric * (Number.isFinite(rootFontSize) ? rootFontSize : 16)
  }

  if (normalized.endsWith('em')) {
    const baseFontSize = Number.parseFloat((referenceElement ? window.getComputedStyle(referenceElement).fontSize : '16') || '16')
    return numeric * (Number.isFinite(baseFontSize) ? baseFontSize : 16)
  }

  return numeric
}

function clampBetween(value: number, minValue: number, maxValue: number) {
  const lower = Math.min(minValue, maxValue)
  const upper = Math.max(minValue, maxValue)
  return clampToRange(value, lower, upper)
}

function resolvePageViewportMetrics(pageElement: HTMLElement, templateRoot: HTMLElement | null, pageHeight: number): PageViewportMetrics {
  if (!pageHeight || !Number.isFinite(pageHeight)) {
    return {
      top: 0,
      bottom: 0,
      usableHeight: 0,
      firstBoundary: 0,
    }
  }

  const templateStyles = templateRoot ? window.getComputedStyle(templateRoot) : null
  const pageStyles = window.getComputedStyle(pageElement)
  const fallbackInset = parseCssLengthToPx(pageStyles.getPropertyValue('--page-margin-y'), pageElement)
  const paddingTop = templateStyles ? Number.parseFloat(templateStyles.paddingTop || '0') : 0
  const paddingBottom = templateStyles ? Number.parseFloat(templateStyles.paddingBottom || '0') : 0
  const resolvedPaddingTop = Number.isFinite(paddingTop) && paddingTop > 0.5 ? paddingTop : fallbackInset
  const resolvedPaddingBottom = Number.isFinite(paddingBottom) && paddingBottom > 0.5 ? paddingBottom : fallbackInset
  const top = clampToRange(resolvedPaddingTop, 0, Math.max(0, pageHeight * 0.28))
  const bottom = clampToRange(resolvedPaddingBottom, 0, Math.max(0, pageHeight * 0.28))
  const usableHeight = Math.max(40, pageHeight - top - bottom)
  return {
    top,
    bottom,
    usableHeight,
    firstBoundary: top + usableHeight,
  }
}

function collectTextLineBoxes(root: HTMLElement | null) {
  if (!root) return [] as TextLineBox[]

  const rootRect = root.getBoundingClientRect()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const lineBoxes: TextLineBox[] = []
  const range = document.createRange()

  while (walker.nextNode()) {
    const node = walker.currentNode
    if (!(node instanceof Text) || !node.nodeValue?.trim()) continue
    if (!node.parentElement) continue
    range.selectNodeContents(node)
    const rects = range.getClientRects()
    for (const rect of rects) {
      const top = rect.top - rootRect.top
      const bottom = rect.bottom - rootRect.top
      if (bottom - top < 1) continue
      lineBoxes.push({ top, bottom })
    }
  }

  if (lineBoxes.length === 0) return lineBoxes

  lineBoxes.sort((a, b) => a.top - b.top)
  const merged: TextLineBox[] = []
  for (const box of lineBoxes) {
    const last = merged[merged.length - 1]
    if (!last || Math.abs(last.top - box.top) > 0.5 || Math.abs(last.bottom - box.bottom) > 0.5) {
      merged.push(box)
    }
  }
  return merged
}

function adjustBoundaryForLineCut(
  ideal: number,
  previousOffset: number,
  maxOffset: number,
  lineBoxes: TextLineBox[],
  usableHeight: number,
) {
  const boundaryY = ideal
  const crossing = lineBoxes.find(line => boundaryY > line.top + 0.5 && boundaryY < line.bottom - 0.5)
  if (!crossing) {
    return clampBetween(ideal, previousOffset + 20, maxOffset)
  }

  const minStep = Math.max(20, usableHeight * 0.35)
  const maxBacktrack = Math.max(20, Math.min(44, usableHeight * 0.06))
  const maxForward = Math.max(10, Math.min(28, usableHeight * 0.04))

  const backwardSnap = clampBetween(crossing.top, previousOffset + 20, maxOffset)
  const forwardSnap = clampBetween(crossing.bottom, previousOffset + 20, maxOffset)
  const backwardDistance = Math.max(0, ideal - backwardSnap)
  const forwardDistance = Math.max(0, forwardSnap - ideal)

  if (forwardSnap - previousOffset >= minStep && forwardDistance <= maxForward) {
    return forwardSnap
  }

  if (backwardSnap - previousOffset >= minStep && backwardDistance <= maxBacktrack) {
    return backwardSnap
  }

  const fallback = clampBetween(ideal, previousOffset + 20, maxOffset)
  if (fallback - previousOffset < minStep) {
    return clampBetween(ideal, previousOffset + 20, maxOffset)
  }
  return fallback
}

function buildRuntimePageOffsets(
  contentHeight: number,
  usableHeight: number,
  firstPageTopInset: number,
  lineBoxes: TextLineBox[],
  initialOffset = 0,
) {
  const startOffset = Math.max(0, initialOffset)
  const offsets = [startOffset]
  if (!contentHeight || !usableHeight) return offsets

  const overflowTolerancePx = 2
  const maxOffset = Math.max(startOffset, contentHeight - 1)
  let currentOffset = startOffset
  let pageWindowHeight = Math.max(1, usableHeight + Math.max(0, firstPageTopInset))
  let guard = 0

  while (currentOffset + pageWindowHeight < contentHeight - overflowTolerancePx && guard < 400) {
    const ideal = currentOffset + pageWindowHeight
    const nextOffset = adjustBoundaryForLineCut(ideal, currentOffset, maxOffset, lineBoxes, usableHeight)
    if (nextOffset <= currentOffset + 4) {
      const forced = clampBetween(ideal, currentOffset + 20, maxOffset)
      offsets.push(forced)
      currentOffset = forced
    } else {
      offsets.push(nextOffset)
      currentOffset = nextOffset
    }
    pageWindowHeight = Math.max(1, usableHeight)
    guard += 1
  }

  return offsets
}

export function ResumeReactivePreview({
  data,
  className,
  showPageNumbers = false,
  mode = 'editor',
  onNavigate,
}: ResumeReactivePreviewProps) {
  const cssVars = useMemo(() => buildCssVariables(data), [data])
  const runtimeSectionIds = useMemo(() => collectRuntimeSectionIds(data), [data])
  const isFixedFormat = data.metadata.page.format !== 'free-form'
  const isEditorSinglePage = mode === 'editor' && isFixedFormat
  const useRuntimePagination = mode === 'export' && isFixedFormat
  const interactiveNavigate = mode === 'editor' ? onNavigate : undefined
  const measurePageRef = useRef<HTMLDivElement | null>(null)
  const measureViewportRef = useRef<HTMLDivElement | null>(null)
  const editorPageRef = useRef<HTMLDivElement | null>(null)
  const editorPageHeightProbeRef = useRef<HTMLDivElement | null>(null)
  const [runtimePageHeightPx, setRuntimePageHeightPx] = useState(0)
  const [runtimePageViewportTopPx, setRuntimePageViewportTopPx] = useState(0)
  const [runtimePageViewportHeightPx, setRuntimePageViewportHeightPx] = useState(0)
  const [runtimePageOffsets, setRuntimePageOffsets] = useState<number[]>([0])
  const [editorSplitTopPx, setEditorSplitTopPx] = useState(0)
  const [editorHasOverflow, setEditorHasOverflow] = useState(false)
  const [editorHasTextOverflow, setEditorHasTextOverflow] = useState(false)
  const [editorSplitLineVisible, setEditorSplitLineVisible] = useState(true)

  const scopedCss = useMemo(() => {
    if (!data.metadata.css.enabled || !data.metadata.css.value.trim()) return null
    return scopeCustomCss(sanitizeCss(data.metadata.css.value))
  }, [data.metadata.css.enabled, data.metadata.css.value])
  const editorSplitTip = '以下内容将自动分页'

  const renderer = templateRenderers[data.metadata.template] || templateRenderers['template-1']
  const runtimePages = useRuntimePagination ? Math.max(1, runtimePageOffsets.length) : 1

  useLayoutEffect(() => {
    let frameId = 0
    const resetRuntimePagination = () => {
      setRuntimePageHeightPx(prev => (prev === 0 ? prev : 0))
      setRuntimePageViewportTopPx(prev => (prev === 0 ? prev : 0))
      setRuntimePageViewportHeightPx(prev => (prev === 0 ? prev : 0))
      setRuntimePageOffsets(prev => (prev.length === 1 && prev[0] === 0 ? prev : [0]))
    }
    const scheduleRuntimeReset = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(resetRuntimePagination)
    }

    if (!useRuntimePagination) {
      scheduleRuntimeReset()
      return () => {
        cancelAnimationFrame(frameId)
      }
    }

    const measurePage = measurePageRef.current
    const measureViewport = measureViewportRef.current
    if (!measurePage || !measureViewport) return

    const updateRuntimePagination = () => {
      // Always measure from dedicated full-page probe to avoid recursive
      // shrinking when rendered slice viewport has dynamic clipped height.
      const pageHeight = measureViewport.clientHeight || measureViewport.offsetHeight || 0
      const contentNode = measurePage.firstElementChild as HTMLElement | null
      const templateRoot = contentNode?.firstElementChild as HTMLElement | null
      const contentHeight = Math.max(
        templateRoot?.scrollHeight || 0,
        templateRoot?.offsetHeight || 0,
        contentNode?.scrollHeight || 0,
        contentNode?.offsetHeight || 0,
      )

      const viewportMetrics = resolvePageViewportMetrics(measurePage, templateRoot, pageHeight)
      const viewportTop = viewportMetrics.top
      const usableHeight = viewportMetrics.usableHeight
      const lineBoxes = collectTextLineBoxes(templateRoot)
      const pageOffsets = buildRuntimePageOffsets(contentHeight, usableHeight, viewportTop, lineBoxes, 0)

      if (!pageHeight || !Number.isFinite(pageHeight)) {
        resetRuntimePagination()
        return
      }

      setRuntimePageHeightPx(prev => (Math.abs(prev - pageHeight) < 0.5 ? prev : pageHeight))
      setRuntimePageViewportTopPx(prev => (Math.abs(prev - viewportTop) < 0.5 ? prev : viewportTop))
      setRuntimePageViewportHeightPx(prev => (Math.abs(prev - usableHeight) < 0.5 ? prev : usableHeight))
      setRuntimePageOffsets(prev => {
        if (prev.length === pageOffsets.length && prev.every((value, index) => Math.abs(value - pageOffsets[index]) < 0.5)) {
          return prev
        }
        return pageOffsets
      })
    }

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(updateRuntimePagination)
    }

    scheduleUpdate()

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate)
    resizeObserver?.observe(measurePage)
    resizeObserver?.observe(measureViewport)
    if (measurePage.firstElementChild) {
      resizeObserver?.observe(measurePage.firstElementChild)
    }
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [data, useRuntimePagination, renderer, runtimeSectionIds])

  useLayoutEffect(() => {
    let frameId = 0
    const resetEditorOverflowHint = () => {
      setEditorSplitTopPx(prev => (prev === 0 ? prev : 0))
      setEditorHasOverflow(prev => (prev ? false : prev))
      setEditorHasTextOverflow(prev => (prev ? false : prev))
      setEditorSplitLineVisible(prev => (prev ? prev : true))
    }
    const scheduleEditorReset = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(resetEditorOverflowHint)
    }

    if (!isEditorSinglePage) {
      scheduleEditorReset()
      return () => {
        cancelAnimationFrame(frameId)
      }
    }

    const editorPage = editorPageRef.current
    const pageHeightProbe = editorPageHeightProbeRef.current
    if (!editorPage || !pageHeightProbe) return

    const updateEditorOverflowHint = () => {
      const pageHeight = pageHeightProbe.clientHeight || pageHeightProbe.offsetHeight || 0
      const contentNode = editorPage.firstElementChild as HTMLElement | null
      const contentHeight = Math.max(
        editorPage.scrollHeight,
        contentNode?.scrollHeight || 0,
        contentNode?.offsetHeight || 0,
      )

      if (!pageHeight || !Number.isFinite(pageHeight)) {
        resetEditorOverflowHint()
        return
      }

      const viewportMetrics = resolvePageViewportMetrics(editorPage, contentNode, pageHeight)
      const overflowTolerancePx = 2
      const splitBoundary = viewportMetrics.firstBoundary
      const lineBoxes = collectTextLineBoxes(contentNode)
      const hasTextBeyondSplit = lineBoxes.some(line => line.bottom > splitBoundary + 1)
      const hasOverflow = contentHeight - splitBoundary > overflowTolerancePx
      const shouldShowSplitHint = hasTextBeyondSplit

      setEditorSplitTopPx(prev => (Math.abs(prev - splitBoundary) < 0.5 ? prev : splitBoundary))
      setEditorHasOverflow(prev => (prev === hasOverflow ? prev : hasOverflow))
      setEditorHasTextOverflow(prev => (prev === shouldShowSplitHint ? prev : shouldShowSplitHint))
      if (!shouldShowSplitHint) {
        setEditorSplitLineVisible(prev => (prev ? prev : true))
      }
    }

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId)
      frameId = requestAnimationFrame(updateEditorOverflowHint)
    }

    scheduleUpdate()

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleUpdate)
    resizeObserver?.observe(editorPage)
    resizeObserver?.observe(pageHeightProbe)
    if (editorPage.firstElementChild) {
      resizeObserver?.observe(editorPage.firstElementChild)
    }
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver?.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [data, isEditorSinglePage, renderer, runtimeSectionIds])

  const renderRuntimeTemplate = () =>
    renderer({
      data,
      pageIndex: 0,
      sectionIds: runtimeSectionIds,
      onNavigate: interactiveNavigate,
    })

  return (
    <div
      className={cx(
        styles.previewRoot,
        (mode === 'editor' || mode === 'export') && styles.previewFramelessMode,
        'resume-preview-root',
        data.metadata.page.smartOnePage?.enabled && 'resume-smart-one-page',
        className,
      )}
      style={cssVars}
    >
      {scopedCss ? <style dangerouslySetInnerHTML={{ __html: scopedCss }} /> : null}

      {useRuntimePagination ? (
        <div className={styles.measureLayer} aria-hidden>
          <div ref={measureViewportRef} className={cx(styles.page, styles.pageFixed, styles.measureViewport)} />
          <div ref={measurePageRef} className={cx(styles.page, styles.pageFixed, styles.measurePage)}>
            <div className={styles.measureContent}>{renderRuntimeTemplate()}</div>
          </div>
        </div>
      ) : null}

      {isEditorSinglePage ? (
        <>
          <div className={styles.measureLayer} aria-hidden>
            <div ref={editorPageHeightProbeRef} className={cx(styles.page, styles.pageFixed, styles.pageMeasureProbe)} />
          </div>
          <div
            ref={editorPageRef}
            className={cx(styles.page, styles.pageEditorFlow)}
            data-template={data.metadata.template}
            data-page-overflow={editorHasOverflow ? 'true' : 'false'}
          >
            {renderRuntimeTemplate()}

            {editorHasTextOverflow && editorSplitTopPx > 0 ? (
              <div className={styles.pageSplitHint} style={{ top: `${editorSplitTopPx}px` }}>
                <button
                  type="button"
                  className={styles.pageSplitHintIcon}
                  aria-label={editorSplitTip}
                  title={editorSplitTip}
                  aria-pressed={editorSplitLineVisible}
                  onClick={() => setEditorSplitLineVisible(prev => !prev)}
                >
                  <AlertCircle size={14} />
                  <span className={styles.pageSplitHintNote}>{editorSplitTip}</span>
                </button>
                {editorSplitLineVisible ? <span className={styles.pageSplitHintLine} /> : null}
              </div>
            ) : null}

            {showPageNumbers ? <div className={styles.pageNumber}>1/1</div> : null}
          </div>
        </>
      ) : useRuntimePagination ? (
        Array.from({ length: runtimePages }, (_item, pageIndex) => {
          const isFirstExportPage = pageIndex === 0
          const pageViewportTop = isFirstExportPage ? 0 : runtimePageViewportTopPx
          const pageOffset =
            runtimePageOffsets[pageIndex] !== undefined
              ? runtimePageOffsets[pageIndex]
              : runtimePageViewportHeightPx > 0
                ? pageIndex === 0
                  ? 0
                  : runtimePageViewportHeightPx + runtimePageViewportTopPx + (pageIndex - 1) * runtimePageViewportHeightPx
                : 0
          const nextPageOffset = runtimePageOffsets[pageIndex + 1]
          const pageViewportHeight = (() => {
            if (typeof nextPageOffset === 'number' && Number.isFinite(nextPageOffset)) {
              // Match current page bottom to next page start to avoid overlap/repeat.
              return Math.max(1, nextPageOffset - pageOffset)
            }
            return isFirstExportPage
              ? runtimePageViewportHeightPx + runtimePageViewportTopPx
              : runtimePageViewportHeightPx
          })()
          const clampedPageViewportHeight =
            runtimePageHeightPx > 0
              ? clampToRange(pageViewportHeight, 1, runtimePageHeightPx)
              : Math.max(1, pageViewportHeight)
          return (
            <div key={`${data.metadata.template}-runtime-${pageIndex}`} className={cx(styles.page, styles.pageFixed)} data-template={data.metadata.template}>
              <div
                className={styles.pageSliceViewport}
                style={
                  clampedPageViewportHeight > 0
                    ? {
                        top: `${pageViewportTop}px`,
                        height: `${clampedPageViewportHeight}px`,
                        minHeight: `${clampedPageViewportHeight}px`,
                      }
                    : undefined
                }
              >
                <div
                  className={styles.pageSlice}
                  style={{
                    ...(runtimePageHeightPx > 0 ? { height: `${runtimePageHeightPx}px`, minHeight: `${runtimePageHeightPx}px` } : null),
                    ...(pageOffset ? { transform: `translateY(-${pageOffset}px)` } : null),
                  }}
                >
                  {renderRuntimeTemplate()}
                </div>
              </div>

              {showPageNumbers ? <div className={styles.pageNumber}>{`${pageIndex + 1}/${runtimePages}`}</div> : null}
            </div>
          )
        })
      ) : (
        data.metadata.layout.pages.map((page, pageIndex) => {
          const explicitIds = Array.from(new Set([...(page.main || []), ...(page.sidebar || [])].filter(Boolean)))
          const combinedIds = explicitIds.length === 0 && pageIndex === 0 ? getOrderedSectionIds(data, explicitIds) : explicitIds
          const visibleIds = getVisibleSections(data, combinedIds)

          return (
            <div key={`${data.metadata.template}-${pageIndex}`} className={styles.page} data-template={data.metadata.template}>
              {renderer({
                data,
                pageIndex,
                sectionIds: visibleIds,
                onNavigate: interactiveNavigate,
              })}

              {showPageNumbers ? (
                <div className={styles.pageNumber}>{`${pageIndex + 1}/${data.metadata.layout.pages.length}`}</div>
              ) : null}
            </div>
          )
        })
      )}
    </div>
  )
}
