'use client'

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useCallback,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { FilePenLine, LayoutTemplate, Moon, SlidersHorizontal, Sun, Type as TypeIcon, FileText, PenLine, ZoomIn, ZoomOut } from 'lucide-react'
import {
  Button,
  Checkbox,
  Input,
  IconChevronDown,
  IconChevronRight,
  IconDelete,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconGrip,
  IconMaximize,
  IconMoreHorizontal,
  IconPlus,
  IconRefresh,
  IconRedo,
  IconUndo,
  Message,
  Option,
  Select,
  Space,
  Switch,
  Tooltip,
} from './primitives'
import { normalizeResumeContent, type ResumeDataSource } from '@/lib/resume/mappers'
import {
  RESUME_EDITOR_LIMITS,
  clampToRange,
  formatNumericValue,
  parseNumericInput,
  type NumericLimitConfig,
} from '@/lib/resume/editor-limits'
import {
  STANDARD_SECTION_IDS,
  type CustomSectionType,
  type ResumeData,
  type StandardSectionType,
} from '@/lib/resume/types'
import { dateToYearMonth, joinPeriodValue, splitPeriodValue } from '@/lib/date-fields'
import { getTemplateDefaultPrimaryColor, RESUME_TEMPLATES } from '@/lib/constants'
import { AuthRequiredModal, Modal } from '@/components/ui/Modal'
import { DateRangePickerField } from '@/components/ui/date-range-picker'
import { MonthPickerField } from '@/components/ui/month-picker'
import type { PreviewNavigationTarget } from '@/components/resume-reactive-preview'
import { useResumeBuilderStore } from './store/useResumeBuilderStore'
import { FillToolPanel } from './panels/FillToolPanel'
import { ExportWorkbench } from './export/ExportWorkbench'
import { ResumeBuilderToolbar } from './layout/ResumeBuilderToolbar'
import './builder-theme.css'

const ResumeReactivePreview = dynamic(
  () => import('@/components/resume-reactive-preview').then(module => module.ResumeReactivePreview),
  { ssr: false },
)

const RichTextEditor = dynamic(
  () => import('./RichTextEditor').then(module => module.RichTextEditor),
  { ssr: false },
)

const FONT_OPTIONS = [
  'Noto Sans SC',
  'PingFang SC',
  'Microsoft YaHei',
  'Source Han Sans SC',
  'Source Han Serif SC',
  'Inter',
  'IBM Plex Sans',
  'Georgia',
  'Times New Roman',
  'Arial',
  'Helvetica',
]

const GENDER_OPTIONS = [
  { value: '', label: '不填' },
  { value: '男', label: '男' },
  { value: '女', label: '女' },
]

const WORK_YEAR_OPTIONS = [
  { value: '', label: '不填' },
  { value: '应届生', label: '应届生' },
  { value: '1年经验', label: '1年经验' },
  { value: '2年经验', label: '2年经验' },
  { value: '3年经验', label: '3年经验' },
  { value: '4年经验', label: '4年经验' },
  { value: '5年经验', label: '5年经验' },
  { value: '6年经验', label: '6年经验' },
  { value: '7年经验', label: '7年经验' },
  { value: '8年经验', label: '8年经验' },
  { value: '9年经验', label: '9年经验' },
  { value: '10年以上', label: '10年以上' },
]

const MARITAL_STATUS_OPTIONS = [
  { value: '', label: '不填' },
  { value: '未婚', label: '未婚' },
  { value: '已婚', label: '已婚' },
]

const POLITICAL_STATUS_OPTIONS = [
  { value: '', label: '不填' },
  { value: '中共党员', label: '中共党员' },
  { value: '共青团员', label: '共青团员' },
  { value: '群众', label: '群众' },
  { value: '民主党派', label: '民主党派' },
]

const THEME_STORAGE_KEY = 'theme'
const DEFAULT_TEXT_COLOR = '#111827'

function toSingleSelectValue(value: string | string[]) {
  return Array.isArray(value) ? value[0] || '' : value
}

function normalizeHexColor(value: string): string | null {
  const normalized = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(normalized)) {
    return normalized
  }

  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    const chars = normalized.slice(1).split('')
    return `#${chars.map(char => `${char}${char}`).join('')}`
  }

  return null
}

function normalizeRgbColor(value: string): string | null {
  const trimmed = value.trim().toLowerCase()
  const rgbMatch = trimmed.match(/^rgba?\((.+)\)$/)
  if (!rgbMatch) return null

  const channelParts = rgbMatch[1]
    .split(/[,\s/]+/)
    .map(part => part.trim())
    .filter(Boolean)
  if (channelParts.length < 3) return null

  const channels = channelParts.slice(0, 3).map(part => Number.parseFloat(part))
  if (channels.some(channel => Number.isNaN(channel))) return null

  const toHex = (channel: number) => {
    const normalized = Math.max(0, Math.min(255, Math.round(channel)))
    return normalized.toString(16).padStart(2, '0')
  }

  return `#${channels.map(toHex).join('')}`
}

function resolveColorInputValue(value: string, fallback: string) {
  return normalizeHexColor(value) || normalizeRgbColor(value) || fallback
}

function formatClockTime(value?: number) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function resolveThemePreference(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const themeFromDom = document.documentElement.getAttribute('data-theme')
    if (themeFromDom === 'dark' || themeFromDom === 'light') {
      return themeFromDom
    }
  }

  if (typeof window !== 'undefined') {
    const themeFromStorage = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (themeFromStorage === 'dark' || themeFromStorage === 'light') {
      return themeFromStorage
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  }

  return 'light'
}

interface NumberComboFieldProps {
  label: string
  value: number
  config: NumericLimitConfig
  suffix?: string
  onChange: (value: number) => void
}

function NumberComboField({ label, value, config, suffix, onChange }: NumberComboFieldProps) {
  const normalizedValue = clampToRange(value, config.min, config.max)
  const [draft, setDraft] = useState(formatNumericValue(normalizedValue, config.step))
  const [focused, setFocused] = useState(false)
  const [open, setOpen] = useState(false)
  const fieldRef = useRef<HTMLDivElement | null>(null)
  const presetValues = config.presets
  const displayValue = focused ? draft : formatNumericValue(normalizedValue, config.step)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!fieldRef.current || !(target instanceof Node)) return
      if (!fieldRef.current.contains(target)) {
        setOpen(false)
      }
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const applyDraft = () => {
    const parsed = parseNumericInput(draft, config, normalizedValue)
    onChange(parsed)
    setDraft(formatNumericValue(parsed, config.step))
    setFocused(false)
  }

  return (
    <div ref={fieldRef} className="resume-number-combo-field">
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <div className={`resume-number-combo-single ${open ? 'is-open' : ''}`}>
        <Input
          className="resume-number-combo-input"
          value={displayValue}
          onChange={setDraft}
          onFocus={() => {
            setFocused(true)
            setDraft(formatNumericValue(normalizedValue, config.step))
          }}
          onBlur={applyDraft}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
            if (event.key === 'ArrowDown') {
              setOpen(true)
            }
          }}
          inputMode="decimal"
        />
        <button
          type="button"
          className="resume-number-combo-toggle"
          onMouseDown={event => event.preventDefault()}
          onClick={() => setOpen(prev => !prev)}
          aria-label={`${label} 预设值`}
        >
          <IconChevronDown />
        </button>
      </div>
      {open ? (
        <div
          className="resume-number-combo-menu"
          onPointerDown={event => event.stopPropagation()}
          onWheelCapture={event => event.stopPropagation()}
          onWheel={event => event.stopPropagation()}
        >
          {presetValues.map(item => {
            const formatted = formatNumericValue(item, config.step)
            const active = formatted === formatNumericValue(normalizedValue, config.step)
            return (
              <button
                key={`${label}-${formatted}`}
                type="button"
                className={`resume-number-combo-option ${active ? 'is-active' : ''}`}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  setDraft(formatted)
                  const parsed = parseNumericInput(formatted, config, normalizedValue)
                  onChange(parsed)
                  setOpen(false)
                }}
              >
                {formatted}
                {suffix ? ` ${suffix}` : ''}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

const STANDARD_SECTION_LABELS: Record<StandardSectionType, string> = {
  profiles: '社交资料',
  experience: '工作经历',
  education: '教育经历',
  projects: '项目经历',
  skills: '技能',
  languages: '语言能力',
  interests: '兴趣爱好',
  awards: '奖项',
  certifications: '证书',
  publications: '出版物',
  volunteer: '志愿经历',
  references: '推荐人',
}

const SECTION_FIELD_CONFIG: Record<
  StandardSectionType,
  Array<
    | { key: string; label: string; type?: 'text' | 'number' }
    | { key: string; label: string; type: 'rich' }
    | { key: string; label: string; type: 'keywords' }
  >
> = {
  profiles: [
    { key: 'network', label: '平台' },
    { key: 'username', label: '用户名' },
    { key: 'website.url', label: '链接' },
    { key: 'website.label', label: '显示文本' },
  ],
  experience: [
    { key: 'company', label: '公司' },
    { key: 'position', label: '职位' },
    { key: 'location', label: '地点' },
    { key: 'period', label: '时间段' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  education: [
    { key: 'school', label: '学校' },
    { key: 'degree', label: '学历' },
    { key: 'area', label: '专业方向' },
    { key: 'grade', label: '成绩' },
    { key: 'period', label: '时间段' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  projects: [
    { key: 'name', label: '项目名称' },
    { key: 'period', label: '时间段' },
    { key: 'website.label', label: '职责' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  skills: [
    { key: 'name', label: '技能名称' },
    { key: 'proficiency', label: '熟练度' },
    { key: 'level', label: '等级', type: 'number' },
    { key: 'keywords', label: '关键字', type: 'keywords' },
  ],
  languages: [
    { key: 'language', label: '语言' },
    { key: 'fluency', label: '熟练度' },
    { key: 'level', label: '等级', type: 'number' },
  ],
  interests: [
    { key: 'name', label: '兴趣' },
    { key: 'keywords', label: '关键字', type: 'keywords' },
  ],
  awards: [
    { key: 'title', label: '奖项名称' },
    { key: 'awarder', label: '颁发机构' },
    { key: 'date', label: '日期' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  certifications: [
    { key: 'title', label: '证书名称' },
    { key: 'issuer', label: '签发机构' },
    { key: 'date', label: '日期' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  publications: [
    { key: 'title', label: '标题' },
    { key: 'publisher', label: '发布方' },
    { key: 'date', label: '日期' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  volunteer: [
    { key: 'organization', label: '组织' },
    { key: 'location', label: '地点' },
    { key: 'period', label: '时间段' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
  references: [
    { key: 'name', label: '姓名' },
    { key: 'position', label: '职位' },
    { key: 'phone', label: '电话' },
    { key: 'description', label: '描述', type: 'rich' },
  ],
}

interface ResumeBuilderClientProps {
  initialResume: {
    id: string
    title: string
    templateId: string
    dataSourceId?: string | null
    content: unknown
  }
  dataSources: ResumeDataSource[]
}

function getNestedValue(target: Record<string, unknown>, key: string) {
  const keys = key.split('.')
  let current: unknown = target
  for (const item of keys) {
    if (!current || typeof current !== 'object') return ''
    current = (current as Record<string, unknown>)[item]
  }
  return current
}

function setNestedValue(target: Record<string, unknown>, key: string, value: unknown) {
  const keys = key.split('.')
  const lastKey = keys[keys.length - 1]
  let current = target

  keys.slice(0, -1).forEach(item => {
    if (!current[item] || typeof current[item] !== 'object') {
      current[item] = {}
    }
    current = current[item] as Record<string, unknown>
  })

  current[lastKey] = value
}

function createNestedPatch(target: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const keys = key.split('.')
  if (keys.length === 1) {
    return { [key]: value }
  }

  const root = keys[0]
  const nested = { ...((target[root] as Record<string, unknown> | undefined) || {}) }
  setNestedValue(nested, keys.slice(1).join('.'), value)
  return { [root]: nested }
}

function isStandardSectionId(sectionId: string): sectionId is StandardSectionType {
  return STANDARD_SECTION_IDS.includes(sectionId as StandardSectionType)
}

function getSectionDisplayTitle(data: ResumeData, sectionId: string) {
  if (sectionId === 'summary') {
    return data.summary.title || '个人简介'
  }

  if (isStandardSectionId(sectionId)) {
    return data.sections[sectionId].title || STANDARD_SECTION_LABELS[sectionId]
  }

  const custom = data.customSections.find(section => section.id === sectionId)
  if (custom) {
    return custom.title || '自定义板块'
  }

  return sectionId
}

function isSectionHidden(data: ResumeData, sectionId: string) {
  if (sectionId === 'summary') return data.summary.hidden
  if (isStandardSectionId(sectionId)) return data.sections[sectionId].hidden
  const custom = data.customSections.find(section => section.id === sectionId)
  return custom?.hidden ?? false
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function dedupeSectionIds(sectionIds: string[]) {
  return Array.from(new Set(sectionIds.filter(Boolean)))
}

type Html2Canvas = (
  element: HTMLElement,
  options?: {
    useCORS?: boolean
    backgroundColor?: string | null
    scale?: number
    logging?: boolean
    windowWidth?: number
    windowHeight?: number
  },
) => Promise<HTMLCanvasElement>

declare global {
  interface Window {
    html2canvas?: Html2Canvas
  }
}

const HTML2CANVAS_SCRIPT_ID = 'resume-html2canvas-script'
const HTML2CANVAS_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
const SMART_ONE_PAGE_MAX_SCALE = 5
const SIDEBAR_WIDTH_MIN = 360
const SIDEBAR_WIDTH_MAX = 680
const SIDEBAR_DEFAULT_WIDTH = 500
const PREVIEW_INITIAL_SCALE = 0.6
const PREVIEW_MIN_SCALE = 0.3
const PREVIEW_MAX_SCALE = 6
const PREVIEW_FIT_HORIZONTAL_PADDING = 24
const PREVIEW_FIT_HEIGHT_PADDING = 16
const PREVIEW_SCROLL_VERTICAL_PADDING = 24
const PREVIEW_ZOOM_STEP_BUTTON = 0.06
const PREVIEW_ZOOM_STEP_WHEEL = 0.01  
type BuilderTool = 'sections' | 'fill' | 'template' | 'typography' | 'page' | 'advanced'
type StyleTool = Exclude<BuilderTool, 'sections' | 'fill'>
type EditorFocusRequest = PreviewNavigationTarget & { requestId: number }
const EDITOR_FOCUSABLE_SELECTOR = 'input, textarea, select, button, [role="combobox"], [contenteditable="true"]'

type PreventableEvent =
  | { preventDefault: () => void; cancelable?: boolean }
  | { preventDefault: () => void; nativeEvent?: { cancelable?: boolean } }

function preventDefaultIfCancelable(event: PreventableEvent) {
  const nativeCancelable = 'nativeEvent' in event ? event.nativeEvent?.cancelable : undefined
  const directCancelable = 'cancelable' in event ? event.cancelable : undefined
  if (nativeCancelable === true || directCancelable === true) {
    event.preventDefault()
  }
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
}

function escapeAttributeValue(value: string) {
  if (typeof globalThis.CSS !== 'undefined' && typeof globalThis.CSS.escape === 'function') {
    return globalThis.CSS.escape(value)
  }

  return value.replace(/["\\]/g, '\\$&')
}

function SideToolHint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="resume-side-tool-hint" data-tooltip={label}>
      {children}
    </span>
  )
}

function findEditorFocusElement(root: ParentNode, target: PreviewNavigationTarget) {
  const sectionSelector = `[data-editor-section-id="${escapeAttributeValue(target.sectionId)}"]`
  const itemSelector = target.itemId ? `[data-editor-item-id="${escapeAttributeValue(target.itemId)}"]` : ''
  const fieldSelector = target.fieldKey ? `[data-editor-field-key~="${escapeAttributeValue(target.fieldKey)}"]` : ''

  if (target.itemId && target.fieldKey) {
    const exact = root.querySelector<HTMLElement>(`${sectionSelector}${itemSelector}${fieldSelector}`)
    if (exact) return exact

    const nestedExact = root.querySelector<HTMLElement>(`${sectionSelector}${itemSelector} ${fieldSelector}`)
    if (nestedExact) return nestedExact
  }

  if (target.fieldKey) {
    const sectionField = root.querySelector<HTMLElement>(`${sectionSelector}${fieldSelector}`)
    if (sectionField) return sectionField

    const nestedSectionField = root.querySelector<HTMLElement>(`${sectionSelector} ${fieldSelector}`)
    if (nestedSectionField) return nestedSectionField
  }

  if (target.itemId) {
    const item = root.querySelector<HTMLElement>(`${sectionSelector}${itemSelector}`)
    if (item) return item

    const nestedItem = root.querySelector<HTMLElement>(`${sectionSelector} ${itemSelector}`)
    if (nestedItem) return nestedItem
  }

  return root.querySelector<HTMLElement>(sectionSelector)
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tagName = target.tagName
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

async function ensureFontsReady() {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return
  }

  try {
    await document.fonts.ready
  } catch {
    // ignore font loading edge cases
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function loadHtml2Canvas(): Promise<Html2Canvas> {
  if (window.html2canvas) {
    return Promise.resolve(window.html2canvas)
  }

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(HTML2CANVAS_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.html2canvas) {
          resolve(window.html2canvas)
          return
        }
        reject(new Error('html2canvas 加载失败'))
      }, { once: true })

      existing.addEventListener('error', () => reject(new Error('html2canvas 加载失败')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = HTML2CANVAS_SCRIPT_ID
    script.src = HTML2CANVAS_SCRIPT_SRC
    script.async = true
    script.onload = () => {
      if (window.html2canvas) {
        resolve(window.html2canvas)
      } else {
        reject(new Error('html2canvas 加载失败'))
      }
    }
    script.onerror = () => reject(new Error('html2canvas 加载失败'))
    document.body.appendChild(script)
  })
}

function hasPreviewOverflow(previewRoot: Element | null) {
  if (!previewRoot) return false
  const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>('[data-template]'))
  if (pages.length !== 1) return true
  const page = pages[0]
  if (page.dataset.pageOverflow === 'true') return true
  return page.scrollHeight - page.clientHeight > 2 || page.scrollWidth - page.clientWidth > 2
}

function getSmartOnePageStatusText(status: ResumeData['metadata']['page']['smartOnePage']['status']) {
  if (status === 'fitted') return '已适配一页'
  if (status === 'overflow') return '内容较多，压缩后仍超过一页'
  return '压缩中...'
}

function SaveStatusTag() {
  const save = useResumeBuilderStore(state => state.save)
  const dirty = useResumeBuilderStore(state => state.dirty)

  const lastSavedTime = formatClockTime(save.lastSavedAt)

  if (save.status === 'saving') {
    return <span className="resume-save-status is-busy">正在保存...</span>
  }

  if (save.status === 'error') {
    return <span className="resume-save-status is-error">保存失败：{save.error || '未知错误'}</span>
  }

  if (dirty) {
    return <span className="resume-save-status">有未保存修改</span>
  }

  if (save.status === 'saved' && lastSavedTime) {
    return <span className="resume-save-status">云端已保存于 {lastSavedTime}</span>
  }

  return null
}

function EditorAnchor({
  sectionId,
  fieldKey,
  itemId,
  className,
  children,
}: {
  sectionId: string
  fieldKey?: string
  itemId?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      data-editor-section-id={sectionId}
      data-editor-field-key={fieldKey}
      data-editor-item-id={itemId}
      className={joinClassNames('resume-focus-target', className)}
    >
      {children}
    </div>
  )
}

function BasicsEditor() {
  const basics = useResumeBuilderStore(state => state.data.basics)
  const picture = useResumeBuilderStore(state => state.data.picture)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)

  const updateField = (field: keyof ResumeData['basics'], value: string) => {
    updateResumeData(draft => {
      if (field === 'website') return
      draft.basics[field] = value as never
    })
  }

  const handleUploadPhoto = async (file: File) => {
    const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
    if (!allowedTypes.has(file.type)) {
      Message.error('仅支持 JPG、PNG、WEBP 格式')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      Message.error('文件大小不能超过 5MB')
      return
    }

    try {
      setPhotoUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => ({ error: '上传失败' }))
      if (!response.ok) {
        throw new Error(payload.error || '上传失败')
      }

      updateResumeData(draft => {
        draft.picture.url = String(payload.url || '')
      })
      Message.success('照片上传成功')
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '上传失败')
    } finally {
      setPhotoUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <EditorAnchor sectionId="basics" fieldKey="name">
          <label className="text-xs text-muted-foreground block mb-1">您的姓名</label>
          <Input value={basics.name} onChange={value => updateField('name', value)} placeholder="请输入姓名" />
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="gender">
          <label className="text-xs text-muted-foreground block mb-1">性别</label>
          <Select value={basics.gender} onChange={value => updateField('gender', Array.isArray(value) ? value[0] || '' : value)} style={{ width: '100%' }}>
            {GENDER_OPTIONS.map(option => (
              <Option key={option.value || 'empty-gender'} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="birthDate">
          <MonthPickerField
            label="出生年月"
            value={basics.birthDate}
            placeholder="不填"
            maxValue={dateToYearMonth(new Date())}
            showTriggerIcon={false}
            onChange={nextValue => updateField('birthDate', nextValue)}
          />
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="birthDate" className="flex items-end pb-1">
          <label className="inline-flex h-9 cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={basics.convertBirthToAge}
              onChange={checked =>
                updateResumeData(draft => {
                  draft.basics.convertBirthToAge = checked
                })
              }
            />
            显示年龄
          </label>
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="workYears">
          <label className="text-xs text-muted-foreground block mb-1">工作年限</label>
          <Select
            value={basics.workYears}
            onChange={value => updateField('workYears', Array.isArray(value) ? value[0] || '' : value)}
            style={{ width: '100%' }}
          >
            {WORK_YEAR_OPTIONS.map(option => (
              <Option key={option.value || 'empty-work-years'} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="phone">
          <label className="text-xs text-muted-foreground block mb-1">联系电话</label>
          <Input value={basics.phone} onChange={value => updateField('phone', value)} placeholder="请输入电话" />
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="email">
          <label className="text-xs text-muted-foreground block mb-1">联系邮箱</label>
          <Input value={basics.email} onChange={value => updateField('email', value)} placeholder="请输入邮箱" />
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="maritalStatus">
          <label className="text-xs text-muted-foreground block mb-1">婚姻状况</label>
          <Select
            value={basics.maritalStatus}
            onChange={value => updateField('maritalStatus', Array.isArray(value) ? value[0] || '' : value)}
            style={{ width: '100%' }}
          >
            {MARITAL_STATUS_OPTIONS.map(option => (
              <Option key={option.value || 'empty-marital'} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="ethnicity">
          <label className="text-xs text-muted-foreground block mb-1">民族</label>
          <Input value={basics.ethnicity} onChange={value => updateField('ethnicity', value)} placeholder="请输入民族" />
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="nativePlace">
          <label className="text-xs text-muted-foreground block mb-1">籍贯</label>
          <Input value={basics.nativePlace} onChange={value => updateField('nativePlace', value)} placeholder="请输入籍贯" />
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="politicalStatus">
          <label className="text-xs text-muted-foreground block mb-1">政治面貌</label>
          <Select
            value={basics.politicalStatus}
            onChange={value => updateField('politicalStatus', Array.isArray(value) ? value[0] || '' : value)}
            style={{ width: '100%' }}
          >
            {POLITICAL_STATUS_OPTIONS.map(option => (
              <Option key={option.value || 'empty-politics'} value={option.value}>
                {option.label}
              </Option>
            ))}
          </Select>
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="heightCm weightKg">
          <label className="text-xs text-muted-foreground block mb-1">身高 / 体重</label>
          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
            <Input type="number" value={basics.heightCm} onChange={value => updateField('heightCm', value)} placeholder="身高" />
            <span className="text-xs text-muted-foreground">cm</span>
            <Input type="number" value={basics.weightKg} onChange={value => updateField('weightKg', value)} placeholder="体重" />
            <span className="text-xs text-muted-foreground">kg</span>
          </div>
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="location">
          <label className="text-xs text-muted-foreground block mb-1">当前所在地</label>
          <Input value={basics.location} onChange={value => updateField('location', value)} placeholder="请输入当前城市" />
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="website.url">
          <label className="text-xs text-muted-foreground block mb-1">个人网站链接</label>
          <Input
            value={basics.website.url}
            onChange={value =>
              updateResumeData(draft => {
                draft.basics.website.url = value
              })
            }
            placeholder="https://example.com"
          />
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="website.label">
          <label className="text-xs text-muted-foreground block mb-1">网站显示文本</label>
          <Input
            value={basics.website.label}
            onChange={value =>
              updateResumeData(draft => {
                draft.basics.website.label = value
              })
            }
            placeholder="个人主页"
          />
        </EditorAnchor>
      </div>

      <EditorAnchor sectionId="basics" fieldKey="picture" className="rounded-sm border border-border/60 bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="resume-anchor-label text-xs text-muted-foreground">照片设置</span>
          <div className="flex items-center gap-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) {
                  void handleUploadPhoto(file)
                }
                event.target.value = ''
              }}
            />
            <Button type="secondary" size="small" onClick={() => photoInputRef.current?.click()} loading={photoUploading}>
              上传照片
            </Button>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={!picture.hidden}
                onChange={checked =>
                  updateResumeData(draft => {
                    draft.picture.hidden = !checked
                  })
                }
                size="small"
              />
              展示照片
            </label>
          </div>
        </div>
        {picture.url ? (
          <p className="text-[11px] text-muted-foreground truncate" title={picture.url}>
            已上传：{picture.url}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">暂未上传照片，将使用默认示意证件照；关闭“展示照片”可隐藏。</p>
        )}
      </EditorAnchor>
    </div>
  )
}

function IntentionEditor() {
  const basics = useResumeBuilderStore(state => state.data.basics)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)

  const updateField = (field: keyof ResumeData['basics'], value: string) => {
    updateResumeData(draft => {
      if (field === 'website') return
      draft.basics[field] = value as never
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <EditorAnchor sectionId="intention" fieldKey="intentionPosition">
          <label className="text-xs text-muted-foreground block mb-1">求职岗位</label>
          <Input
            value={basics.intentionPosition || basics.headline}
            onChange={value =>
              updateResumeData(draft => {
                draft.basics.intentionPosition = value
                draft.basics.headline = value
              })
            }
            placeholder="例如：前端开发工程师"
          />
        </EditorAnchor>

        <EditorAnchor sectionId="intention" fieldKey="intentionCity">
          <label className="text-xs text-muted-foreground block mb-1">意向城市</label>
          <Input value={basics.intentionCity} onChange={value => updateField('intentionCity', value)} placeholder="例如：上海" />
        </EditorAnchor>

        <EditorAnchor sectionId="intention" fieldKey="intentionSalary">
          <label className="text-xs text-muted-foreground block mb-1">期望薪资</label>
          <Input value={basics.intentionSalary} onChange={value => updateField('intentionSalary', value)} placeholder="例如：25k-35k" />
        </EditorAnchor>

        <EditorAnchor sectionId="intention" fieldKey="intentionAvailability">
          <label className="text-xs text-muted-foreground block mb-1">到岗时间</label>
          <Select
            value={basics.intentionAvailability}
            onChange={value => updateField('intentionAvailability', toSingleSelectValue(value))}
            style={{ width: '100%' }}
          >
            <Option value="">不填</Option>
            <Option value="随时到岗">随时到岗</Option>
            <Option value="一周内">一周内</Option>
            <Option value="两周内">两周内</Option>
            <Option value="一个月内">一个月内</Option>
            <Option value="三个月内">三个月内</Option>
          </Select>
        </EditorAnchor>
      </div>
    </div>
  )
}

function SummaryEditor() {
  const summary = useResumeBuilderStore(state => state.data.summary)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)

  return (
    <div className="space-y-3">
      <EditorAnchor sectionId="summary" fieldKey="content">
        <RichTextEditor
          value={summary.content}
          onChange={value =>
            updateResumeData(draft => {
              draft.summary.content = value
            })
          }
          placeholder="输入个人简介..."
          minHeight={160}
        />
      </EditorAnchor>
    </div>
  )
}

function SkillsSectionEditor() {
  const section = useResumeBuilderStore(state => state.data.sections.skills)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)

  return (
    <div className="space-y-3">
      <EditorAnchor sectionId="skills" fieldKey="intro">
        <RichTextEditor
          value={section.intro}
          onChange={value =>
            updateResumeData(draft => {
              draft.sections.skills.intro = value
            })
          }
          placeholder="输入技能说明，例如技术栈、擅长方向、项目经验和方法论..."
          minHeight={180}
        />
      </EditorAnchor>
    </div>
  )
}

function StandardSectionEditor({ sectionId }: { sectionId: StandardSectionType }) {
  const section = useResumeBuilderStore(state => state.data.sections[sectionId])
  const updateItem = useResumeBuilderStore(state => state.updateStandardSectionItem)
  const removeItem = useResumeBuilderStore(state => state.removeStandardSectionItem)

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {section.items.map((item, index) => {
          const record = item as unknown as Record<string, unknown>
          const fields = SECTION_FIELD_CONFIG[sectionId]
          const itemId = String(item.id || index)

          return (
            <EditorAnchor
              key={String(item.id)}
              sectionId={sectionId}
              itemId={itemId}
              className="rounded-sm border border-border/60 bg-muted/20 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <Space>
                  <Button
                    type="text"
                    size="mini"
                    status="danger"
                    icon={<IconDelete />}
                    onClick={() => removeItem(sectionId, index)}
                  />
                </Space>
              </div>

              {fields.map(field => {
                const currentValue = getNestedValue(record, field.key)

                if (field.type === 'rich') {
                  return (
                    <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                      <label className="text-xs text-muted-foreground block mb-1">{field.label}</label>
                      <RichTextEditor
                        value={String(currentValue || '')}
                        onChange={value => updateItem(sectionId, index, createNestedPatch(record, field.key, value))}
                        minHeight={110}
                      />
                    </EditorAnchor>
                  )
                }

                if (field.type === 'keywords') {
                  return (
                    <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                      <label className="text-xs text-muted-foreground block mb-1">{field.label}</label>
                      <Input
                        value={Array.isArray(currentValue) ? currentValue.join(', ') : ''}
                        onChange={value => {
                          const keywords = value
                            .split(/[,，]/)
                            .map(item => item.trim())
                            .filter(Boolean)
                          updateItem(sectionId, index, createNestedPatch(record, field.key, keywords))
                        }}
                        placeholder="逗号分隔"
                      />
                    </EditorAnchor>
                  )
                }

                if (field.type === 'number') {
                  return (
                    <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                      <label className="text-xs text-muted-foreground block mb-1">{field.label}</label>
                      <Input
                        type="number"
                        value={String(currentValue || '')}
                        onChange={value => updateItem(sectionId, index, createNestedPatch(record, field.key, Number(value || 0)))}
                      />
                    </EditorAnchor>
                  )
                }

                if (field.key === 'period') {
                  const { start, end } = splitPeriodValue(String(currentValue || ''))

                  return (
                    <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                      <DateRangePickerField
                        label={field.label}
                        start={start}
                        end={end}
                        onChange={(nextStart, nextEnd) => {
                          updateItem(sectionId, index, createNestedPatch(record, field.key, joinPeriodValue(nextStart, nextEnd)))
                        }}
                      />
                    </EditorAnchor>
                  )
                }

                if (field.key.toLowerCase().includes('date')) {
                  return (
                    <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                      <MonthPickerField
                        label={field.label}
                        value={String(currentValue || '')}
                        placeholder="不填"
                        onChange={nextValue => updateItem(sectionId, index, createNestedPatch(record, field.key, nextValue))}
                      />
                    </EditorAnchor>
                  )
                }

                return (
                  <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                    <label className="text-xs text-muted-foreground block mb-1">{field.label}</label>
                    <Input
                      value={String(currentValue || '')}
                      onChange={value => updateItem(sectionId, index, createNestedPatch(record, field.key, value))}
                    />
                  </EditorAnchor>
                )
              })}
            </EditorAnchor>
          )
        })}

        {section.items.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-sm">
            暂无条目
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CustomSectionInlineEditor({ sectionId }: { sectionId: string }) {
  const section = useResumeBuilderStore(state => state.data.customSections.find(item => item.id === sectionId))
  const updateCustomSection = useResumeBuilderStore(state => state.updateCustomSection)
  const updateCustomItem = useResumeBuilderStore(state => state.updateCustomSectionItem)
  const removeCustomItem = useResumeBuilderStore(state => state.removeCustomSectionItem)

  if (!section) {
    return <div className="text-xs text-muted-foreground">该自定义板块不存在</div>
  }

  return (
    <div className="space-y-3">
      <EditorAnchor sectionId={section.id}>
        <Select
          value={section.type}
          onChange={value => {
            const nextValue = Array.isArray(value) ? value[0] || 'summary' : value
            updateCustomSection(section.id, { type: nextValue as CustomSectionType })
          }}
        >
          <Option value="summary">文本摘要</Option>
          <Option value="cover-letter">求职信</Option>
          {STANDARD_SECTION_IDS.map(id => (
            <Option key={id} value={id}>
              {STANDARD_SECTION_LABELS[id]}
            </Option>
          ))}
        </Select>
      </EditorAnchor>

      {section.items.map((item, index) => (
        <EditorAnchor
          key={String(item.id)}
          sectionId={section.id}
          itemId={String(item.id || index)}
          className="rounded-sm border border-border/60 bg-muted/20 p-2"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">条目 #{index + 1}</span>
            <Space>
              <Button
                type="text"
                size="mini"
                status="danger"
                icon={<IconDelete />}
                onClick={() => removeCustomItem(section.id, index)}
              />
            </Space>
          </div>

          {section.type === 'cover-letter' ? (
            <div className="space-y-2">
              <EditorAnchor sectionId={section.id} itemId={String(item.id || index)} fieldKey="recipient">
                <label className="block text-xs text-muted-foreground">收件人信息</label>
                <RichTextEditor
                  value={String((item as unknown as { recipient?: string }).recipient || '')}
                  onChange={value => updateCustomItem(section.id, index, { recipient: value })}
                  minHeight={80}
                />
              </EditorAnchor>

              <EditorAnchor sectionId={section.id} itemId={String(item.id || index)} fieldKey="content">
                <label className="block text-xs text-muted-foreground">正文</label>
                <RichTextEditor
                  value={String((item as unknown as { content?: string }).content || '')}
                  onChange={value => updateCustomItem(section.id, index, { content: value })}
                  minHeight={120}
                />
              </EditorAnchor>
            </div>
          ) : (
            <EditorAnchor sectionId={section.id} itemId={String(item.id || index)} fieldKey="content">
              <RichTextEditor
                value={String((item as unknown as { content?: string }).content || '')}
                onChange={value => updateCustomItem(section.id, index, { content: value })}
                minHeight={120}
              />
            </EditorAnchor>
          )}
        </EditorAnchor>
      ))}
    </div>
  )
}

function SectionEditorBody({ sectionId }: { sectionId: string }) {
  if (sectionId === 'summary') {
    return <SummaryEditor />
  }

  if (sectionId === 'skills') {
    return <SkillsSectionEditor />
  }

  if (isStandardSectionId(sectionId)) {
    return <StandardSectionEditor sectionId={sectionId} />
  }

  return <CustomSectionInlineEditor sectionId={sectionId} />
}

function AddRowButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button type="button" className="resume-add-row-button" onClick={onClick} disabled={disabled}>
      <span className="resume-add-row-button-icon" aria-hidden>
        <IconPlus />
      </span>
      <span>{label}</span>
    </button>
  )
}

interface SortableSectionEditorItemProps {
  sectionId: string
  expanded: boolean
  onToggleExpanded: (sectionId: string) => void
  onRenameSection: (sectionId: string) => void
  onDeleteSection: (sectionId: string) => void
  onAddSectionItem: (sectionId: string) => void
  sortableEnabled?: boolean
}

function SortableSectionEditorItem({
  sectionId,
  expanded,
  onToggleExpanded,
  onRenameSection,
  onDeleteSection,
  onAddSectionItem,
  sortableEnabled = true,
}: SortableSectionEditorItemProps) {
  const data = useResumeBuilderStore(state => state.data)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)
  const title = getSectionDisplayTitle(data, sectionId)
  const hidden = isSectionHidden(data, sectionId)
  const isCustomSection = !isStandardSectionId(sectionId) && sectionId !== 'summary'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionId,
    disabled: !sortableEnabled,
  })
  const style: CSSProperties | undefined = sortableEnabled
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined

  const onToggleHidden = (nextHidden: boolean) => {
    updateResumeData(draft => {
      if (sectionId === 'summary') {
        draft.summary.hidden = nextHidden
        return
      }

      if (isStandardSectionId(sectionId)) {
        draft.sections[sectionId].hidden = nextHidden
        return
      }

      const custom = draft.customSections.find(section => section.id === sectionId)
      if (custom) {
        custom.hidden = nextHidden
      }
    })
  }

  const canAddItem = sectionId !== 'summary' && sectionId !== 'skills'

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [menuOpen])

  return (
    <div
      ref={sortableEnabled ? setNodeRef : undefined}
      style={style}
      data-editor-section-id={sectionId}
      data-dragging={sortableEnabled && isDragging ? 'true' : undefined}
      className={joinClassNames('resume-section-item', 'resume-focus-target', expanded && 'is-expanded')}
    >
      <div
        className={`resume-section-item-row ${hidden ? 'is-hidden' : ''}`}
        {...(sortableEnabled ? attributes : {})}
        {...(sortableEnabled ? listeners : {})}
        onClick={() => onToggleExpanded(sectionId)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onToggleExpanded(sectionId)
          }
        }}
      >
        <span className="resume-section-item-chevron text-muted-foreground">{expanded ? <IconChevronDown /> : <IconChevronRight />}</span>
        <span className="resume-section-item-title">{title}</span>
        <div className="resume-section-item-actions" onClick={event => event.stopPropagation()}>
          <Tooltip content={hidden ? '显示板块' : '隐藏板块'}>
            <Button
              type="text"
              size="mini"
              className="resume-inline-icon-btn"
              icon={hidden ? <IconEyeOff /> : <IconEye />}
              onClick={() => onToggleHidden(!hidden)}
              aria-label={hidden ? '显示板块' : '隐藏板块'}
            />
          </Tooltip>
          <div ref={menuRef} className={`resume-item-menu ${menuOpen ? 'is-open' : ''}`}>
            <Tooltip content="更多操作">
              <Button
                type="text"
                size="mini"
                className="resume-inline-icon-btn"
                icon={<IconMoreHorizontal />}
                onClick={() => setMenuOpen(prev => !prev)}
                aria-label="更多操作"
              />
            </Tooltip>
            {menuOpen ? (
              <div className="resume-item-menu-popover">
                <button
                  type="button"
                  className="resume-item-menu-action"
                  onClick={() => {
                    onRenameSection(sectionId)
                    setMenuOpen(false)
                  }}
                >
                  重命名
                </button>
                <button
                  type="button"
                  className={`resume-item-menu-action is-danger ${isCustomSection ? '' : 'is-disabled'}`}
                  onClick={() => {
                    if (!isCustomSection) {
                      Message.warning('系统板块不支持删除')
                      return
                    }
                    onDeleteSection(sectionId)
                    setMenuOpen(false)
                  }}
                >
                  删除
                </button>
              </div>
            ) : null}
          </div>
          <span className="resume-section-item-grip text-muted-foreground">
            <IconGrip />
          </span>
        </div>
      </div>

      {expanded ? (
        <div className="resume-section-item-body">
          <SectionEditorBody sectionId={sectionId} />
          {canAddItem ? (
            <div className="resume-section-item-add-row">
              <AddRowButton label="新增条目" onClick={() => onAddSectionItem(sectionId)} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function DragOverlaySectionCard({ sectionId }: { sectionId: string }) {
  const data = useResumeBuilderStore(state => state.data)
  return (
    <div className="resume-section-overlay">
      <span className="text-muted-foreground">
        <IconGrip />
      </span>
      <span>{getSectionDisplayTitle(data, sectionId)}</span>
    </div>
  )
}

function IntegratedSectionsEditor({
  focusRequest,
  scrollContainerRef,
}: {
  focusRequest: EditorFocusRequest | null
  scrollContainerRef: RefObject<HTMLDivElement | null>
}) {
  const data = useResumeBuilderStore(state => state.data)
  const addCustomSection = useResumeBuilderStore(state => state.addCustomSection)
  const addStandardSectionItem = useResumeBuilderStore(state => state.addStandardSectionItem)
  const addCustomSectionItem = useResumeBuilderStore(state => state.addCustomSectionItem)
  const removeCustomSection = useResumeBuilderStore(state => state.removeCustomSection)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>(['basics', 'intention', 'summary'])
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [basicsMenuOpen, setBasicsMenuOpen] = useState(false)
  const [renameModal, setRenameModal] = useState<{ open: boolean; sectionId: string | null; value: string }>({
    open: false,
    sectionId: null,
    value: '',
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; sectionId: string | null; title: string }>({
    open: false,
    sectionId: null,
    title: '',
  })
  const [dndReady, setDndReady] = useState(false)
  const basicsMenuRef = useRef<HTMLDivElement>(null)
  const highlightedTargetRef = useRef<HTMLElement | null>(null)
  const highlightTimerRef = useRef<number | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const orderedSectionIds = useMemo(() => {
    const firstPage = data.metadata.layout.pages[0]
    const customIds = data.customSections.map(section => section.id)
    const canonical = ['summary', ...STANDARD_SECTION_IDS, ...customIds]

    if (!firstPage) {
      return canonical
    }

    const base = dedupeSectionIds([...(firstPage.main || []), ...(firstPage.sidebar || [])])
    const known = new Set(canonical)
    const filtered = base.filter(sectionId => known.has(sectionId))
    const missing = canonical.filter(sectionId => !filtered.includes(sectionId))

    return [...filtered, ...missing]
  }, [data.customSections, data.metadata.layout.pages])

  const toggleExpanded = (sectionId: string) => {
    setExpandedSectionIds(prev =>
      prev.includes(sectionId) ? prev.filter(item => item !== sectionId) : [...prev, sectionId],
    )
  }

  const renameSection = (sectionId: string) => {
    const currentTitle = getSectionDisplayTitle(data, sectionId)
    setRenameModal({
      open: true,
      sectionId,
      value: currentTitle,
    })
  }

  const deleteSection = (sectionId: string) => {
    const custom = data.customSections.find(section => section.id === sectionId)
    if (!custom) return
    setDeleteModal({
      open: true,
      sectionId,
      title: custom.title || '自定义板块',
    })
  }

  const addSectionItem = (sectionId: string) => {
    if (isStandardSectionId(sectionId)) {
      addStandardSectionItem(sectionId)
      return
    }

    if (sectionId === 'summary') return
    addCustomSectionItem(sectionId)
  }

  useEffect(() => {
    if (!basicsMenuOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!basicsMenuRef.current?.contains(event.target as Node)) {
        setBasicsMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [basicsMenuOpen])

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setDndReady(true)
    })

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [])

  useEffect(() => {
    if (!focusRequest) return

    let cancelled = false
    let retryTimer: number | null = null
    let expandFrame = 0
    let frameA = 0
    let frameB = 0

    const clearHighlight = () => {
      if (highlightedTargetRef.current) {
        highlightedTargetRef.current.classList.remove('is-preview-focused')
        highlightedTargetRef.current = null
      }
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current)
        highlightTimerRef.current = null
      }
    }

    const revealTarget = (attempt = 0) => {
      if (cancelled) return
      const scrollContainer = scrollContainerRef.current
      if (!scrollContainer) return

      const targetElement = findEditorFocusElement(scrollContainer, focusRequest)
      if (!targetElement) {
        if (attempt < 8) {
          retryTimer = window.setTimeout(() => revealTarget(attempt + 1), 70)
        }
        return
      }

      targetElement.scrollIntoView({
        behavior: attempt === 0 ? 'smooth' : 'auto',
        block: 'center',
        inline: 'nearest',
      })

      const focusable = targetElement.matches(EDITOR_FOCUSABLE_SELECTOR)
        ? targetElement
        : targetElement.querySelector<HTMLElement>(EDITOR_FOCUSABLE_SELECTOR)

      focusable?.focus({ preventScroll: true })

      clearHighlight()
      // Force the highlight cycle to restart even when the user clicks the same preview target repeatedly.
      targetElement.classList.remove('is-preview-focused')
      void targetElement.offsetWidth
      targetElement.classList.add('is-preview-focused')
      highlightedTargetRef.current = targetElement
      highlightTimerRef.current = window.setTimeout(() => {
        targetElement.classList.remove('is-preview-focused')
        if (highlightedTargetRef.current === targetElement) {
          highlightedTargetRef.current = null
        }
        highlightTimerRef.current = null
      }, 700)
    }

    expandFrame = requestAnimationFrame(() => {
      setExpandedSectionIds(prev => (prev.includes(focusRequest.sectionId) ? prev : [...prev, focusRequest.sectionId]))
    })

    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => {
        revealTarget()
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(expandFrame)
      cancelAnimationFrame(frameA)
      cancelAnimationFrame(frameB)
      if (retryTimer) {
        window.clearTimeout(retryTimer)
      }
    }
  }, [focusRequest, scrollContainerRef])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current)
      }
      highlightedTargetRef.current?.classList.remove('is-preview-focused')
    }
  }, [])

  const handleRenameConfirm = () => {
    if (!renameModal.sectionId) return
    const nextTitle = renameModal.value.trim()
    if (!nextTitle) {
      Message.warning('名称不能为空')
      return
    }

    updateResumeData(draft => {
      const sectionId = renameModal.sectionId as string
      if (sectionId === 'summary') {
        draft.summary.title = nextTitle
        return
      }

      if (isStandardSectionId(sectionId)) {
        draft.sections[sectionId].title = nextTitle
        return
      }

      const custom = draft.customSections.find(section => section.id === sectionId)
      if (custom) {
        custom.title = nextTitle
      }
    })

    setRenameModal({ open: false, sectionId: null, value: '' })
  }

  const handleDeleteConfirm = () => {
    if (!deleteModal.sectionId) return
    removeCustomSection(deleteModal.sectionId)
    setExpandedSectionIds(prev => prev.filter(id => id !== deleteModal.sectionId))
    setDeleteModal({ open: false, sectionId: null, title: '' })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveSectionId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveSectionId(null)
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    if (activeId === overId) return

    const oldIndex = orderedSectionIds.indexOf(activeId)
    const newIndex = orderedSectionIds.indexOf(overId)
    if (oldIndex === -1 || newIndex === -1) return

    const moved = arrayMove(orderedSectionIds, oldIndex, newIndex)
    updateResumeData(draft => {
      const firstPage = draft.metadata.layout.pages[0]
      if (!firstPage) return
      firstPage.main = moved
      firstPage.sidebar = []
      firstPage.fullWidth = true
    })
  }

  const renderSectionList = (sortableEnabled: boolean) => (
    <div className="space-y-1 resume-sections-column">
      {orderedSectionIds.map(sectionId => (
        <SortableSectionEditorItem
          key={sectionId}
          sectionId={sectionId}
          expanded={expandedSectionIds.includes(sectionId)}
          onToggleExpanded={toggleExpanded}
          onRenameSection={renameSection}
          onDeleteSection={deleteSection}
          onAddSectionItem={addSectionItem}
          sortableEnabled={sortableEnabled}
        />
      ))}
    </div>
  )

  return (
    <div className="space-y-3">
      <div
        data-editor-section-id="basics"
        className={joinClassNames('resume-section-item', 'resume-focus-target', expandedSectionIds.includes('basics') && 'is-expanded')}
      >
        <div
          role="button"
          tabIndex={0}
          className="resume-section-item-row is-static"
          onClick={() => toggleExpanded('basics')}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleExpanded('basics')
            }
          }}
        >
          <span className="resume-section-item-chevron text-muted-foreground">
            {expandedSectionIds.includes('basics') ? <IconChevronDown /> : <IconChevronRight />}
          </span>
          <span className="resume-section-item-title">基本信息</span>
          <div className="resume-section-item-actions" onClick={event => event.stopPropagation()}>
            <Tooltip content="基本信息不支持隐藏">
              <Button type="text" size="mini" className="resume-inline-icon-btn" icon={<IconEye />} disabled aria-label="隐藏板块" />
            </Tooltip>
            <div ref={basicsMenuRef} className={`resume-item-menu ${basicsMenuOpen ? 'is-open' : ''}`}>
              <Tooltip content="更多操作">
                <Button
                  type="text"
                  size="mini"
                  className="resume-inline-icon-btn"
                  icon={<IconMoreHorizontal />}
                  onClick={() => setBasicsMenuOpen(prev => !prev)}
                  aria-label="更多操作"
                />
              </Tooltip>
              {basicsMenuOpen ? (
                <div className="resume-item-menu-popover">
                  <button
                    type="button"
                    className="resume-item-menu-action"
                    onClick={() => {
                      setBasicsMenuOpen(false)
                      Message.warning('基本信息板块不支持删除或重命名')
                    }}
                  >
                    暂无可用操作
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {expandedSectionIds.includes('basics') ? (
          <div className="resume-section-item-body">
            <BasicsEditor />
          </div>
        ) : null}
      </div>

      <div
        data-editor-section-id="intention"
        className={joinClassNames('resume-section-item', 'resume-focus-target', expandedSectionIds.includes('intention') && 'is-expanded')}
      >
        <div
          role="button"
          tabIndex={0}
          className="resume-section-item-row is-static"
          onClick={() => toggleExpanded('intention')}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleExpanded('intention')
            }
          }}
        >
          <span className="resume-section-item-chevron text-muted-foreground">
            {expandedSectionIds.includes('intention') ? <IconChevronDown /> : <IconChevronRight />}
          </span>
          <span className="resume-section-item-title">求职意向</span>
          <div className="resume-section-item-actions" onClick={event => event.stopPropagation()}>
            <Tooltip content="求职意向板块不支持隐藏">
              <Button type="text" size="mini" className="resume-inline-icon-btn" icon={<IconEye />} disabled aria-label="隐藏板块" />
            </Tooltip>
          </div>
        </div>
        {expandedSectionIds.includes('intention') ? (
          <div className="resume-section-item-body">
            <IntentionEditor />
          </div>
        ) : null}
      </div>

      {dndReady ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveSectionId(null)}
        >
          <SortableContext items={orderedSectionIds} strategy={verticalListSortingStrategy}>
            {renderSectionList(true)}
          </SortableContext>

          <DragOverlay>{activeSectionId ? <DragOverlaySectionCard sectionId={activeSectionId} /> : null}</DragOverlay>
        </DndContext>
      ) : (
        renderSectionList(false)
      )}

      <div className="resume-sections-add-row">
        <AddRowButton label="新增自定义板块" onClick={() => addCustomSection('summary')} />
      </div>

      <Modal
        open={renameModal.open}
        onClose={() => setRenameModal({ open: false, sectionId: null, value: '' })}
        title="重命名板块"
        footer={
          <>
            <Button type="text" onClick={() => setRenameModal({ open: false, sectionId: null, value: '' })}>
              取消
            </Button>
            <Button type="secondary" onClick={handleRenameConfirm}>
              确认
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <label className="block text-xs text-muted-foreground">板块名称</label>
          <Input value={renameModal.value} onChange={value => setRenameModal(prev => ({ ...prev, value }))} />
        </div>
      </Modal>

      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, sectionId: null, title: '' })}
        title="删除板块"
        footer={
          <>
            <Button type="text" onClick={() => setDeleteModal({ open: false, sectionId: null, title: '' })}>
              取消
            </Button>
            <Button type="secondary" status="danger" onClick={handleDeleteConfirm}>
              删除
            </Button>
          </>
        }
      >
        <p>确认删除「{deleteModal.title}」吗？删除后不可恢复。</p>
      </Modal>
    </div>
  )
}

function LayoutAndStylePanel({ pane }: { pane: StyleTool }) {
  const data = useResumeBuilderStore(state => state.data)
  const setTemplate = useResumeBuilderStore(state => state.setTemplate)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)
  const setSmartOnePage = useResumeBuilderStore(state => state.setSmartOnePage)
  const smartOnePage = data.metadata.page.smartOnePage || { enabled: false, status: 'idle', appliedScale: 0 }
  const templateDefaultColor = getTemplateDefaultPrimaryColor(data.metadata.template)
  const currentTemplateName = RESUME_TEMPLATES.find(template => template.id === data.metadata.template)?.name || '默认模板'
  const primaryColor = resolveColorInputValue(data.metadata.design.colors.primary, templateDefaultColor)
  const textColor = resolveColorInputValue(data.metadata.design.colors.text, DEFAULT_TEXT_COLOR)

  if (pane === 'template') {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-xs text-muted-foreground">模板切换</div>
          <div className="mt-1 text-[11px] text-muted-foreground">点击任意模板图标立即应用到当前简历。</div>
        </div>
        <div className="resume-template-theme-row">
          <div className="resume-template-theme-current">
            <div className="resume-template-theme-label">当前使用主题</div>
            <div className="resume-template-theme-name">
              <span className="resume-template-theme-swatch" style={{ backgroundColor: primaryColor }} />
              <span>{currentTemplateName}</span>
            </div>
          </div>
          <div className="resume-template-theme-picker">
            <label className="text-xs text-muted-foreground" htmlFor="resume-template-primary-color">
              主题色
            </label>
            <input
              id="resume-template-primary-color"
              type="color"
              className="resume-inline-color-input"
              value={primaryColor}
              onChange={event =>
                updateResumeData(draft => {
                  draft.metadata.design.colors.primary = event.target.value
                })
              }
              aria-label="主题色"
            />
          </div>
        </div>
        <div className="resume-template-grid">
          {RESUME_TEMPLATES.map(template => (
            <button
              key={template.id}
              type="button"
              className={`resume-template-card ${data.metadata.template === template.id ? 'is-active' : ''}`}
              style={
                {
                  ['--resume-template-preview' as string]: `url(${template.preview})`,
                } as CSSProperties
              }
              onClick={() => setTemplate(template.id as ResumeData['metadata']['template'])}
              aria-label={`切换到${template.name}`}
              title={template.name}
            >
              <span className="resume-template-card-surface" />
              <span className="resume-template-card-name">{template.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (pane === 'typography') {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1" htmlFor="resume-typography-text-color">
            字体色
          </label>
          <input
            id="resume-typography-text-color"
            type="color"
            className="resume-inline-color-input"
            value={textColor}
            onChange={event =>
              updateResumeData(draft => {
                draft.metadata.design.colors.text = event.target.value
              })
            }
            aria-label="字体色"
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">主字体</label>
            <Select
              value={data.metadata.typography.body.fontFamily}
              onChange={value =>
                updateResumeData(draft => {
                  draft.metadata.typography.body.fontFamily = Array.isArray(value) ? value[0] || '' : value
                })
              }
            >
              {FONT_OPTIONS.map(font => (
                <Option key={font} value={font}>
                  {font}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">标题字体</label>
            <Select
              value={data.metadata.typography.heading.fontFamily}
              onChange={value =>
                updateResumeData(draft => {
                  draft.metadata.typography.heading.fontFamily = Array.isArray(value) ? value[0] || '' : value
                })
              }
            >
              {FONT_OPTIONS.map(font => (
                <Option key={font} value={font}>
                  {font}
                </Option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <NumberComboField
            label="正文字号 (pt)"
            value={data.metadata.typography.body.fontSize}
            config={RESUME_EDITOR_LIMITS.typography.bodyFontSize}
            onChange={next =>
              updateResumeData(draft => {
                draft.metadata.typography.body.fontSize = next
              })
            }
          />
          <NumberComboField
            label="标题字号 (pt)"
            value={data.metadata.typography.heading.fontSize}
            config={RESUME_EDITOR_LIMITS.typography.headingFontSize}
            onChange={next =>
              updateResumeData(draft => {
                draft.metadata.typography.heading.fontSize = next
              })
            }
          />
        </div>
        <div className="grid grid-cols-1 gap-2">
          <NumberComboField
            label="正文行高"
            value={data.metadata.typography.body.lineHeight}
            config={RESUME_EDITOR_LIMITS.typography.bodyLineHeight}
            onChange={next =>
              updateResumeData(draft => {
                draft.metadata.typography.body.lineHeight = next
              })
            }
          />
          <NumberComboField
            label="标题行高"
            value={data.metadata.typography.heading.lineHeight}
            config={RESUME_EDITOR_LIMITS.typography.headingLineHeight}
            onChange={next =>
              updateResumeData(draft => {
                draft.metadata.typography.heading.lineHeight = next
              })
            }
          />
        </div>
      </div>
    )
  }

  if (pane === 'page') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">纸张</label>
            <Select
              value={data.metadata.page.format}
              onChange={value =>
                updateResumeData(draft => {
                  draft.metadata.page.format = (Array.isArray(value) ? value[0] : value) as ResumeData['metadata']['page']['format']
                })
              }
            >
              <Option value="a4">A4</Option>
              <Option value="letter">Letter</Option>
              <Option value="free-form">自由高度</Option>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">语言区域</label>
            <Input
              value={data.metadata.page.locale}
              onChange={value =>
                updateResumeData(draft => {
                  draft.metadata.page.locale = value
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberComboField
            label="左右页边距 (pt)"
            value={data.metadata.page.marginX}
            config={RESUME_EDITOR_LIMITS.page.marginX}
            onChange={next =>
              updateResumeData(draft => {
                draft.metadata.page.marginX = next
              })
            }
          />
          <NumberComboField
            label="上下页边距 (pt)"
            value={data.metadata.page.marginY}
            config={RESUME_EDITOR_LIMITS.page.marginY}
            onChange={next =>
              updateResumeData(draft => {
                draft.metadata.page.marginY = next
              })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumberComboField
            label="横向间距 (pt)"
            value={data.metadata.page.gapX}
            config={RESUME_EDITOR_LIMITS.page.gapX}
            onChange={next =>
              updateResumeData(draft => {
                draft.metadata.page.gapX = next
              })
            }
          />
          <NumberComboField
            label="纵向间距 (pt)"
            value={data.metadata.page.gapY}
            config={RESUME_EDITOR_LIMITS.page.gapY}
            onChange={next =>
              updateResumeData(draft => {
                draft.metadata.page.gapY = next
              })
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>隐藏图标</span>
        <Switch
          checked={data.metadata.page.hideIcons}
          onChange={checked =>
            updateResumeData(draft => {
              draft.metadata.page.hideIcons = checked
            })
          }
        />
      </div>

      <div className="rounded-sm border border-border/60 bg-muted/20 p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>智能一页</span>
          <Switch
            checked={smartOnePage.enabled}
            onChange={checked => {
              if (checked) {
                setSmartOnePage({
                  enabled: true,
                  status: 'idle',
                })
                return
              }

              setSmartOnePage({
                enabled: false,
                status: 'idle',
                appliedScale: 0,
              })
            }}
          />
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground">
          状态：{smartOnePage.enabled ? getSmartOnePageStatusText(smartOnePage.status) : '未开启'}
          {smartOnePage.enabled ? `（档位 ${smartOnePage.appliedScale}/${SMART_ONE_PAGE_MAX_SCALE}）` : ''}
        </div>
        {smartOnePage.enabled ? (
          <Button
            type="outline"
            size="small"
            className="mt-2"
            onClick={() =>
              setSmartOnePage({
                enabled: false,
                status: 'idle',
                appliedScale: 0,
              })
            }
          >
            恢复默认排版
          </Button>
        ) : null}
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-1">自定义 CSS</label>
        <Switch
          checked={data.metadata.css.enabled}
          onChange={checked =>
            updateResumeData(draft => {
              draft.metadata.css.enabled = checked
            })
          }
        />
        {data.metadata.css.enabled ? (
          <Input.TextArea
            className="mt-2"
            value={data.metadata.css.value}
            onChange={value =>
              updateResumeData(draft => {
                draft.metadata.css.value = value
              })
            }
            autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder="输入 CSS 覆盖样式"
          />
        ) : null}
      </div>
    </div>
  )
}

function resolvePreviewFitScale(viewport: HTMLDivElement | null, previewContent: HTMLDivElement | null) {
  if (!viewport || !previewContent) {
    return PREVIEW_INITIAL_SCALE
  }

  const pages = previewContent.querySelectorAll<HTMLElement>('[data-template]')
  const target =
    (pages.length === 1 ? pages[0] : previewContent.querySelector<HTMLElement>('.resume-preview-root')) || previewContent

  const availableWidth = Math.max(viewport.clientWidth - PREVIEW_FIT_HORIZONTAL_PADDING * 2, 0)
  const availableHeight = Math.max(viewport.clientHeight - PREVIEW_FIT_HEIGHT_PADDING * 2, 0)
  const contentWidth = Math.max(target.offsetWidth, target.scrollWidth)
  const contentHeight = Math.max(target.offsetHeight, target.scrollHeight)

  if (!availableWidth || !availableHeight || !contentWidth || !contentHeight) {
    return PREVIEW_INITIAL_SCALE
  }

  return clamp(
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight),
    PREVIEW_MIN_SCALE,
    PREVIEW_MAX_SCALE,
  )
}

function hasPreviewLayoutReady(viewport: HTMLDivElement | null, previewContent: HTMLDivElement | null) {
  if (!viewport || !previewContent) return false

  const pages = previewContent.querySelectorAll<HTMLElement>('[data-template]')
  const target =
    (pages.length === 1 ? pages[0] : previewContent.querySelector<HTMLElement>('.resume-preview-root')) || previewContent

  const availableWidth = Math.max(viewport.clientWidth - PREVIEW_FIT_HORIZONTAL_PADDING * 2, 0)
  const availableHeight = Math.max(viewport.clientHeight - PREVIEW_FIT_HEIGHT_PADDING * 2, 0)
  const contentWidth = Math.max(target.offsetWidth, target.scrollWidth)
  const contentHeight = Math.max(target.offsetHeight, target.scrollHeight)

  return availableWidth > 0 && availableHeight > 0 && contentWidth > 0 && contentHeight > 0
}

function resolvePreviewScrollMax(viewport: HTMLDivElement | null, scrollSpaceHeight: number) {
  if (!viewport) return 0
  return Math.max(0, scrollSpaceHeight - viewport.clientHeight)
}

function resolveCenteredScrollTop(
  viewport: HTMLDivElement | null,
  currentScale: number,
  nextScale: number,
  verticalPadding: number,
) {
  if (!viewport || currentScale <= 0) return 0
  const viewportCenter = viewport.scrollTop + viewport.clientHeight / 2 - verticalPadding
  const baseCenter = viewportCenter / currentScale
  return baseCenter * nextScale - viewport.clientHeight / 2 + verticalPadding
}

interface ResumePreviewCanvasProps {
  content: ReactNode
  previewContentRef: RefObject<HTMLDivElement | null>
  previewViewportRef: RefObject<HTMLDivElement | null>
  previewScale: number
  previewScrollSpaceHeight: number
  verticalPadding: number
  ready: boolean
}

function ResumePreviewCanvas({
  content,
  previewContentRef,
  previewViewportRef,
  previewScale,
  previewScrollSpaceHeight,
  verticalPadding,
  ready,
}: ResumePreviewCanvasProps) {
  const scrollSpaceHeight = previewScrollSpaceHeight > 0 ? previewScrollSpaceHeight : 1

  return (
    <div ref={previewViewportRef} className="resume-preview-viewport">
      <div className="resume-preview-scroll-space" style={{ height: scrollSpaceHeight }}>
        <div
          className="resume-preview-stage-shell"
          style={{
            top: verticalPadding,
            transform: `translateX(-50%) scale(${previewScale})`,
            opacity: ready ? 1 : 0,
          }}
        >
          <div ref={previewContentRef} className="resume-preview-stage">
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}

function ResumePreviewDock({
  onExportImage,
  scale,
  ready,
  onZoomIn,
  onZoomOut,
  onCenter,
  onFit,
}: {
  onExportImage: () => void
  scale: number
  ready: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onCenter: () => void
  onFit: () => void
}) {
  const undo = useResumeBuilderStore(state => state.undo)
  const redo = useResumeBuilderStore(state => state.redo)

  return (
    <div className="resume-preview-dock-wrap no-print">
      <div className="resume-preview-dock">
        <Tooltip content="撤销">
          <Button type="text" size="small" icon={<IconUndo />} onClick={undo} className="resume-dock-btn" aria-label="撤销" />
        </Tooltip>
        <Tooltip content="重做">
          <Button type="text" size="small" icon={<IconRedo />} onClick={redo} className="resume-dock-btn" aria-label="重做" />
        </Tooltip>

        <span className="resume-preview-dock-divider" />

        <Tooltip content="放大">
          <Button
            type="text"
            size="small"
            icon={<ZoomIn className="h-4 w-4" />}
            onClick={onZoomIn}
            className="resume-dock-btn"
            aria-label="放大预览"
          />
        </Tooltip>
        <Tooltip content="缩小">
          <Button
            type="text"
            size="small"
            icon={<ZoomOut className="h-4 w-4" />}
            onClick={onZoomOut}
            className="resume-dock-btn"
            aria-label="缩小预览"
          />
        </Tooltip>
        <Tooltip content="重置缩放">
          <Button
            type="text"
            size="small"
            icon={<IconRefresh />}
            onClick={onCenter}
            className="resume-dock-btn"
            aria-label="恢复初始缩放"
          />
        </Tooltip>
        <Tooltip content="适应画布">
          <Button
            type="text"
            size="small"
            icon={<IconMaximize />}
            onClick={onFit}
            className="resume-dock-btn"
            aria-label="适应画布"
          />
        </Tooltip>
        <Tooltip content="导出">
          <Button
            type="text"
            size="small"
            icon={<IconDownload />}
            onClick={onExportImage}
            className="resume-dock-btn"
            aria-label="导出"
          />
        </Tooltip>

        <Button type="text" size="small" onClick={onCenter} className="resume-dock-btn text-xs tabular-nums">
          {ready ? `${Math.round(scale * 100)}%` : '适配中'}
        </Button>
      </div>
    </div>
  )
}

export function ResumeBuilderClient({ initialResume, dataSources }: ResumeBuilderClientProps) {
  const router = useRouter()
  const previewContentRef = useRef<HTMLDivElement>(null)
  const previewViewportRef = useRef<HTMLDivElement | null>(null)
  const exportPreviewRef = useRef<HTMLDivElement>(null)
  const sidePanelScrollRef = useRef<HTMLDivElement | null>(null)
  const smartOnePageFrameRef = useRef<number | null>(null)
  const typographyPopoverRef = useRef<HTMLDivElement | null>(null)
  const previewScaleRef = useRef(PREVIEW_INITIAL_SCALE)
  const initialPreviewScaleRef = useRef(PREVIEW_INITIAL_SCALE)
  const previewAutoFitDoneKeyRef = useRef('')
  const previewPendingScrollTopRef = useRef<number | null>(null)
  const previewContentHeightRef = useRef(0)

  const initialize = useResumeBuilderStore(state => state.initialize)
  const data = useResumeBuilderStore(state => state.data)
  const initialized = useResumeBuilderStore(state => state.initialized)
  const selectedDataSourceId = useResumeBuilderStore(state => state.selectedDataSourceId)
  const setSelectedDataSourceId = useResumeBuilderStore(state => state.setSelectedDataSourceId)
  const applyDataSource = useResumeBuilderStore(state => state.applyDataSource)
  const saveNow = useResumeBuilderStore(state => state.saveNow)
  const saveState = useResumeBuilderStore(state => state.save)
  const setSmartOnePage = useResumeBuilderStore(state => state.setSmartOnePage)

  const [activeTool, setActiveTool] = useState<BuilderTool>('sections')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isExportPreviewOpen, setIsExportPreviewOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'image'>('pdf')
  const [exportScope, setExportScope] = useState<'current' | 'all'>('all')
  const [exportImageMode, setExportImageMode] = useState<'paged' | 'continuous'>('paged')
  const [fillStrategy, setFillStrategy] = useState<'overwrite' | 'preserve'>('overwrite')
  const [sidePanelScrolling, setSidePanelScrolling] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const [resumeTitle, setResumeTitle] = useState(initialResume.title)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [isTypographyPopoverOpen, setIsTypographyPopoverOpen] = useState(false)
  const [spaceZoomActive, setSpaceZoomActive] = useState(false)
  const [previewInteractionActive, setPreviewInteractionActive] = useState(false)
  const [previewAutoFitReady, setPreviewAutoFitReady] = useState(false)
  const [previewScale, setPreviewScale] = useState(PREVIEW_INITIAL_SCALE)
  const [previewContentHeight, setPreviewContentHeight] = useState(0)
  const [editorFocusRequest, setEditorFocusRequest] = useState<EditorFocusRequest | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const focusRequestCounterRef = useRef(0)
  const resumeTitleRef = useRef(initialResume.title)
  const sidePanelScrollTimerRef = useRef<number | null>(null)
  const sidebarResizingRef = useRef<{
    pointerId: number
    startX: number
    startWidth: number
  } | null>(null)
  const isGuestDraft = initialResume.id.startsWith('guest-')
  const smartOnePage = data.metadata.page.smartOnePage || { enabled: false, status: 'idle', appliedScale: 0 }
  const previewFitKey = `${initialResume.id}:${initialized ? data.metadata.layout.pages.length : 0}`
  const previewScaledHeight = Math.max(previewContentHeight * previewScale, 0)
  const previewScrollSpaceHeight = previewScaledHeight + PREVIEW_SCROLL_VERTICAL_PADDING * 2
  const handlePreviewNavigate = useCallback((target: PreviewNavigationTarget) => {
    setIsTypographyPopoverOpen(false)
    setActiveTool('sections')
    focusRequestCounterRef.current += 1
    setEditorFocusRequest({
      ...target,
      requestId: focusRequestCounterRef.current,
    })
  }, [])
  const previewDocument = useMemo(
    () => <ResumeReactivePreview data={data} mode="editor" onNavigate={handlePreviewNavigate} />,
    [data, handlePreviewNavigate],
  )

  const handleSidePanelScroll = useCallback(() => {
    setSidePanelScrolling(true)
    if (sidePanelScrollTimerRef.current) {
      window.clearTimeout(sidePanelScrollTimerRef.current)
    }
    sidePanelScrollTimerRef.current = window.setTimeout(() => {
      setSidePanelScrolling(false)
      sidePanelScrollTimerRef.current = null
    }, 680)
  }, [])

  const handleSelectTool = useCallback((tool: BuilderTool) => {
    setIsTypographyPopoverOpen(false)
    setActiveTool(tool)
  }, [])

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' })
      const authed = response.ok
      setAuthenticated(authed)
      setAuthChecked(true)
      return authed
    } catch {
      setAuthenticated(false)
      setAuthChecked(true)
      return false
    }
  }, [])

  useEffect(() => {
    void checkAuthStatus()
  }, [checkAuthStatus])

  const ensureAuthForAction = useCallback(
    async (actionName: string) => {
      if (authenticated) return true

      const authed = authChecked ? authenticated : await checkAuthStatus()
      if (authed) return true

      Message.warning(`${actionName}需要登录后继续`)
      setAuthModalOpen(true)
      return false
    },
    [authChecked, authenticated, checkAuthStatus],
  )

  const setPreviewScaleCentered = useCallback((nextScaleRaw: number) => {
    const viewport = previewViewportRef.current
    const currentScale = previewScaleRef.current
    const nextScale = clamp(nextScaleRaw, PREVIEW_MIN_SCALE, PREVIEW_MAX_SCALE)

    if (Math.abs(nextScale - currentScale) < 0.001) return

    const nextScrollTop = resolveCenteredScrollTop(viewport, currentScale, nextScale, PREVIEW_SCROLL_VERTICAL_PADDING)
    previewScaleRef.current = nextScale
    setPreviewScale(nextScale)
    const nextScrollSpaceHeight = previewContentHeightRef.current * nextScale + PREVIEW_SCROLL_VERTICAL_PADDING * 2
    const maxScrollTop = resolvePreviewScrollMax(viewport, nextScrollSpaceHeight)
    previewPendingScrollTopRef.current = clamp(nextScrollTop, 0, maxScrollTop)
  }, [])

  const fitPreviewToHeight = useCallback(async (maxAttempts = 8) => {
    await ensureFontsReady()

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => resolve())
      })

      const viewport = previewViewportRef.current
      const previewContent = previewContentRef.current
      if (!hasPreviewLayoutReady(viewport, previewContent)) {
        await new Promise<void>(resolve => {
          window.setTimeout(() => resolve(), 32)
        })
        continue
      }

      const nextScale = resolvePreviewFitScale(viewport, previewContent)
      initialPreviewScaleRef.current = nextScale
      previewScaleRef.current = nextScale
      setPreviewScale(nextScale)
      previewPendingScrollTopRef.current = PREVIEW_SCROLL_VERTICAL_PADDING
      return true
    }

    return false
  }, [])

  const handlePreviewZoomIn = useCallback(() => {
    setPreviewAutoFitReady(true)
    setPreviewScaleCentered(previewScaleRef.current + PREVIEW_ZOOM_STEP_BUTTON)
  }, [setPreviewScaleCentered])

  const handlePreviewZoomOut = useCallback(() => {
    setPreviewAutoFitReady(true)
    setPreviewScaleCentered(previewScaleRef.current - PREVIEW_ZOOM_STEP_BUTTON)
  }, [setPreviewScaleCentered])

  const handlePreviewCenter = useCallback(() => {
    setPreviewAutoFitReady(true)
    const nextScale = initialPreviewScaleRef.current
    previewScaleRef.current = nextScale
    setPreviewScale(nextScale)
    const viewport = previewViewportRef.current
    const nextScrollSpaceHeight = previewContentHeightRef.current * nextScale + PREVIEW_SCROLL_VERTICAL_PADDING * 2
    const maxScrollTop = resolvePreviewScrollMax(viewport, nextScrollSpaceHeight)
    previewPendingScrollTopRef.current = clamp(PREVIEW_SCROLL_VERTICAL_PADDING, 0, maxScrollTop)
  }, [])

  useEffect(() => {
    previewScaleRef.current = previewScale
  }, [previewScale])

  useLayoutEffect(() => {
    const pendingScrollTop = previewPendingScrollTopRef.current
    if (pendingScrollTop === null) return
    const viewport = previewViewportRef.current
    if (!viewport) return
    const maxScrollTop = resolvePreviewScrollMax(viewport, previewScrollSpaceHeight)
    viewport.scrollTop = clamp(pendingScrollTop, 0, maxScrollTop)
    previewPendingScrollTopRef.current = null
  }, [previewScale, previewScrollSpaceHeight])

  useEffect(() => {
    previewContentHeightRef.current = previewContentHeight
  }, [previewContentHeight])

  useEffect(() => {
    const target = previewContentRef.current
    if (!target) return

    const updateHeight = () => {
      const nextHeight = target.offsetHeight
      setPreviewContentHeight(prev => (Math.abs(prev - nextHeight) < 1 ? prev : nextHeight))
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      updateHeight()
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [previewFitKey])

  useEffect(() => {
    setPreviewAutoFitReady(false)
  }, [previewFitKey])

  useEffect(() => {
    if (previewAutoFitDoneKeyRef.current === previewFitKey) return
    if (previewContentHeight <= 0) return

    let cancelled = false

    void (async () => {
      const fitted = await fitPreviewToHeight()
      if (cancelled) return
      if (fitted) {
        previewAutoFitDoneKeyRef.current = previewFitKey
      }
      setPreviewAutoFitReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [fitPreviewToHeight, previewContentHeight, previewFitKey])

  useEffect(() => {
    const viewport = previewViewportRef.current
    if (!viewport) return
    const maxScrollTop = resolvePreviewScrollMax(viewport, previewScrollSpaceHeight)
    if (viewport.scrollTop > maxScrollTop) {
      viewport.scrollTop = maxScrollTop
    }
  }, [previewScrollSpaceHeight])

  useEffect(() => {
    const viewport = previewViewportRef.current
    if (!viewport) return

    const onWheel = (event: WheelEvent) => {
      const shouldZoom = event.ctrlKey || event.metaKey || spaceZoomActive
      if (!shouldZoom) return

      event.preventDefault()
      event.stopPropagation()

      if (!event.deltaY) return
      const step = event.deltaY < 0 ? PREVIEW_ZOOM_STEP_WHEEL : -PREVIEW_ZOOM_STEP_WHEEL
      setPreviewScaleCentered(previewScaleRef.current + step)
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', onWheel)
    }
  }, [setPreviewScaleCentered, spaceZoomActive])

  useEffect(() => {
    setResumeTitle(initialResume.title)
    resumeTitleRef.current = initialResume.title
  }, [initialResume.title])

  useEffect(() => {
    const normalized = normalizeResumeContent(initialResume.content, {
      dataSource: dataSources.find(source => source.id === initialResume.dataSourceId) || null,
      templateId: initialResume.templateId,
      withBackup: true,
    })
    initialize({
      resumeId: initialResume.id,
      data: normalized.data,
      dataSources,
      selectedDataSourceId: initialResume.dataSourceId || dataSources[0]?.id || '',
    })
  }, [dataSources, initialResume.content, initialResume.dataSourceId, initialResume.id, initialResume.templateId, initialize])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.classList.add('resume-builder-mono')
    return () => {
      document.body.classList.remove('resume-builder-mono')
    }
  }, [])

  useEffect(() => {
    const nextTheme = resolveThemePreference()
    setTheme(currentTheme => (currentTheme === nextTheme ? currentTheme : nextTheme))
  }, [])

  useEffect(() => {
    return () => {
      if (sidePanelScrollTimerRef.current) {
        window.clearTimeout(sidePanelScrollTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      if (isEditableElement(event.target)) return
      if (!previewInteractionActive) return
      preventDefaultIfCancelable(event)
      event.stopPropagation()
      setSpaceZoomActive(true)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      if (previewInteractionActive && !isEditableElement(event.target)) {
        preventDefaultIfCancelable(event)
        event.stopPropagation()
      }
      setSpaceZoomActive(false)
    }

    const onWindowBlur = () => {
      setSpaceZoomActive(false)
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    window.addEventListener('blur', onWindowBlur)

    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [previewInteractionActive])

  useEffect(() => {
    if (!isTypographyPopoverOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!typographyPopoverRef.current || !(target instanceof Node)) {
        return
      }

      if (target instanceof Element && target.closest('.control-panel')) {
        return
      }

      if (!typographyPopoverRef.current.contains(target)) {
        setIsTypographyPopoverOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTypographyPopoverOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isTypographyPopoverOpen])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (isExportPreviewOpen) {
      document.body.classList.add('resume-print-preview-open')
    } else {
      document.body.classList.remove('resume-print-preview-open')
    }
    return () => {
      document.body.classList.remove('resume-print-preview-open')
    }
  }, [isExportPreviewOpen])

  useEffect(() => {
    if (!isExportPreviewOpen) return

    const handleEscapeClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExportPreviewOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscapeClose)
    return () => window.removeEventListener('keydown', handleEscapeClose)
  }, [isExportPreviewOpen])

  useEffect(() => {
    if (!initialized) return

    if (smartOnePageFrameRef.current) {
      cancelAnimationFrame(smartOnePageFrameRef.current)
      smartOnePageFrameRef.current = null
    }

    if (!smartOnePage.enabled) {
      if (smartOnePage.status !== 'idle' || smartOnePage.appliedScale !== 0) {
        setSmartOnePage({ status: 'idle', appliedScale: 0 })
      }
      return
    }

    smartOnePageFrameRef.current = requestAnimationFrame(() => {
      const previewRoot =
        exportPreviewRef.current?.querySelector('.resume-preview-root') ||
        previewContentRef.current?.querySelector('.resume-preview-root')

      if (!previewRoot) return

      const overflow = hasPreviewOverflow(previewRoot)

      if (!overflow) {
        if (smartOnePage.status !== 'fitted') {
          setSmartOnePage({ status: 'fitted' })
        }
        return
      }

      if (smartOnePage.appliedScale < SMART_ONE_PAGE_MAX_SCALE) {
        setSmartOnePage({
          status: 'idle',
          appliedScale: smartOnePage.appliedScale + 1,
        })
        return
      }

      if (smartOnePage.status !== 'overflow') {
        setSmartOnePage({ status: 'overflow' })
      }
    })

    return () => {
      if (smartOnePageFrameRef.current) {
        cancelAnimationFrame(smartOnePageFrameRef.current)
        smartOnePageFrameRef.current = null
      }
    }
  }, [data, initialized, setSmartOnePage, smartOnePage.appliedScale, smartOnePage.enabled, smartOnePage.status])

  const handleSidebarResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    preventDefaultIfCancelable(event)
    sidebarResizingRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: sidebarWidth,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleSidebarResizeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!sidebarResizingRef.current || sidebarResizingRef.current.pointerId !== event.pointerId) return
    preventDefaultIfCancelable(event)
    const deltaX = event.clientX - sidebarResizingRef.current.startX
    const rawWidth = sidebarResizingRef.current.startWidth + deltaX
    const nextWidth = clamp(rawWidth, SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX)
    setSidebarWidth(nextWidth)
  }

  const handleSidebarResizeEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!sidebarResizingRef.current || sidebarResizingRef.current.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    sidebarResizingRef.current = null
  }

  const handleFill = async (strategy: 'overwrite' | 'preserve') => {
    if (!(await ensureAuthForAction('数据填充'))) {
      return
    }

    if (!selectedDataSourceId) {
      Message.warning('请先选择数据源')
      return
    }

    applyDataSource(strategy, selectedDataSourceId)
    Message.success(strategy === 'overwrite' ? '数据源内容已覆盖填充' : '数据源内容已补充填充')
  }

  const saveResumeTitle = useCallback(async () => {
    const normalizedTitle = resumeTitle.trim()
    if (!normalizedTitle) {
      Message.warning('标题不能为空')
      setResumeTitle(resumeTitleRef.current || initialResume.title)
      return false
    }

    if (normalizedTitle === resumeTitleRef.current) {
      return true
    }

    if (!authenticated || isGuestDraft) {
      resumeTitleRef.current = normalizedTitle
      setResumeTitle(normalizedTitle)
      return true
    }

    setIsSavingTitle(true)
    try {
      const response = await fetch(`/api/resumes/${initialResume.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: normalizedTitle,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: '标题保存失败' }))
        throw new Error(payload.error || '标题保存失败')
      }

      resumeTitleRef.current = normalizedTitle
      setResumeTitle(normalizedTitle)
      return true
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '标题保存失败')
      return false
    } finally {
      setIsSavingTitle(false)
    }
  }, [authenticated, initialResume.id, initialResume.title, isGuestDraft, resumeTitle])

  const handleManualSave = useCallback(async () => {
    if (!(await ensureAuthForAction('保存简历'))) {
      return
    }

    const titleSaved = await saveResumeTitle()
    if (!titleSaved) return

    if (isGuestDraft) {
      try {
        const state = useResumeBuilderStore.getState()
        const title = resumeTitleRef.current.trim() || '未命名简历'
        const response = await fetch('/api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            templateId: state.data.metadata.template,
            dataSourceId: state.selectedDataSourceId || null,
            mode: 'form',
            content: {
              version: 2,
              builder: 'reactive-core',
              data: state.data,
              migratedAt: new Date().toISOString(),
            },
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: '创建云端简历失败' }))
          throw new Error(payload.error || '创建云端简历失败')
        }

        const payload = await response.json()
        const resumeId = payload?.resume?.id
        if (!resumeId) {
          throw new Error('创建云端简历失败')
        }

        Message.success('已创建云端简历，正在进入可保存版本')
        router.replace(`/resume/editor/${resumeId}`)
        return
      } catch (error) {
        Message.error(error instanceof Error ? error.message : '保存失败')
        return
      }
    }

    await saveNow()
    const state = useResumeBuilderStore.getState()
    if (state.save.status === 'saved') {
      Message.success('保存成功')
      return
    }

    if (state.save.status === 'error') {
      Message.error(state.save.error || '保存失败')
      return
    }

    Message.success('当前已是最新内容')
  }, [ensureAuthForAction, isGuestDraft, router, saveNow, saveResumeTitle])

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() !== 's' && event.code !== 'KeyS') return
      event.preventDefault()
      void handleManualSave()
    }

    window.addEventListener('keydown', onKeydown, { capture: true })
    return () => window.removeEventListener('keydown', onKeydown, { capture: true })
  }, [handleManualSave])

  const exportResumePagesAsImages = async (scope: 'current' | 'all' = 'all', imageMode: 'paged' | 'continuous' = 'paged') => {
    try {
      await ensureFontsReady()
      const html2canvas = await loadHtml2Canvas()
      const previewRoot = exportPreviewRef.current?.querySelector('.resume-preview-root')
      if (!previewRoot) {
        Message.error('请先进入导出预览后再导出图片')
        return
      }

      const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>('[data-template]'))
      if (pages.length === 0) {
        Message.error('当前没有可导出的页面')
        return
      }

      const selectedPages = scope === 'all' ? pages : [pages[0]]
      const normalizedTitle = (resumeTitleRef.current || initialResume.title || 'resume').trim().replace(/[^\w\u4e00-\u9fa5-]+/g, '-') || 'resume'
      const renderOptions = {
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      }

      if (imageMode === 'continuous') {
        const renderedCanvases: HTMLCanvasElement[] = []
        for (const page of selectedPages) {
          const canvas = await html2canvas(page, {
            ...renderOptions,
            windowWidth: page.scrollWidth,
            windowHeight: page.scrollHeight,
          })
          renderedCanvases.push(canvas)
        }

        const exportWidth = Math.max(...renderedCanvases.map(canvas => canvas.width))
        const exportHeight = renderedCanvases.reduce((sum, canvas) => sum + canvas.height, 0)
        if (!exportWidth || !exportHeight) {
          throw new Error('图片生成失败')
        }

        const stitchedCanvas = document.createElement('canvas')
        stitchedCanvas.width = exportWidth
        stitchedCanvas.height = exportHeight
        const context = stitchedCanvas.getContext('2d')
        if (!context) {
          throw new Error('图片生成失败')
        }

        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, exportWidth, exportHeight)
        let drawTop = 0
        renderedCanvases.forEach(canvas => {
          const drawLeft = Math.max(0, Math.floor((exportWidth - canvas.width) / 2))
          context.drawImage(canvas, drawLeft, drawTop)
          drawTop += canvas.height
        })

        const blob = await new Promise<Blob | null>(resolve => stitchedCanvas.toBlob(resolve, 'image/png', 1))
        if (!blob) {
          throw new Error('图片生成失败')
        }

        const filename = selectedPages.length === 1 ? `${normalizedTitle}.png` : `${normalizedTitle}-continuous.png`
        downloadBlob(blob, filename)
        Message.success(selectedPages.length === 1 ? '已导出当前页图片' : '已导出连续长图')
        return
      }

      for (let index = 0; index < selectedPages.length; index += 1) {
        const page = selectedPages[index]
        const canvas = await html2canvas(page, {
          ...renderOptions,
          windowWidth: page.scrollWidth,
          windowHeight: page.scrollHeight,
        })

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1))
        if (!blob) {
          throw new Error('图片生成失败')
        }

        const filename = selectedPages.length === 1 ? `${normalizedTitle}.png` : `${normalizedTitle}-p${index + 1}.png`
        downloadBlob(blob, filename)
      }

      Message.success(scope === 'all' ? `已导出 ${selectedPages.length} 张图片` : '已导出当前页图片')
    } catch (error) {
      Message.error(error instanceof Error ? error.message : '导出图片失败')
    }
  }

  const openExportPreview = (format: 'pdf' | 'image' = 'pdf') => {
    setExportFormat(format)
    setExportScope('all')
    setExportImageMode('paged')
    setIsExportPreviewOpen(true)
  }

  const printFromExportPreview = async () => {
    await ensureFontsReady()
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        window.print()
      }, 100)
    })
  }

  const handleExportAction = async () => {
    if (!(await ensureAuthForAction('导出下载'))) {
      return
    }

    if (exportFormat === 'image') {
      await exportResumePagesAsImages(exportScope, exportImageMode)
      return
    }

    await printFromExportPreview()
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="resume-builder-scope h-full flex flex-col overflow-hidden">
        <ResumeBuilderToolbar
          resumeTitle={resumeTitle}
          saveStatus={<SaveStatusTag />}
          saveLoading={isSavingTitle || saveState.status === 'saving'}
          onResumeTitleChange={setResumeTitle}
          onResumeTitleBlur={() => void saveResumeTitle()}
          onOpenExportPreview={() => openExportPreview('pdf')}
          onSave={() => void handleManualSave()}
        />

      <div className="flex-1 flex overflow-hidden">
        <aside className="resume-side-panel flex flex-col no-print flex-shrink-0" style={{ width: sidebarWidth }}>
          <div className="resume-side-shell">
            <div className="resume-side-tools">
              <div className="resume-side-tool-group">
                <SideToolHint label="内容编辑">
                  <button
                    type="button"
                    className={`resume-side-tool-btn ${activeTool === 'sections' ? 'is-active' : ''}`}
                    onClick={() => handleSelectTool('sections')}
                    aria-label="内容编辑"
                  >
                    <FilePenLine size={16} />
                  </button>
                </SideToolHint>
                <SideToolHint label="数据填充">
                  <button
                    type="button"
                    className={`resume-side-tool-btn ${activeTool === 'fill' ? 'is-active' : ''}`}
                    onClick={() => handleSelectTool('fill')}
                    aria-label="数据填充"
                  >
                    <PenLine size={16} />
                  </button>
                </SideToolHint>
              </div>
              <div className="resume-side-tools-divider" />

              <div className="resume-side-tool-group">
                <SideToolHint label="模板切换">
                  <button
                    type="button"
                    className={`resume-side-tool-btn ${activeTool === 'template' ? 'is-active' : ''}`}
                    onClick={() => handleSelectTool('template')}
                    aria-label="模板切换"
                  >
                    <LayoutTemplate size={16} />
                  </button>
                </SideToolHint>
                <div ref={typographyPopoverRef} className="resume-side-tool-popover-anchor">
                  <SideToolHint label="字体设置">
                    <button
                      type="button"
                      className={`resume-side-tool-btn ${isTypographyPopoverOpen ? 'is-active' : ''}`}
                      onClick={() => setIsTypographyPopoverOpen(prev => !prev)}
                      aria-label="字体设置"
                    >
                      <TypeIcon size={16} />
                    </button>
                  </SideToolHint>
                  {isTypographyPopoverOpen ? (
                    <div className="resume-side-tool-popover">
                      <div className="resume-side-tool-popover-title">字体设置</div>
                      <LayoutAndStylePanel pane="typography" />
                    </div>
                  ) : null}
                </div>
                <SideToolHint label="页面设置">
                  <button
                    type="button"
                    className={`resume-side-tool-btn ${activeTool === 'page' ? 'is-active' : ''}`}
                    onClick={() => handleSelectTool('page')}
                    aria-label="页面设置"
                  >
                    <FileText size={16} />
                  </button>
                </SideToolHint>
                <SideToolHint label="高级设置">
                  <button
                    type="button"
                    className={`resume-side-tool-btn ${activeTool === 'advanced' ? 'is-active' : ''}`}
                    onClick={() => handleSelectTool('advanced')}
                    aria-label="高级设置"
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                </SideToolHint>
              </div>

              <div className="resume-side-tools-spacer" />

              <SideToolHint label={theme === 'dark' ? '切换浅色' : '切换深色'}>
                <button
                  type="button"
                  className="resume-side-tool-btn"
                  onClick={() => {
                    const nextTheme = theme === 'dark' ? 'light' : 'dark'
                    setTheme(nextTheme)
                    document.documentElement.setAttribute('data-theme', nextTheme)
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
                    }
                  }}
                  aria-label={theme === 'dark' ? '切换浅色' : '切换深色'}
                  >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  </button>
              </SideToolHint>
            </div>

            <div className="resume-side-content">
              <div
                ref={sidePanelScrollRef}
                className={`resume-scroll-shell ${sidePanelScrolling ? 'is-scrolling' : ''}`}
                onScroll={handleSidePanelScroll}
              >
                <div className="resume-side-panel-body p-4">
                  {activeTool === 'sections' ? (
                    <IntegratedSectionsEditor focusRequest={editorFocusRequest} scrollContainerRef={sidePanelScrollRef} />
                  ) : null}
                  {activeTool === 'fill' ? (
                    <FillToolPanel
                      dataSources={dataSources}
                      selectedDataSourceId={selectedDataSourceId}
                      fillStrategy={fillStrategy}
                      onDataSourceChange={setSelectedDataSourceId}
                      onFillStrategyChange={setFillStrategy}
                      onFill={strategy => {
                        void handleFill(strategy)
                      }}
                    />
                  ) : null}
                  {activeTool !== 'sections' && activeTool !== 'fill' ? <LayoutAndStylePanel pane={activeTool} /> : null}
                </div>
              </div>
            </div>
          </div>
        </aside>
        <div
          className="resume-side-resizer no-print"
          role="separator"
          aria-label="调整侧边栏宽度"
          onPointerDown={handleSidebarResizeStart}
          onPointerMove={handleSidebarResizeMove}
          onPointerUp={handleSidebarResizeEnd}
          onPointerCancel={handleSidebarResizeEnd}
        />

        <div
          className="resume-preview-pane relative flex flex-1 flex-col overflow-hidden"
          onPointerEnter={() => setPreviewInteractionActive(true)}
          onPointerDown={() => setPreviewInteractionActive(true)}
          onPointerLeave={() => {
            setPreviewInteractionActive(false)
            setSpaceZoomActive(false)
          }}
        >
          <div className="flex-1 overflow-hidden">
            <ResumePreviewCanvas
              content={previewDocument}
              previewContentRef={previewContentRef}
              previewViewportRef={previewViewportRef}
              previewScale={previewScale}
              previewScrollSpaceHeight={previewScrollSpaceHeight}
              verticalPadding={PREVIEW_SCROLL_VERTICAL_PADDING}
              ready={previewAutoFitReady}
            />
            <ResumePreviewDock
              scale={previewScale}
              ready={previewAutoFitReady}
              onZoomIn={handlePreviewZoomIn}
              onZoomOut={handlePreviewZoomOut}
              onCenter={handlePreviewCenter}
              onFit={() => void fitPreviewToHeight()}
              onExportImage={() => openExportPreview('image')}
            />
          </div>
        </div>
      </div>

      <ExportWorkbench
        open={isExportPreviewOpen}
        onClose={() => setIsExportPreviewOpen(false)}
        exportPreviewRef={exportPreviewRef}
        exportFormat={exportFormat}
        exportScope={exportScope}
        exportImageMode={exportImageMode}
        onExportFormatChange={setExportFormat}
        onExportScopeChange={setExportScope}
        onExportImageModeChange={setExportImageMode}
        onExportAction={() => void handleExportAction()}
        preview={<ResumeReactivePreview data={data} mode="export" showPageNumbers className="resume-export-preview-root" />}
      />
      <AuthRequiredModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        redirectPath={typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/resume/templates'}
      />
      </div>
    </div>
  )
}
