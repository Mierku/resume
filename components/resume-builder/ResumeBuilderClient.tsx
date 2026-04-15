'use client'

import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
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
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  FileText,
  FolderOpen,
  GraduationCap,
  Handshake,
  Heart,
  Languages,
  Link2,
  Pencil,
  Sparkles,
  Target,
  type LucideIcon,
  User,
  Wrench,
} from 'lucide-react'
import {
  Button,
  Checkbox,
  Input,
  IconChevronRight,
  IconDelete,
  IconEye,
  IconGrip,
  IconMoreHorizontal,
  IconPlus,
  IconRefresh,
  Message,
  Option,
  Select,
  Space,
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
import { AuthRequiredModal, Modal } from '@/components/ui/Modal'
import { DateRangePickerField } from '@/components/ui/date-range-picker'
import { MonthPickerField } from '@/components/ui/month-picker'
import { toast } from '@/lib/toast'
import type { PreviewNavigationTarget } from '@/components/resume-reactive-preview'
import { useResumeBuilderStore } from './store/useResumeBuilderStore'
import { FillToolPanel } from './panels/FillToolPanel/FillToolPanel'
import { AIChatPanel } from './panels/AIChatPanel/AIChatPanel'
import { HeightDebugPanel } from './panels/HeightDebugPanel/HeightDebugPanel'
import { LayoutAndStylePanel } from './panels/LayoutAndStylePanel/LayoutAndStylePanel'
import { ResumeBuilderToolbar } from './layout/ResumeBuilderToolbar/ResumeBuilderToolbar'
import { useAuthSnapshot } from '@/lib/hooks/useAuthSnapshot'
import type { HeightDebugSnapshot } from '@/components/resume-reactive-preview/height-debug'
import {
  collectVisibleSectionIds,
  estimateCurrentTemplatePages,
  resolveTemplateContentMetrics,
  supportsMeasuredTemplatePagination,
} from '@/components/resume-reactive-preview/templates/estimate-current-template-height'
import {
  resolveSmartOnePageComputation,
} from '@/components/resume-reactive-preview/templates/smart-one-page'
import { ResumeOverlayWorkbench } from './workbench/ResumeOverlayWorkbench/ResumeOverlayWorkbench'
import { computeResumeCompleteness, type ResumeCompletenessResult } from './workbench/resume-completeness'
import { type ActiveBuilderTool, type BuilderTool } from './workbench/types'
import {
  BASICS_HEIGHT_LIMIT,
  BASICS_WEIGHT_LIMIT,
  createNestedPatch,
  DEFAULT_SKILL_PROFICIENCY,
  dedupeSectionIds,
  GENDER_OPTIONS,
  getNestedValue,
  getSectionDisplayTitle,
  isSectionHidden,
  isStandardSectionId,
  MARITAL_STATUS_OPTIONS,
  POLITICAL_STATUS_OPTIONS,
  resolveStandardSectionItemSummary,
  SECTION_FIELD_CONFIG,
  SKILL_PROFICIENCY_OPTIONS,
  STANDARD_SECTION_LABELS,
  supportsStandardSectionItemSummary,
  toSingleSelectValue,
  WORK_YEAR_OPTIONS,
} from './editor/section-editor-shared'
import './builder-theme.css'
import './workbench/workbench-layout.css'

const ResumeReactivePreview = dynamic(
  () => import('@/components/resume-reactive-preview').then(module => module.ResumeReactivePreview),
  { ssr: false },
)

const RichTextEditor = dynamic(
  () => import('./controls/RichTextEditor/RichTextEditor').then(module => module.RichTextEditor),
  { ssr: false },
)

const THEME_STORAGE_KEY = 'theme'
const EDITOR_PANEL_WIDTH_STORAGE_KEY = 'resume:editor-panel-width'
const AUTH_REDIRECT_DRAFT_CACHE_KEY = 'resume:auth-redirect-draft'
const AUTH_REDIRECT_DRAFT_MAX_AGE_MS = 30 * 60 * 1000
const AUTH_REDIRECT_RUNTIME_DRAFT_MAX_AGE_MS = 15 * 1000
const DEFAULT_TEXT_COLOR = '#111111'
const EDITOR_PANEL_WIDTH_DEFAULT = 412
const EDITOR_PANEL_WIDTH_MIN = 340
const EDITOR_PANEL_WIDTH_MAX = 720
const DEFAULT_EDITOR_SECTION_ORDER: string[] = ['experience', 'projects', 'education', 'summary', 'skills']
const DEFAULT_EDITOR_SECTION_SET = new Set(DEFAULT_EDITOR_SECTION_ORDER)
const ADDABLE_EDITOR_SECTION_ORDER: string[] = [
  ...DEFAULT_EDITOR_SECTION_ORDER,
  'profiles',
  'languages',
  'interests',
  'awards',
  'certifications',
  'publications',
  'volunteer',
  'references',
]
const RESUME_EDITOR_TAB_CHROME_PATH =
  'M 0,36 C 10,36 13.5,34 14,24 L 14,10 C 14.5,2 18,0 30,0 L 130,0 C 142,0 145.5,2 146,10 L 146,24 C 146.5,34 150,36 160,36 Z'
const RESUME_EDITOR_TAB_CHROME_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: 0,
}
const TAB_ICON_MAP: Record<string, LucideIcon> = {
  basics: User,
  intention: Target,
  summary: FileText,
  experience: Briefcase,
  projects: FolderOpen,
  education: GraduationCap,
  skills: Wrench,
  profiles: Link2,
  languages: Languages,
  interests: Heart,
  awards: Award,
  certifications: BadgeCheck,
  publications: BookOpen,
  volunteer: Handshake,
  references: User,
}

function createBuilderId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function renderEditorTabIcon(sectionId: string) {
  const Icon = TAB_ICON_MAP[sectionId] || FileText
  return <Icon className="resume-editor-tab-icon" size={13} strokeWidth={2} aria-hidden="true" />
}

function hasMeaningfulSectionValue(value: unknown, key?: string): boolean {
  if (key === 'id' || key === 'hidden' || key === 'options' || key === 'icon') return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'number') return Number.isFinite(value) && value > 0
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.some(item => hasMeaningfulSectionValue(item))
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([nestedKey, nestedValue]) =>
      hasMeaningfulSectionValue(nestedValue, nestedKey),
    )
  }
  return false
}

function hasMeaningfulStandardSectionContent(data: ResumeData, sectionId: StandardSectionType) {
  const section = data.sections[sectionId]
  if (!section) return false
  if (section.title.trim() || section.intro.trim()) return true
  return section.items.some(item => hasMeaningfulSectionValue(item))
}

function EditorSectionTabChromeBg() {
  return (
    <svg
      className="resume-editor-tab-bg"
      viewBox="0 0 160 36"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={RESUME_EDITOR_TAB_CHROME_STYLE}
      focusable="false"
    >
      <path d={RESUME_EDITOR_TAB_CHROME_PATH} />
    </svg>
  )
}

interface AuthRedirectDraftCachePayload {
  version: number
  resumeId: string
  path: string
  savedAt: number
  resumeTitle: string
  selectedDataSourceId: string
  data: ResumeData
}

let authRedirectRuntimeDraft:
  | {
      payload: AuthRedirectDraftCachePayload
      cachedAt: number
    }
  | null = null

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

function collectRuntimeSectionIdsForEstimate(data: ResumeData) {
  const layoutSectionIds = data.metadata.layout.pages.flatMap(page => [...(page.main || []), ...(page.sidebar || [])].filter(Boolean))
  return collectVisibleSectionIds(data, layoutSectionIds)
}

function estimateTemplatePageCountForData(data: ResumeData) {
  if (!supportsMeasuredTemplatePagination(data.metadata.template)) {
    return Math.max(data.metadata.layout.pages.length, 1)
  }

  const contentMetrics = resolveTemplateContentMetrics(data)
  if (!Number.isFinite(contentMetrics.contentMaxHeightPx) || contentMetrics.contentWidthPx <= 1) {
    return 1
  }

  const sectionIds = collectRuntimeSectionIdsForEstimate(data)
  return Math.max(
    estimateCurrentTemplatePages({
      data,
      sectionIds,
      contentWidthPx: contentMetrics.contentWidthPx,
    }).pages.length,
    1,
  )
}

function buildPreviewFitFingerprint(data: ResumeData) {
  return [
    data.metadata.template,
    data.metadata.page.format,
    data.metadata.page.marginX.toFixed(2),
    data.metadata.page.marginY.toFixed(2),
    data.metadata.page.gapX.toFixed(2),
    data.metadata.page.gapY.toFixed(2),
    data.metadata.typography.body.fontSize.toFixed(2),
    data.metadata.typography.body.lineHeight.toFixed(2),
    data.metadata.typography.heading.fontSize.toFixed(2),
    data.metadata.typography.heading.lineHeight.toFixed(2),
  ].join(':')
}

interface ScrubbableNumberInputProps {
  value: string
  placeholder: string
  suffix: string
  config: NumericLimitConfig
  onChange: (value: string) => void
}

function ScrubbableNumberInput({ value, placeholder, suffix, config, onChange }: ScrubbableNumberInputProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(value)
  const dragRef = useRef<{ pointerId: number; startX: number; startValue: number } | null>(null)

  const currentNumeric = useMemo(() => {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return clampToRange(parsed, config.min, config.max)
    }
    return config.defaultValue
  }, [config.defaultValue, config.max, config.min, value])

  useEffect(() => {
    if (!focused) {
      setDraft(value)
    }
  }, [focused, value])

  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.body.classList.remove('resume-number-scrubbing')
      }
    }
  }, [])

  const commitDraft = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      onChange('')
      return
    }

    const parsed = parseNumericInput(trimmed, config, currentNumeric)
    const formatted = formatNumericValue(parsed, config.step)
    setDraft(formatted)
    onChange(formatted)
  }

  const adjustBySteps = (steps: number) => {
    if (!steps) return
    const nextValue = clampToRange(currentNumeric + steps * config.step, config.min, config.max)
    const formatted = formatNumericValue(nextValue, config.step)
    setDraft(formatted)
    onChange(formatted)
  }

  const startScrub = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startValue: currentNumeric,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (typeof document !== 'undefined') {
      document.body.classList.add('resume-number-scrubbing')
    }
  }

  const moveScrub = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    event.preventDefault()
    const deltaX = event.clientX - drag.startX
    const steps = Math.round(deltaX / 8)
    if (!steps) return
    const nextValue = clampToRange(drag.startValue + steps * config.step, config.min, config.max)
    const formatted = formatNumericValue(nextValue, config.step)
    setDraft(formatted)
    onChange(formatted)
  }

  const endScrub = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    if (typeof document !== 'undefined') {
      document.body.classList.remove('resume-number-scrubbing')
    }
  }

  return (
    <div className="resume-scrub-number">
      <div className="resume-scrub-number-input-wrap">
        <Input
          className="resume-scrub-number-input"
          value={focused ? draft : value}
          onChange={setDraft}
          onFocus={() => {
            setFocused(true)
            setDraft(value)
          }}
          onBlur={() => {
            setFocused(false)
            commitDraft()
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
              return
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault()
              adjustBySteps(1)
              return
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault()
              adjustBySteps(-1)
            }
          }}
          inputMode="numeric"
          placeholder={placeholder}
        />
        <button
          type="button"
          className="resume-scrub-number-edge is-left"
          aria-label={`${placeholder} 左侧拖动调整`}
          title="按住左右拖动调整"
          onPointerDown={startScrub}
          onPointerMove={moveScrub}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        />
        <button
          type="button"
          className="resume-scrub-number-edge is-right"
          aria-label={`${placeholder} 右侧拖动调整`}
          title="按住左右拖动调整"
          onPointerDown={startScrub}
          onPointerMove={moveScrub}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
        />
      </div>
      <span className="resume-scrub-number-unit">{suffix}</span>
    </div>
  )
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

type AIPreviewIntent = 'translate_resume' | 'polish_resume' | 'adapt_to_jd'

interface AIPreviewState {
  data: ResumeData
  intent: AIPreviewIntent
  draftId?: string
  sourceResumeId?: string
  title?: string
  previewUrl?: string
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

type SnapdomOptions = {
  scale?: number
  width?: number
  height?: number
  backgroundColor?: string
  embedFonts?: boolean
  cache?: 'disabled' | 'soft' | 'auto' | 'full'
}

type SnapdomRenderer = {
  toCanvas: (element: HTMLElement, options?: SnapdomOptions) => Promise<HTMLCanvasElement>
}

type JsPdfPageOrientation = 'portrait' | 'landscape'

type JsPdfInstance = {
  internal: {
    pageSize: {
      getWidth: () => number
      getHeight: () => number
    }
  }
  addImage: (
    imageData: string | HTMLCanvasElement,
    format: 'PNG' | 'JPEG' | 'JPG' | 'WEBP',
    x: number,
    y: number,
    width: number,
    height: number,
    alias?: string,
    compression?: 'NONE' | 'FAST' | 'MEDIUM' | 'SLOW',
    rotation?: number,
  ) => void
  addPage: (format?: string | number[], orientation?: JsPdfPageOrientation) => void
  save: (filename: string) => void
}

type JsPdfConstructor = new (options?: {
  orientation?: JsPdfPageOrientation
  unit?: 'pt' | 'mm' | 'cm' | 'in' | 'px'
  format?: string | number[]
  compress?: boolean
}) => JsPdfInstance

declare global {
  interface Window {
    snapdom?: SnapdomRenderer
    jspdf?: {
      jsPDF?: JsPdfConstructor
    }
  }
}

const SNAPDOM_SCRIPT_ID = 'resume-snapdom-script'
const SNAPDOM_SCRIPT_SOURCES = [
  'https://unpkg.com/@zumer/snapdom@2.7.0/dist/snapdom.js',
  'https://cdn.jsdelivr.net/npm/@zumer/snapdom@2.7.0/dist/snapdom.js',
] as const

const JSPDF_SCRIPT_ID = 'resume-jspdf-script'
const JSPDF_SCRIPT_SOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
  'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js',
] as const

let snapdomLoadingPromise: Promise<SnapdomRenderer> | null = null
let jsPdfLoadingPromise: Promise<JsPdfConstructor> | null = null
const PREVIEW_INITIAL_SCALE = 0.6
const PREVIEW_MIN_SCALE = 0.3
const PREVIEW_MAX_SCALE = 6
const PREVIEW_FIT_HORIZONTAL_PADDING = 24
const PREVIEW_FIT_HEIGHT_PADDING = 16
const PREVIEW_SCROLL_VERTICAL_PADDING = 80
const PREVIEW_ZOOM_STEP_BUTTON = 0.06
const PREVIEW_ZOOM_STEP_WHEEL = 0.01  
const IMAGE_EXPORT_RENDER_SCALE = 2
const PDF_EXPORT_RENDER_SCALE = 1.5
const PDF_EXPORT_IMAGE_MIME = 'image/jpeg'
const PDF_EXPORT_IMAGE_FORMAT: ResumePdfWorkerPagePayload['format'] = 'JPEG'
const PDF_EXPORT_IMAGE_QUALITY = 0.84
const PDF_A4_WIDTH_MM = 210
const PDF_A4_HEIGHT_MM = 297
const PDF_MIN_FREE_FORM_HEIGHT_MM = 20
const PDF_WORKER_SCRIPT_VERSION = '2026-04-14-free-form-1'
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

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, mimeType, quality)
  })
}

function resolvePdfPageSizeMm(
  canvas: HTMLCanvasElement,
  pageFormat: ResumeData['metadata']['page']['format'],
) {
  const isLandscape = canvas.width >= canvas.height
  const widthMm = isLandscape ? PDF_A4_HEIGHT_MM : PDF_A4_WIDTH_MM
  const fixedHeightMm = isLandscape ? PDF_A4_WIDTH_MM : PDF_A4_HEIGHT_MM

  if (pageFormat !== 'free-form') {
    return { widthMm, heightMm: fixedHeightMm }
  }

  const ratio = canvas.width > 0 ? canvas.height / canvas.width : fixedHeightMm / widthMm
  const dynamicHeightMm = Math.max(PDF_MIN_FREE_FORM_HEIGHT_MM, widthMm * ratio)
  return { widthMm, heightMm: Number(dynamicHeightMm.toFixed(2)) }
}

type ResumeImageExportFormat = 'png' | 'jpg'

function removeExternalScript(script: HTMLScriptElement | null) {
  if (!script) return
  if (script.parentNode) {
    script.parentNode.removeChild(script)
  }
}

function waitForScriptGlobal<T>(
  script: HTMLScriptElement,
  resolver: () => T | null,
  errorMessage: string,
) {
  const resolved = resolver()
  if (resolved) {
    return Promise.resolve(resolved)
  }

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
    }

    const onLoad = () => {
      cleanup()
      const globalObject = resolver()
      if (globalObject) {
        resolve(globalObject)
        return
      }
      reject(new Error(errorMessage))
    }

    const onError = () => {
      cleanup()
      reject(new Error(errorMessage))
    }

    script.addEventListener('load', onLoad)
    script.addEventListener('error', onError)
  })
}

async function loadScriptGlobalWithFallback<T>(
  scriptId: string,
  sources: readonly string[],
  resolver: () => T | null,
  errorMessage: string,
) {
  const existing = document.getElementById(scriptId) as HTMLScriptElement | null
  if (existing) {
    try {
      return await waitForScriptGlobal(existing, resolver, errorMessage)
    } catch {
      removeExternalScript(existing)
    }
  }

  for (const source of sources) {
    const stale = document.getElementById(scriptId) as HTMLScriptElement | null
    removeExternalScript(stale)

    const script = document.createElement('script')
    script.id = scriptId
    script.src = source
    script.async = true
    document.body.appendChild(script)

    try {
      return await waitForScriptGlobal(script, resolver, errorMessage)
    } catch {
      removeExternalScript(script)
    }
  }

  throw new Error(errorMessage)
}

function loadSnapdom(): Promise<SnapdomRenderer> {
  const globalSnapdom = window.snapdom
  if (globalSnapdom && typeof globalSnapdom.toCanvas === 'function') {
    return Promise.resolve(globalSnapdom)
  }

  if (snapdomLoadingPromise) {
    return snapdomLoadingPromise
  }

  snapdomLoadingPromise = loadScriptGlobalWithFallback(
    SNAPDOM_SCRIPT_ID,
    SNAPDOM_SCRIPT_SOURCES,
    () => {
      const candidate = window.snapdom
      if (candidate && typeof candidate.toCanvas === 'function') {
        return candidate
      }
      return null
    },
    'snapdom 加载失败',
  ).finally(() => {
    snapdomLoadingPromise = null
  })

  return snapdomLoadingPromise
}

function loadJsPdf(): Promise<JsPdfConstructor> {
  const globalJsPdf = window.jspdf?.jsPDF
  if (globalJsPdf) {
    return Promise.resolve(globalJsPdf)
  }

  if (jsPdfLoadingPromise) {
    return jsPdfLoadingPromise
  }

  jsPdfLoadingPromise = loadScriptGlobalWithFallback(
    JSPDF_SCRIPT_ID,
    JSPDF_SCRIPT_SOURCES,
    () => window.jspdf?.jsPDF || null,
    'jsPDF 加载失败',
  ).finally(() => {
    jsPdfLoadingPromise = null
  })

  return jsPdfLoadingPromise
}

function nextAnimationFrame() {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => resolve())
  })
}

function buildPdfInWorker(payload: {
  filename: string
  pages: ResumePdfWorkerPagePayload[]
}): Promise<ResumePdfWorkerSuccessPayload> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      reject(new Error('当前环境不支持后台导出'))
      return
    }

    const worker = new Worker(`/resume-pdf.worker.js?v=${PDF_WORKER_SCRIPT_VERSION}`)

    const cleanup = () => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      worker.terminate()
    }

    const handleMessage = (event: MessageEvent<unknown>) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      const workerPayload = data as {
        type?: string
        error?: string
        blob?: Blob
        filename?: string
        size?: number
        timings?: ExportTimingEntry[]
      }

      if (workerPayload.type === 'BUILD_PDF_SUCCESS' && workerPayload.blob instanceof Blob) {
        cleanup()
        resolve({
          blob: workerPayload.blob,
          filename: workerPayload.filename || payload.filename,
          size: typeof workerPayload.size === 'number' ? workerPayload.size : workerPayload.blob.size,
          timings: Array.isArray(workerPayload.timings) ? workerPayload.timings : [],
        })
        return
      }

      if (workerPayload.type === 'BUILD_PDF_ERROR') {
        cleanup()
        reject(new Error(workerPayload.error || 'PDF 组装失败'))
      }
    }

    const handleError = () => {
      cleanup()
      reject(new Error('PDF Worker 执行失败'))
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage(
      {
        type: 'BUILD_PDF',
        filename: payload.filename,
        pages: payload.pages,
      },
      payload.pages.map(page => page.buffer),
    )
  })
}

interface ExportTimingEntry {
  step: string
  durationMs: number
}

interface PdfExportPageStat {
  page: number
  canvasWidth: number
  canvasHeight: number
  pixelCount: number
  blobBytes: number
  pageWidthMm: number
  pageHeightMm: number
}

interface ResumePdfWorkerPagePayload {
  width: number
  height: number
  widthMm: number
  heightMm: number
  format: 'PNG' | 'JPEG'
  buffer: ArrayBuffer
}

interface ResumePdfWorkerSuccessPayload {
  blob: Blob
  filename: string
  size: number
  timings: ExportTimingEntry[]
}

function formatDurationMs(durationMs: number) {
  if (!Number.isFinite(durationMs)) return '0ms'
  if (durationMs < 1000) {
    return `${Math.round(durationMs)}ms`
  }
  return `${(durationMs / 1000).toFixed(2)}s`
}

function createExportProfiler(label: string) {
  const startedAt = performance.now()
  const entries: ExportTimingEntry[] = []

  const record = (step: string, durationMs: number) => {
    entries.push({ step, durationMs })
  }

  return {
    async measure<T>(step: string, fn: () => Promise<T> | T): Promise<T> {
      const stepStartedAt = performance.now()
      try {
        return await fn()
      } finally {
        record(step, performance.now() - stepStartedAt)
      }
    },
    record,
    flush(meta?: Record<string, unknown>) {
      const totalDurationMs = performance.now() - startedAt
      const tableRows = [
        ...entries.map(entry => ({
          step: entry.step,
          durationMs: Number(entry.durationMs.toFixed(2)),
          duration: formatDurationMs(entry.durationMs),
        })),
        {
          step: 'total',
          durationMs: Number(totalDurationMs.toFixed(2)),
          duration: formatDurationMs(totalDurationMs),
        },
      ]

      console.groupCollapsed(`[Resume Export] ${label}`)
      console.table(tableRows)
      if (meta) {
        console.log('meta', meta)
      }
      console.groupEnd()

      return totalDurationMs
    },
  }
}

function createOffscreenExportCaptureRoot(sourceRoot: HTMLElement) {
  const captureHost = document.createElement('div')
  captureHost.setAttribute('aria-hidden', 'true')
  captureHost.style.position = 'fixed'
  captureHost.style.left = '-20000px'
  captureHost.style.top = '0'
  captureHost.style.opacity = '0'
  captureHost.style.pointerEvents = 'none'
  captureHost.style.zIndex = '-1'
  captureHost.style.width = 'max-content'
  captureHost.style.maxWidth = 'none'

  const clonedRoot = sourceRoot.cloneNode(true) as HTMLElement
  clonedRoot.style.setProperty('--resume-export-preview-scale', '1')
  clonedRoot.style.setProperty('zoom', '1')
  clonedRoot.style.setProperty('transform', 'none')
  clonedRoot.style.setProperty('margin-inline', '0')
  clonedRoot.style.setProperty('width', 'max-content')
  captureHost.appendChild(clonedRoot)

  document.body.appendChild(captureHost)
  return { captureHost, captureRoot: clonedRoot }
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

const ITEM_SORT_ACTIVATION_CONSTRAINT = {
  delay: 180,
  tolerance: 6,
} as const

const TAB_SORT_ACTIVATION_CONSTRAINT = {
  distance: 4,
} as const

function useEditorItemSortSensors() {
  return useSensors(useSensor(PointerSensor, { activationConstraint: ITEM_SORT_ACTIVATION_CONSTRAINT }))
}

function useEditorTabSortSensors() {
  return useSensors(useSensor(PointerSensor, { activationConstraint: TAB_SORT_ACTIVATION_CONSTRAINT }))
}

function resolveEditorItemId(rawId: unknown, fallback: string) {
  return String(rawId || fallback)
}

function resolveItemReorderIndexes(itemIds: string[], event: DragEndEvent) {
  const { active, over } = event
  if (!over) return null

  const activeId = String(active.id)
  const overId = String(over.id)
  if (!activeId || !overId || activeId === overId) return null

  const fromIndex = itemIds.indexOf(activeId)
  const toIndex = itemIds.indexOf(overId)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return null

  return {
    fromIndex,
    toIndex,
  }
}

function SortableEditorItemFrame({
  id,
  disabled = false,
  className,
  children,
}: {
  id: string
  disabled?: boolean
  className?: string
  children: (dragHandle: ReactNode) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const dragHandle = (
    <button
      type="button"
      className="resume-item-drag-handle"
      aria-label={disabled ? '当前只有一项，无法拖动排序' : '长按拖动排序'}
      disabled={disabled}
      onClick={event => event.stopPropagation()}
      {...(!disabled ? attributes : {})}
      {...(!disabled ? listeners : {})}
    >
      <IconGrip />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging ? 'true' : undefined}
      className={joinClassNames('resume-editor-sortable-item', className)}
    >
      {children(dragHandle)}
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

  const handlePreviewPhoto = () => {
    const url = String(picture.url || '').trim()
    if (!url || typeof window === 'undefined') return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDeletePhoto = () => {
    updateResumeData(draft => {
      draft.picture.url = ''
    })
    Message.success('已删除证件照')
  }

  return (
    <div className="space-y-4">
      <div className="resume-basics-grid grid grid-cols-2 gap-2">
        <EditorAnchor sectionId="basics" fieldKey="name">
          <label className="text-xs text-muted-foreground block mb-1">您的姓名</label>
          <Input value={basics.name} onChange={value => updateField('name', value)} placeholder="请输入姓名" />
        </EditorAnchor>

        <EditorAnchor sectionId="basics" fieldKey="picture" className="resume-basics-photo-field p-3">
          <div className="resume-basics-photo-head">
            <span className="resume-anchor-label text-xs text-muted-foreground">证件照</span>
            <label className="resume-basics-inline-checkbox">
              <Checkbox
                checked={!picture.hidden}
                onChange={checked =>
                  updateResumeData(draft => {
                    draft.picture.hidden = !Boolean(checked)
                  })
                }
              />
              展示照片
            </label>
          </div>

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

          <div className={joinClassNames('resume-basics-photo-preview-shell', picture.url && 'has-image')}>
            <button
              type="button"
              className={joinClassNames('resume-basics-photo-preview', !picture.url && 'is-empty')}
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              aria-label={picture.url ? '更换证件照' : '上传证件照'}
            >
              {photoUploading ? (
                <div className="resume-basics-photo-placeholder">
                  <span>上传中...</span>
                </div>
              ) : picture.url ? (
                <div
                  role="img"
                  aria-label="证件照预览"
                  className="resume-basics-photo-image"
                  style={{ backgroundImage: `url(${picture.url})` }}
                />
              ) : (
                <div className="resume-basics-photo-placeholder">
                  <span>点击上传证件照</span>
                  <span>一寸比例（5:7）</span>
                </div>
              )}
            </button>

            {picture.url ? (
              <div className="resume-basics-photo-hover-actions">
                <button
                  type="button"
                  className="resume-basics-photo-hover-btn"
                  onClick={event => {
                    event.preventDefault()
                    event.stopPropagation()
                    handlePreviewPhoto()
                  }}
                >
                  <IconEye />
                  预览
                </button>
                <button
                  type="button"
                  className="resume-basics-photo-hover-btn is-danger"
                  onClick={event => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleDeletePhoto()
                  }}
                >
                  <IconDelete />
                  删除
                </button>
              </div>
            ) : null}
          </div>

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

        <EditorAnchor sectionId="basics" fieldKey="birthDate convertBirthToAge">
          <div className="resume-basics-label-row">
            <label className="text-xs text-muted-foreground block">出生年月</label>
            <label className="resume-basics-inline-checkbox">
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
          </div>
          <MonthPickerField
            label="出生年月"
            value={basics.birthDate}
            placeholder="不填"
            maxValue={dateToYearMonth(new Date())}
            showLabel={false}
            showTriggerIcon={false}
            onChange={nextValue => updateField('birthDate', nextValue)}
          />
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
          <div className="grid grid-cols-2 gap-2">
            <ScrubbableNumberInput
              value={basics.heightCm}
              placeholder="身高"
              suffix="cm"
              config={BASICS_HEIGHT_LIMIT}
              onChange={nextValue => updateField('heightCm', nextValue)}
            />
            <ScrubbableNumberInput
              value={basics.weightKg}
              placeholder="体重"
              suffix="kg"
              config={BASICS_WEIGHT_LIMIT}
              onChange={nextValue => updateField('weightKg', nextValue)}
            />
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
  const reorderItem = useResumeBuilderStore(state => state.reorderStandardSectionItem)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)
  const updateItem = useResumeBuilderStore(state => state.updateStandardSectionItem)
  const removeItem = useResumeBuilderStore(state => state.removeStandardSectionItem)
  const sortSensors = useEditorItemSortSensors()
  const sortableItemIds = useMemo(
    () => section.items.map((item, index) => resolveEditorItemId(item.id, `skills-${index}`)),
    [section.items],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const indexes = resolveItemReorderIndexes(sortableItemIds, event)
    if (!indexes) return
    reorderItem('skills', indexes.fromIndex, indexes.toIndex)
  }

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

      {section.items.length > 0 ? (
        <DndContext sensors={sortSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
            <div className="resume-skill-inline-list">
              {section.items.map((item, index) => {
                const itemId = resolveEditorItemId(item.id, `skills-${index}`)

                return (
                  <SortableEditorItemFrame key={itemId} id={itemId} disabled={section.items.length < 2}>
                    {dragHandle => (
                      <div className="resume-soft-card resume-skill-inline-card">
                        <div className="resume-skill-inline-content">
                          <div className="resume-skill-inline-drag">{dragHandle}</div>

                          <EditorAnchor sectionId="skills" itemId={itemId} fieldKey="name" className="resume-skill-inline-field is-name">
                            <Input
                              value={item.name}
                              onChange={value => updateItem('skills', index, { name: value })}
                              placeholder="技能名称"
                            />
                          </EditorAnchor>

                          <EditorAnchor
                            sectionId="skills"
                            itemId={itemId}
                            fieldKey="proficiency"
                            className="resume-skill-inline-field is-proficiency"
                          >
                            <Select
                              value={item.proficiency || DEFAULT_SKILL_PROFICIENCY}
                              onChange={value =>
                                updateItem('skills', index, {
                                  proficiency: toSingleSelectValue(value) || DEFAULT_SKILL_PROFICIENCY,
                                })
                              }
                              placeholder="选择熟练度"
                              style={{ width: '100%' }}
                            >
                              {SKILL_PROFICIENCY_OPTIONS.map(option => (
                                <Option key={option.value} value={option.value}>
                                  {option.label}
                                </Option>
                              ))}
                            </Select>
                          </EditorAnchor>

                          <div className="resume-skill-inline-actions">
                            <Button
                              type="text"
                              size="mini"
                              status="danger"
                              icon={<IconDelete />}
                              onClick={() => removeItem('skills', index)}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </SortableEditorItemFrame>
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="resume-skill-inline-empty text-xs text-muted-foreground">点击下方“新增条目”添加技能词条</div>
      )}
    </div>
  )
}

function StandardSectionEditor({ sectionId }: { sectionId: StandardSectionType }) {
  const section = useResumeBuilderStore(state => state.data.sections[sectionId])
  const reorderItem = useResumeBuilderStore(state => state.reorderStandardSectionItem)
  const updateItem = useResumeBuilderStore(state => state.updateStandardSectionItem)
  const removeItem = useResumeBuilderStore(state => state.removeStandardSectionItem)
  const [collapsedItemIds, setCollapsedItemIds] = useState<string[]>([])
  const collapseEnabled = supportsStandardSectionItemSummary(sectionId)
  const sortSensors = useEditorItemSortSensors()
  const sortableItemIds = useMemo(
    () => section.items.map((item, index) => resolveEditorItemId(item.id, `${sectionId}-${index}`)),
    [section.items, sectionId],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const indexes = resolveItemReorderIndexes(sortableItemIds, event)
    if (!indexes) return
    reorderItem(sectionId, indexes.fromIndex, indexes.toIndex)
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sortSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {section.items.map((item, index) => {
              const record = item as unknown as Record<string, unknown>
              const fields = SECTION_FIELD_CONFIG[sectionId]
              const itemId = resolveEditorItemId(item.id, `${sectionId}-${index}`)
              const summary = resolveStandardSectionItemSummary(sectionId, record)
              const collapsed = collapseEnabled && collapsedItemIds.includes(itemId)
              const toggleCollapsed = () => {
                if (!collapseEnabled) return
                setCollapsedItemIds(prev => (prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]))
              }

              return (
                <SortableEditorItemFrame key={itemId} id={itemId} disabled={section.items.length < 2}>
                  {dragHandle => (
                    <EditorAnchor
                      sectionId={sectionId}
                      itemId={itemId}
                      className={`resume-soft-card resume-standard-item-card p-3 ${collapsed ? 'is-collapsed' : 'is-expanded'}`}
                    >
                      <div
                        className={`resume-standard-item-head ${collapseEnabled ? 'is-collapsible' : ''}`}
                        role={collapseEnabled ? 'button' : undefined}
                        tabIndex={collapseEnabled ? 0 : undefined}
                        aria-expanded={collapseEnabled ? !collapsed : undefined}
                        onClick={toggleCollapsed}
                        onKeyDown={event => {
                          if (!collapseEnabled) return
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            toggleCollapsed()
                          }
                        }}
                      >
                        <div className="resume-standard-item-head-main">
                          {dragHandle}
                          {collapseEnabled ? (
                            <span className={joinClassNames('resume-standard-item-head-toggle', !collapsed && 'is-expanded')}>
                              <IconChevronRight />
                            </span>
                          ) : null}
                          {summary ? (
                            <div className="resume-standard-item-summary" title={`${summary.primary} / ${summary.secondary}`}>
                              <span className="resume-standard-item-summary-primary">{summary.primary}</span>
                              <span className="resume-standard-item-summary-sep">/</span>
                              <span className="resume-standard-item-summary-secondary">{summary.secondary}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="resume-standard-item-head-actions">
                          <Space>
                            <Button
                              type="text"
                              size="mini"
                              status="danger"
                              icon={<IconDelete />}
                              onClick={event => {
                                event.stopPropagation()
                                removeItem(sectionId, index)
                              }}
                            />
                          </Space>
                        </div>
                      </div>

                      <CollapseMotion open={!collapsed} className="resume-standard-item-collapse">
                        <div className="resume-standard-item-content">
                          {fields.map(field => {
                            const currentValue = getNestedValue(record, field.key)
                            const fieldClassName = joinClassNames(
                              'resume-standard-item-field',
                              (field.type === 'rich' || field.type === 'keywords') && 'is-wide',
                            )

                            if (field.type === 'rich') {
                              return (
                                <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key} className={fieldClassName}>
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
                                <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key} className={fieldClassName}>
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
                                <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key} className={fieldClassName}>
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
                                <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key} className={fieldClassName}>
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
                                <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key} className={fieldClassName}>
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
                              <EditorAnchor key={field.key} sectionId={sectionId} itemId={itemId} fieldKey={field.key} className={fieldClassName}>
                                <label className="text-xs text-muted-foreground block mb-1">{field.label}</label>
                                <Input
                                  value={String(currentValue || '')}
                                  onChange={value => updateItem(sectionId, index, createNestedPatch(record, field.key, value))}
                                />
                              </EditorAnchor>
                            )
                          })}
                        </div>
                      </CollapseMotion>
                    </EditorAnchor>
                  )}
                </SortableEditorItemFrame>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function CustomSectionInlineEditor({ sectionId }: { sectionId: string }) {
  const section = useResumeBuilderStore(state => state.data.customSections.find(item => item.id === sectionId))
  const updateCustomSection = useResumeBuilderStore(state => state.updateCustomSection)
  const reorderCustomItem = useResumeBuilderStore(state => state.reorderCustomSectionItem)
  const updateCustomItem = useResumeBuilderStore(state => state.updateCustomSectionItem)
  const removeCustomItem = useResumeBuilderStore(state => state.removeCustomSectionItem)
  const sortSensors = useEditorItemSortSensors()

  if (!section) {
    return <div className="text-xs text-muted-foreground">该自定义板块不存在</div>
  }

  const sortableItemIds = section.items.map((item, index) => resolveEditorItemId(item.id, `${section.id}-${index}`))
  const handleDragEnd = (event: DragEndEvent) => {
    const indexes = resolveItemReorderIndexes(sortableItemIds, event)
    if (!indexes) return
    reorderCustomItem(section.id, indexes.fromIndex, indexes.toIndex)
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

      <DndContext sensors={sortSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {section.items.map((item, index) => {
              const itemId = resolveEditorItemId(item.id, `${section.id}-${index}`)

              return (
                <SortableEditorItemFrame key={itemId} id={itemId} disabled={section.items.length < 2}>
                  {dragHandle => (
                    <EditorAnchor sectionId={section.id} itemId={itemId} className="resume-soft-card p-2">
                      <div className="resume-custom-inline-item-head">
                        <div className="resume-custom-inline-item-drag">{dragHandle}</div>
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
                          <EditorAnchor sectionId={section.id} itemId={itemId} fieldKey="recipient">
                            <label className="block text-xs text-muted-foreground">收件人信息</label>
                            <RichTextEditor
                              value={String((item as unknown as { recipient?: string }).recipient || '')}
                              onChange={value => updateCustomItem(section.id, index, { recipient: value })}
                              minHeight={80}
                            />
                          </EditorAnchor>

                          <EditorAnchor sectionId={section.id} itemId={itemId} fieldKey="content">
                            <label className="block text-xs text-muted-foreground">正文</label>
                            <RichTextEditor
                              value={String((item as unknown as { content?: string }).content || '')}
                              onChange={value => updateCustomItem(section.id, index, { content: value })}
                              minHeight={120}
                            />
                          </EditorAnchor>
                        </div>
                      ) : (
                        <EditorAnchor sectionId={section.id} itemId={itemId} fieldKey="content">
                          <RichTextEditor
                            value={String((item as unknown as { content?: string }).content || '')}
                            onChange={value => updateCustomItem(section.id, index, { content: value })}
                            minHeight={120}
                          />
                        </EditorAnchor>
                      )}
                    </EditorAnchor>
                  )}
                </SortableEditorItemFrame>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
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

interface CollapseMotionProps {
  open: boolean
  className?: string
  children: ReactNode
}

function CollapseMotion({ open, className, children }: CollapseMotionProps) {
  const [animate, setAnimate] = useState(false)
  const [height, setHeight] = useState<string>(open ? 'auto' : '0px')
  const contentRef = useRef<HTMLDivElement | null>(null)
  const firstRenderRef = useRef(true)
  const firstFrameRef = useRef<number | null>(null)
  const secondFrameRef = useRef<number | null>(null)

  const cancelScheduledFrames = () => {
    if (firstFrameRef.current !== null) {
      cancelAnimationFrame(firstFrameRef.current)
      firstFrameRef.current = null
    }

    if (secondFrameRef.current !== null) {
      cancelAnimationFrame(secondFrameRef.current)
      secondFrameRef.current = null
    }
  }

  const scheduleTransition = (callback: () => void) => {
    firstFrameRef.current = requestAnimationFrame(() => {
      firstFrameRef.current = null
      secondFrameRef.current = requestAnimationFrame(() => {
        secondFrameRef.current = null
        callback()
      })
    })
  }

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }

    cancelScheduledFrames()

    if (open) {
      const nextHeight = contentRef.current?.scrollHeight || 0
      setAnimate(false)
      setHeight('0px')

      scheduleTransition(() => {
        setAnimate(true)
        setHeight(`${nextHeight}px`)
      })
      return
    }

    const currentHeight = contentRef.current?.scrollHeight || 0
    setAnimate(false)
    setHeight(`${currentHeight}px`)

    scheduleTransition(() => {
      setAnimate(true)
      setHeight('0px')
    })
  }, [open])

  useEffect(() => {
    return () => {
      cancelScheduledFrames()
    }
  }, [])

  return (
    <div
      className={joinClassNames('resume-collapse-motion', animate && 'is-animating', className)}
      style={{ height, pointerEvents: open ? 'auto' : 'none' }}
      aria-hidden={!open}
      onTransitionEnd={event => {
        if (event.target !== event.currentTarget || event.propertyName !== 'height') return

        if (open) {
          setAnimate(false)
          setHeight('auto')
          return
        }

        setAnimate(false)
        setHeight('0px')
      }}
    >
      <div ref={contentRef} className="resume-collapse-motion-inner">
        {children}
      </div>
    </div>
  )
}

interface SortableEditorSectionTabProps {
  sectionId: string
  title: string
  active: boolean
  hidden: boolean
  locked?: boolean
  onSelect: () => void
}

function SortableEditorSectionTab({
  sectionId,
  title,
  active,
  hidden,
  locked = false,
  onSelect,
}: SortableEditorSectionTabProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionId,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
  })
  const horizontalTransform = transform ? { ...transform, y: 0 } : null
  const resolvedTransition = isDragging
    ? 'none'
    : transition
      ? `${transition}, background-color 200ms ease, border-color 200ms ease, color 200ms ease, opacity 200ms ease`
      : undefined
  const style: CSSProperties = {
    transform: CSS.Transform.toString(horizontalTransform),
    transition: resolvedTransition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={joinClassNames(
        'resume-editor-tab',
        active && 'is-active',
        hidden && 'is-hidden',
        locked && 'is-locked',
        isDragging && 'is-dragging',
      )}
      role="presentation"
      data-dragging={isDragging ? 'true' : undefined}
    >
      <EditorSectionTabChromeBg />
      <span className="resume-editor-tab-hover-bg" aria-hidden="true" />
      <button
        type="button"
        className="resume-editor-tab-select"
        aria-selected={active}
        onClick={onSelect}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
        {...attributes}
        {...listeners}
      >
        <span className="resume-editor-tab-label-row">
          {renderEditorTabIcon(sectionId)}
          <span className="resume-editor-tab-title">{title}</span>
          {hidden ? <span className="resume-editor-tab-meta">已隐藏</span> : null}
        </span>
      </button>
    </div>
  )
}

interface SortableExistingModuleRowProps {
  sectionId: string
  title: string
  canRename: boolean
  canDelete: boolean
  onRename: () => void
  onDelete: () => void
}

function SortableExistingModuleRow({
  sectionId,
  title,
  canRename,
  canDelete,
  onRename,
  onDelete,
}: SortableExistingModuleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionId,
    transition: {
      duration: 180,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    },
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={joinClassNames('resume-editor-existing-module-row', isDragging && 'is-dragging')}
      data-dragging={isDragging ? 'true' : undefined}
    >
      <button
        type="button"
        className="resume-editor-existing-module-grip"
        aria-label={`拖拽排序${title}`}
        {...attributes}
        {...listeners}
      >
        <IconGrip />
      </button>
      <span className="resume-editor-existing-module-label">{title}</span>
      <div className="resume-editor-existing-module-actions">
        <button
          type="button"
          className={joinClassNames('resume-editor-existing-module-action', !canRename && 'is-disabled')}
          disabled={!canRename}
          onClick={event => {
            event.stopPropagation()
            if (!canRename) return
            onRename()
          }}
          aria-label={`重命名${title}`}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className={joinClassNames('resume-editor-existing-module-action', !canDelete && 'is-disabled')}
          disabled={!canDelete}
          onClick={event => {
            event.stopPropagation()
            if (!canDelete) return
            onDelete()
          }}
          aria-label={`删除${title}`}
        >
          <IconDelete />
        </button>
      </div>
    </div>
  )
}

function IntegratedSectionsEditor({
  focusRequest,
  completeness,
  scrollContainerRef,
  onOpenAIDiagnosis,
}: {
  focusRequest: EditorFocusRequest | null
  completeness: ResumeCompletenessResult
  scrollContainerRef: RefObject<HTMLDivElement | null>
  onOpenAIDiagnosis: () => void
}) {
  const data = useResumeBuilderStore(state => state.data)
  const addStandardSectionItem = useResumeBuilderStore(state => state.addStandardSectionItem)
  const addCustomSectionItem = useResumeBuilderStore(state => state.addCustomSectionItem)
  const removeCustomSection = useResumeBuilderStore(state => state.removeCustomSection)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)
  const [activeSectionId, setActiveSectionId] = useState<string>('basics')
  const [openTabMenuId, setOpenTabMenuId] = useState<string | null>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
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
  const highlightedTargetRef = useRef<HTMLElement | null>(null)
  const highlightTimerRef = useRef<number | null>(null)
  const tabTrackShellRef = useRef<HTMLDivElement | null>(null)
  const [showTabsLeftMask, setShowTabsLeftMask] = useState(false)
  const [showTabsRightMask, setShowTabsRightMask] = useState(false)
  const tabSortSensors = useEditorTabSortSensors()

  const updateTabsOverflowMask = useCallback(() => {
    const shell = tabTrackShellRef.current
    if (!shell) {
      setShowTabsLeftMask(false)
      setShowTabsRightMask(false)
      return
    }

    const maxScrollLeft = shell.scrollWidth - shell.clientWidth
    if (maxScrollLeft <= 1) {
      setShowTabsLeftMask(false)
      setShowTabsRightMask(false)
      return
    }

    const leftVisible = shell.scrollLeft > 5
    const rightVisible = shell.scrollLeft + shell.clientWidth < shell.scrollWidth - 5
    setShowTabsLeftMask(leftVisible)
    setShowTabsRightMask(rightVisible)
  }, [])

  const layoutSectionIds = useMemo(() => {
    const firstPage = data.metadata.layout.pages[0]
    const customIds = data.customSections.map(section => section.id)
    const known = new Set(['summary', ...STANDARD_SECTION_IDS, ...customIds])
    const shouldDisplayByContent = (sectionId: string) => {
      if (DEFAULT_EDITOR_SECTION_SET.has(sectionId)) return true
      if (sectionId === 'summary') {
        return Boolean(data.summary.content?.trim())
      }

      if (isStandardSectionId(sectionId)) {
        return hasMeaningfulStandardSectionContent(data, sectionId)
      }

      return customIds.includes(sectionId)
    }

    if (!firstPage) {
      return [...DEFAULT_EDITOR_SECTION_ORDER, ...customIds]
    }

    return dedupeSectionIds([...(firstPage.main || []), ...(firstPage.sidebar || [])]).filter(
      sectionId => known.has(sectionId) && shouldDisplayByContent(sectionId),
    )
  }, [data])

  const tabs = useMemo(() => {
    const dynamicTabs = layoutSectionIds
      .filter(sectionId => sectionId !== 'basics' && sectionId !== 'intention')
      .map(sectionId => ({
        id: sectionId,
        title: getSectionDisplayTitle(data, sectionId),
        hidden: isSectionHidden(data, sectionId),
        locked: false,
        removable: true,
        sortable: true,
      }))

    return [
      {
        id: 'basics',
        title: '基本信息',
        hidden: false,
        locked: true,
        removable: false,
        sortable: false,
      },
      {
        id: 'intention',
        title: '求职意向',
        hidden: false,
        locked: true,
        removable: false,
        sortable: false,
      },
      ...dynamicTabs,
    ]
  }, [data, layoutSectionIds])

  const sortableTabIds = useMemo(() => tabs.filter(tab => tab.sortable).map(tab => tab.id), [tabs])

  useEffect(() => {
    if (tabs.some(tab => tab.id === activeSectionId)) return
    setActiveSectionId(tabs[0]?.id || 'basics')
  }, [activeSectionId, tabs])

  useEffect(() => {
    if (!openTabMenuId) return
    if (tabs.some(tab => tab.id === openTabMenuId)) return
    setOpenTabMenuId(null)
  }, [openTabMenuId, tabs])

  useEffect(() => {
    updateTabsOverflowMask()
  }, [tabs, updateTabsOverflowMask])

  useEffect(() => {
    const shell = tabTrackShellRef.current
    if (!shell) return

    const onScroll = () => {
      updateTabsOverflowMask()
    }

    shell.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateTabsOverflowMask)

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updateTabsOverflowMask()
      })
      resizeObserver.observe(shell)
      const track = shell.querySelector('.resume-editor-tabs-track')
      if (track instanceof HTMLElement) {
        resizeObserver.observe(track)
      }
    }

    return () => {
      shell.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateTabsOverflowMask)
      resizeObserver?.disconnect()
    }
  }, [updateTabsOverflowMask, tabs.length])

  useEffect(() => {
    if (!openTabMenuId && !addMenuOpen) return

    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return
      if (event.target.closest('.resume-editor-menu-shell') || event.target.closest('.resume-editor-add-shell')) return
      setOpenTabMenuId(null)
      setAddMenuOpen(false)
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenTabMenuId(null)
        setAddMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [addMenuOpen, openTabMenuId])

  useEffect(() => {
    if (!focusRequest) return

    let cancelled = false
    let retryTimer: number | null = null
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

    if (tabs.some(tab => tab.id === focusRequest.sectionId)) {
      setActiveSectionId(focusRequest.sectionId)
    }

    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => {
        revealTarget()
      })
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frameA)
      cancelAnimationFrame(frameB)
      if (retryTimer) {
        window.clearTimeout(retryTimer)
      }
    }
  }, [focusRequest, scrollContainerRef, tabs])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current)
      }
      highlightedTargetRef.current?.classList.remove('is-preview-focused')
    }
  }, [])

  const toggleSectionHidden = (sectionId: string, nextHidden: boolean) => {
    if (sectionId === 'basics' || sectionId === 'intention') {
      Message.warning('基础板块不支持隐藏')
      return
    }

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

  const openRenameDialog = (sectionId: string) => {
    if (sectionId === 'basics' || sectionId === 'intention') {
      Message.warning('基础板块不支持重命名')
      return
    }

    const currentTitle = getSectionDisplayTitle(data, sectionId)
    setRenameModal({
      open: true,
      sectionId,
      value: currentTitle,
    })
    setOpenTabMenuId(null)
  }

  const openDeleteDialog = (sectionId: string) => {
    if (sectionId === 'basics' || sectionId === 'intention') {
      Message.warning('基础板块不支持删除')
      return
    }

    setDeleteModal({
      open: true,
      sectionId,
      title: getSectionDisplayTitle(data, sectionId),
    })
    setOpenTabMenuId(null)
  }

  const addSectionItem = (sectionId: string) => {
    if (sectionId === 'summary' || sectionId === 'basics' || sectionId === 'intention') {
      return
    }

    if (isStandardSectionId(sectionId)) {
      addStandardSectionItem(sectionId)
      return
    }

    addCustomSectionItem(sectionId)
  }

  const resolveNextActiveTab = (removedSectionId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === removedSectionId)
    if (currentIndex < 0) return tabs[0]?.id || 'basics'
    return tabs[currentIndex + 1]?.id || tabs[currentIndex - 1]?.id || 'basics'
  }

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

    const sectionId = deleteModal.sectionId
    const nextActiveTab = resolveNextActiveTab(sectionId)
    const isCustomSection = !isStandardSectionId(sectionId) && sectionId !== 'summary'

    if (isCustomSection) {
      removeCustomSection(sectionId)
    } else {
      updateResumeData(draft => {
        if (sectionId === 'summary') {
          draft.summary.hidden = true
        } else if (isStandardSectionId(sectionId)) {
          draft.sections[sectionId].hidden = true
        }

        draft.metadata.layout.pages = draft.metadata.layout.pages.map(page => ({
          ...page,
          main: page.main.filter(item => item !== sectionId),
          sidebar: page.sidebar.filter(item => item !== sectionId),
        }))
      })
    }

    setActiveSectionId(nextActiveTab)
    setOpenTabMenuId(null)
    setDeleteModal({ open: false, sectionId: null, title: '' })
  }

  const handleTabDragEnd = (event: DragEndEvent) => {
    const indexes = resolveItemReorderIndexes(sortableTabIds, event)
    if (!indexes) return

    const moved = arrayMove(sortableTabIds, indexes.fromIndex, indexes.toIndex)
    updateResumeData(draft => {
      const firstPage = draft.metadata.layout.pages[0]
      if (!firstPage) return
      firstPage.main = moved
      firstPage.sidebar = []
      firstPage.fullWidth = true
    })
  }

  const presentLayoutSectionIds = useMemo(
    () => new Set(layoutSectionIds),
    [layoutSectionIds],
  )
  const addableSectionIds = useMemo(
    () => ADDABLE_EDITOR_SECTION_ORDER.filter(sectionId => !presentLayoutSectionIds.has(sectionId)),
    [presentLayoutSectionIds],
  )
  const addSectionToEditor = (sectionId: string) => {
    updateResumeData(draft => {
      const firstPage = draft.metadata.layout.pages[0] || {
        fullWidth: true,
        main: [],
        sidebar: [],
      }
      if (!draft.metadata.layout.pages[0]) {
        draft.metadata.layout.pages = [firstPage]
      }

      const merged = dedupeSectionIds([...(firstPage.main || []), ...(firstPage.sidebar || [])])
      if (!merged.includes(sectionId)) {
        merged.push(sectionId)
      }
      firstPage.main = merged
      firstPage.sidebar = []
      firstPage.fullWidth = true

      if (sectionId === 'summary') {
        draft.summary.hidden = false
      } else if (isStandardSectionId(sectionId)) {
        if (!draft.sections[sectionId].title.trim()) {
          draft.sections[sectionId].title = STANDARD_SECTION_LABELS[sectionId]
        }
        draft.sections[sectionId].hidden = false
      }
    })

    setActiveSectionId(sectionId)
    setAddMenuOpen(false)
  }

  const addCustomSectionFromHeader = () => {
    const sectionId = createBuilderId()
    updateResumeData(draft => {
      draft.customSections.push({
        id: sectionId,
        type: 'summary',
        title: '自定义板块',
        columns: 1,
        hidden: false,
        items: [
          {
            id: createBuilderId(),
            hidden: false,
            content: '',
          },
        ],
      })

      const firstPage = draft.metadata.layout.pages[0] || {
        fullWidth: true,
        main: [],
        sidebar: [],
      }
      if (!draft.metadata.layout.pages[0]) {
        draft.metadata.layout.pages = [firstPage]
      }

      firstPage.main = dedupeSectionIds([...(firstPage.main || []), ...(firstPage.sidebar || []), sectionId])
      firstPage.sidebar = []
      firstPage.fullWidth = true
    })

    setActiveSectionId(sectionId)
    setAddMenuOpen(false)
  }

  const activeSectionTab = tabs.find(tab => tab.id === activeSectionId) || tabs[0]
  const existingModuleTabs = useMemo(
    () => tabs.filter(tab => tab.id !== 'basics' && tab.id !== 'intention'),
    [tabs],
  )
  const existingModuleSortableIds = useMemo(
    () => existingModuleTabs.map(tab => tab.id),
    [existingModuleTabs],
  )
  const existingModuleSortSensors = useEditorTabSortSensors()
  const resolvedActiveSectionId = activeSectionTab?.id || 'basics'
  const showAddItemRow =
    resolvedActiveSectionId !== 'summary' &&
    resolvedActiveSectionId !== 'basics' &&
    resolvedActiveSectionId !== 'intention'
  const sectionMenuOpen = Boolean(activeSectionTab && openTabMenuId === activeSectionTab.id)
  const activeHiddenLabel = activeSectionTab?.hidden ? '显示板块' : '隐藏板块'
  const activeCanRename = Boolean(activeSectionTab && !activeSectionTab.locked)
  const activeCanDelete = Boolean(activeSectionTab?.removable)
  const activeCanToggleHidden = Boolean(activeSectionTab && !activeSectionTab.locked)
  const showAddSectionMenu = addMenuOpen
  const handleExistingModuleSortEnd = (event: DragEndEvent) => {
    const indexes = resolveItemReorderIndexes(existingModuleSortableIds, event)
    if (!indexes) return

    const moved = arrayMove(existingModuleSortableIds, indexes.fromIndex, indexes.toIndex)
    updateResumeData(draft => {
      const firstPage = draft.metadata.layout.pages[0]
      if (!firstPage) return

      const merged = dedupeSectionIds([...(firstPage.main || []), ...(firstPage.sidebar || [])])
      const rest = merged.filter(sectionId => !existingModuleSortableIds.includes(sectionId))
      firstPage.main = [...moved, ...rest]
      firstPage.sidebar = []
      firstPage.fullWidth = true
    })
  }
  const activeSectionMenuContent = activeSectionTab ? (
    <>
      <button
        type="button"
        className={joinClassNames('resume-item-menu-action', !activeCanToggleHidden && 'is-disabled')}
        disabled={!activeCanToggleHidden}
        onClick={event => {
          event.stopPropagation()
          if (!activeCanToggleHidden) return
          toggleSectionHidden(activeSectionTab.id, !activeSectionTab.hidden)
          setOpenTabMenuId(null)
        }}
      >
        {activeHiddenLabel}
      </button>
      <button
        type="button"
        className={joinClassNames('resume-item-menu-action', !activeCanRename && 'is-disabled')}
        disabled={!activeCanRename}
        onClick={event => {
          event.stopPropagation()
          openRenameDialog(activeSectionTab.id)
        }}
      >
        重命名
      </button>
      <button
        type="button"
        className={joinClassNames('resume-item-menu-action', 'is-danger', !activeCanDelete && 'is-disabled')}
        disabled={!activeCanDelete}
        onClick={event => {
          event.stopPropagation()
          if (!activeCanDelete) return
          openDeleteDialog(activeSectionTab.id)
        }}
      >
        删除
      </button>
    </>
  ) : null

  return (
    <div className="resume-editor-tabs-layout">
      <div className="resume-editor-tabs-head">
        <button
          type="button"
          className={`resume-editor-ai-diagnosis-card is-${completeness.tone}`}
          aria-label={`内容完善度 ${completeness.score} 分，点击使用 AI 诊断`}
          onClick={onOpenAIDiagnosis}
        >
          <div className="resume-editor-ai-diagnosis-copy">
            <strong>内容完善度 {completeness.score}%</strong>
            <span>点击使用 AI 诊断，获得结构与措辞优化建议</span>
          </div>
          <div className="resume-editor-ai-diagnosis-cta">
            <Sparkles size={14} aria-hidden="true" />
            <span>AI 诊断</span>
            <IconChevronRight />
          </div>
        </button>

        <div className="resume-editor-tabs-head-main">
          <div
            className="resume-editor-tabs-track-wrap"
            data-left-mask={showTabsLeftMask ? 'true' : 'false'}
            data-right-mask={showTabsRightMask ? 'true' : 'false'}
          >
            <span className="resume-editor-tabs-scroll-mask is-left" aria-hidden="true" />
            <span className="resume-editor-tabs-scroll-mask is-right" aria-hidden="true" />
            <div ref={tabTrackShellRef} className="resume-editor-tabs-track-shell">
              <DndContext
                sensors={tabSortSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTabDragEnd}
              >
                <SortableContext items={sortableTabIds} strategy={horizontalListSortingStrategy}>
                  <div className="resume-editor-tabs-track" role="tablist" aria-label="属性编辑器板块标签">
                    {tabs.map(tab => {
                      if (!tab.sortable) {
                        return (
                          <div
                            key={tab.id}
                            className={joinClassNames(
                              'resume-editor-tab',
                              activeSectionId === tab.id && 'is-active',
                              tab.hidden && 'is-hidden',
                              tab.locked && 'is-locked',
                            )}
                            role="presentation"
                          >
                            <EditorSectionTabChromeBg />
                            <span className="resume-editor-tab-hover-bg" aria-hidden="true" />
                            <button
                              type="button"
                              className="resume-editor-tab-select"
                              role="tab"
                              aria-selected={activeSectionId === tab.id}
                              tabIndex={activeSectionId === tab.id ? 0 : -1}
                              onClick={() => {
                                setActiveSectionId(tab.id)
                                setOpenTabMenuId(null)
                                setAddMenuOpen(false)
                              }}
                              onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setActiveSectionId(tab.id)
                                  setOpenTabMenuId(null)
                                  setAddMenuOpen(false)
                                }
                              }}
                            >
                              <span className="resume-editor-tab-label-row">
                                {renderEditorTabIcon(tab.id)}
                                <span className="resume-editor-tab-title">{tab.title}</span>
                                {tab.hidden ? <span className="resume-editor-tab-meta">已隐藏</span> : null}
                              </span>
                            </button>
                          </div>
                        )
                      }

                      return (
                        <SortableEditorSectionTab
                          key={tab.id}
                          sectionId={tab.id}
                          title={tab.title}
                          active={activeSectionId === tab.id}
                          hidden={tab.hidden}
                          locked={tab.locked}
                          onSelect={() => {
                            setActiveSectionId(tab.id)
                            setOpenTabMenuId(null)
                            setAddMenuOpen(false)
                          }}
                        />
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          <div className="resume-editor-tabs-head-actions">
            <div className="resume-editor-add-shell" onClick={event => event.stopPropagation()}>
              <div className={joinClassNames('resume-item-menu', 'resume-editor-add-menu', showAddSectionMenu && 'is-open')}>
                <Button
                  type="text"
                  size="mini"
                  className="resume-inline-icon-btn"
                  icon={<IconPlus />}
                  onClick={() => {
                    setOpenTabMenuId(null)
                    setAddMenuOpen(open => !open)
                  }}
                  aria-label="添加板块"
                />
                {showAddSectionMenu ? (
                  <div className="resume-item-menu-popover resume-editor-add-menu-panel">
                    <section className="resume-editor-add-menu-section">
                      <h4 className="resume-editor-add-menu-title">已有模块</h4>
                      <div className="resume-editor-existing-modules-list">
                        {existingModuleTabs.length > 0 ? (
                          <DndContext
                            sensors={existingModuleSortSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleExistingModuleSortEnd}
                          >
                            <SortableContext items={existingModuleSortableIds} strategy={verticalListSortingStrategy}>
                              {existingModuleTabs.map(tab => (
                                <SortableExistingModuleRow
                                  key={tab.id}
                                  sectionId={tab.id}
                                  title={tab.title}
                                  canRename={!tab.locked}
                                  canDelete={tab.removable}
                                  onRename={() => {
                                    openRenameDialog(tab.id)
                                    setAddMenuOpen(false)
                                    setOpenTabMenuId(null)
                                  }}
                                  onDelete={() => {
                                    openDeleteDialog(tab.id)
                                    setAddMenuOpen(false)
                                    setOpenTabMenuId(null)
                                  }}
                                />
                              ))}
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <div className="resume-editor-existing-module-empty">暂无模块</div>
                        )}
                      </div>
                    </section>

                    <section className="resume-editor-add-menu-section">
                      <h4 className="resume-editor-add-menu-title">添加模块</h4>
                      <div className="resume-editor-add-modules-list">
                        {addableSectionIds.map(sectionId => (
                          <button
                            key={sectionId}
                            type="button"
                            className="resume-editor-add-module-row"
                            onClick={event => {
                              event.stopPropagation()
                              addSectionToEditor(sectionId)
                              setOpenTabMenuId(null)
                            }}
                          >
                            <span className="resume-editor-add-module-plus" aria-hidden="true">
                              <IconPlus />
                            </span>
                            <span>{getSectionDisplayTitle(data, sectionId)}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          className="resume-editor-add-module-row"
                          onClick={event => {
                            event.stopPropagation()
                            addCustomSectionFromHeader()
                            setOpenTabMenuId(null)
                          }}
                        >
                          <span className="resume-editor-add-module-plus" aria-hidden="true">
                            <IconPlus />
                          </span>
                          <span>自定义</span>
                        </button>
                      </div>
                    </section>
                  </div>
                ) : null}
              </div>
            </div>

            {activeSectionTab ? (
              <div className="resume-editor-menu-shell resume-editor-panel-menu-shell" onClick={event => event.stopPropagation()}>
                <div className={joinClassNames('resume-item-menu', 'resume-editor-panel-menu', sectionMenuOpen && 'is-open')}>
                  <Button
                    type="text"
                    size="mini"
                    className="resume-inline-icon-btn"
                    icon={<IconMoreHorizontal />}
                    onClick={() => {
                      setOpenTabMenuId(sectionMenuOpen ? null : activeSectionTab.id)
                      setAddMenuOpen(false)
                    }}
                    aria-label={`${activeSectionTab.title}板块操作`}
                  />
                  {sectionMenuOpen ? <div className="resume-item-menu-popover">{activeSectionMenuContent}</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="resume-scroll-shell resume-editor-tab-content-scroll">
        <div className="resume-side-panel-body resume-workbench-panel-body resume-editor-panel-body resume-editor-tab-content-body">
          <div data-editor-section-id={resolvedActiveSectionId} className="resume-editor-tab-content resume-focus-target">
            {resolvedActiveSectionId === 'basics' ? (
              <BasicsEditor />
            ) : resolvedActiveSectionId === 'intention' ? (
              <IntentionEditor />
            ) : (
              <SectionEditorBody sectionId={resolvedActiveSectionId} />
            )}

            {showAddItemRow ? (
              <div className="resume-editor-tab-add-row">
                <AddRowButton label="新增条目" onClick={() => addSectionItem(resolvedActiveSectionId)} />
              </div>
            ) : null}
          </div>

        </div>
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

function resolvePreviewFitTarget(previewContent: HTMLDivElement | null) {
  if (!previewContent) return null

  const compareStage = previewContent.querySelector<HTMLElement>('.resume-ai-compare-stage')
  if (compareStage) {
    return compareStage
  }

  const pages = previewContent.querySelectorAll<HTMLElement>('[data-template]')
  if (pages.length > 0) {
    return pages[0]
  }

  return previewContent.querySelector<HTMLElement>('.resume-preview-root') || previewContent
}

function resolvePreviewFitScale(viewport: HTMLDivElement | null, previewContent: HTMLDivElement | null) {
  if (!viewport || !previewContent) {
    return PREVIEW_INITIAL_SCALE
  }

  const target = resolvePreviewFitTarget(previewContent)
  if (!target) {
    return PREVIEW_INITIAL_SCALE
  }

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

  const target = resolvePreviewFitTarget(previewContent)
  if (!target) return false

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

function resolveEditorPanelWidthMax() {
  if (typeof window === 'undefined') return EDITOR_PANEL_WIDTH_MAX
  return Math.max(
    EDITOR_PANEL_WIDTH_MIN,
    Math.min(EDITOR_PANEL_WIDTH_MAX, Math.round(window.innerWidth * 0.46)),
  )
}

function clampEditorPanelWidth(value: number) {
  return clamp(Math.round(value), EDITOR_PANEL_WIDTH_MIN, resolveEditorPanelWidthMax())
}

export function ResumeBuilderClient({ initialResume, dataSources }: ResumeBuilderClientProps) {
  const router = useRouter()
  const { auth, ensureAuthenticated } = useAuthSnapshot({ eager: true })
  const builderScopeRef = useRef<HTMLDivElement | null>(null)
  const previewContentRef = useRef<HTMLDivElement>(null)
  const previewViewportRef = useRef<HTMLDivElement | null>(null)
  const sidePanelScrollRef = useRef<HTMLDivElement | null>(null)
  const previewScaleRef = useRef(PREVIEW_INITIAL_SCALE)
  const initialPreviewScaleRef = useRef(PREVIEW_INITIAL_SCALE)
  const previewHasInitialFitRef = useRef(false)
  const previewPendingScrollTopRef = useRef<number | null>(null)
  const previewContentHeightRef = useRef(0)

  const initialize = useResumeBuilderStore(state => state.initialize)
  const data = useResumeBuilderStore(state => state.data)
  const initialized = useResumeBuilderStore(state => state.initialized)
  const storeResumeId = useResumeBuilderStore(state => state.resumeId)
  const updateResumeData = useResumeBuilderStore(state => state.updateResumeData)
  const selectedDataSourceId = useResumeBuilderStore(state => state.selectedDataSourceId)
  const setSelectedDataSourceId = useResumeBuilderStore(state => state.setSelectedDataSourceId)
  const applyDataSource = useResumeBuilderStore(state => state.applyDataSource)
  const saveNow = useResumeBuilderStore(state => state.saveNow)
  const saveState = useResumeBuilderStore(state => state.save)

  const [activeTool, setActiveTool] = useState<ActiveBuilderTool>('typesetting')
  const [exporting, setExporting] = useState(false)
  const [fillStrategy, setFillStrategy] = useState<'overwrite' | 'preserve'>('overwrite')
  const [sidePanelScrolling, setSidePanelScrolling] = useState(false)
  const [resumeTitle, setResumeTitle] = useState(initialResume.title)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [spaceZoomActive, setSpaceZoomActive] = useState(false)
  const [previewInteractionActive, setPreviewInteractionActive] = useState(false)
  const [previewAutoFitReady, setPreviewAutoFitReady] = useState(false)
  const [previewScale, setPreviewScale] = useState(PREVIEW_INITIAL_SCALE)
  const [previewContentHeight, setPreviewContentHeight] = useState(0)
  const [editorPanelWidth, setEditorPanelWidth] = useState(EDITOR_PANEL_WIDTH_DEFAULT)
  const [aiPreviewState, setAiPreviewState] = useState<AIPreviewState | null>(null)
  const [aiPreviewActionLoading, setAiPreviewActionLoading] = useState<'new_version' | 'overwrite' | 'discard' | null>(null)
  const [resolvedDraftId, setResolvedDraftId] = useState<string | null>(null)
  const [heightDebugSnapshot, setHeightDebugSnapshot] = useState<HeightDebugSnapshot | null>(null)
  const [editorFocusRequest, setEditorFocusRequest] = useState<EditorFocusRequest | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const focusRequestCounterRef = useRef(0)
  const editorPanelResizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const editorPanelWidthLiveRef = useRef(EDITOR_PANEL_WIDTH_DEFAULT)
  const editorPanelResizingRef = useRef(false)
  const editorPanelWidthHydratedRef = useRef(false)
  const restoredAuthDraftRef = useRef(false)
  const resumeTitleRef = useRef(initialResume.title)
  const sidePanelScrollTimerRef = useRef<number | null>(null)
  const isGuestDraft = initialResume.id.startsWith('guest-')
  const isTranslateCompareMode = activeTool === 'ai' && aiPreviewState?.intent === 'translate_resume'
  const activeAIDraftId = activeTool === 'ai' ? aiPreviewState?.draftId : undefined
  const baseSmartOnePage = useMemo(() => resolveSmartOnePageComputation(data), [data])
  const aiSmartOnePage = useMemo(
    () => (aiPreviewState ? resolveSmartOnePageComputation(aiPreviewState.data) : null),
    [aiPreviewState],
  )
  const basePreviewData = baseSmartOnePage.effectiveData
  const comparePreviewData = aiSmartOnePage?.effectiveData || aiPreviewState?.data || null
  const previewRenderSmartState = activeTool === 'ai' && aiSmartOnePage ? aiSmartOnePage : baseSmartOnePage
  const previewRenderData = previewRenderSmartState.effectiveData
  const basePreviewPageCount = useMemo(() => estimateTemplatePageCountForData(basePreviewData), [basePreviewData])
  const previewRenderPageCount = useMemo(
    () => estimateTemplatePageCountForData(previewRenderData),
    [previewRenderData],
  )
  const comparePreviewPageCount = useMemo(
    () => (comparePreviewData ? estimateTemplatePageCountForData(comparePreviewData) : 1),
    [comparePreviewData],
  )
  const basePreviewFitFingerprint = useMemo(() => buildPreviewFitFingerprint(basePreviewData), [basePreviewData])
  const previewRenderFitFingerprint = useMemo(() => buildPreviewFitFingerprint(previewRenderData), [previewRenderData])
  const comparePreviewFitFingerprint = useMemo(
    () => (comparePreviewData ? buildPreviewFitFingerprint(comparePreviewData) : 'no-compare-preview'),
    [comparePreviewData],
  )
  const previewFitKey = useMemo(() => {
    if (!initialized) return `${initialResume.id}:0`
    if (isTranslateCompareMode && aiPreviewState) {
      return `${initialResume.id}:compare:${basePreviewPageCount}:${comparePreviewPageCount}:${basePreviewFitFingerprint}:${comparePreviewFitFingerprint}`
    }
    return `${initialResume.id}:${previewRenderPageCount}:${previewRenderFitFingerprint}`
  }, [
    aiPreviewState,
    basePreviewFitFingerprint,
    basePreviewPageCount,
    comparePreviewFitFingerprint,
    comparePreviewPageCount,
    initialResume.id,
    initialized,
    isTranslateCompareMode,
    previewRenderFitFingerprint,
    previewRenderPageCount,
  ])
  const previewScaledHeight = Math.max(previewContentHeight * previewScale, 0)
  const previewScrollSpaceHeight = previewScaledHeight + PREVIEW_SCROLL_VERTICAL_PADDING * 2
  const applyEditorPanelWidthVar = useCallback((value: number) => {
    const scope = builderScopeRef.current
    if (!scope) return
    scope.style.setProperty('--resume-editor-panel-width', `${value}px`)
  }, [])

  const handlePreviewNavigate = useCallback((target: PreviewNavigationTarget) => {
    focusRequestCounterRef.current += 1
    setEditorFocusRequest({
      ...target,
      requestId: focusRequestCounterRef.current,
    })
  }, [])

  const handleHeightDebugSnapshot = useCallback((snapshot: HeightDebugSnapshot | null) => {
    setHeightDebugSnapshot(snapshot)
  }, [])

  const previewDocument = useMemo(() => {
    if (isTranslateCompareMode && aiPreviewState) {
      return (
        <div className="resume-ai-compare-stage">
          <div className="resume-ai-compare-column">
            <div className="resume-ai-compare-label">原简历</div>
            <ResumeReactivePreview data={basePreviewData} onNavigate={handlePreviewNavigate} />
          </div>
          <div className="resume-ai-compare-column">
            <div className="resume-ai-compare-label">翻译简历</div>
            <ResumeReactivePreview data={comparePreviewData || aiPreviewState.data} onNavigate={handlePreviewNavigate} />
          </div>
        </div>
      )
    }

    return (
      <ResumeReactivePreview
        data={previewRenderData}
        onNavigate={handlePreviewNavigate}
        onHeightDebugSnapshot={handleHeightDebugSnapshot}
      />
    )
  }, [aiPreviewState, basePreviewData, comparePreviewData, handleHeightDebugSnapshot, handlePreviewNavigate, isTranslateCompareMode, previewRenderData])

  const handlePreviewDraftInCanvas = useCallback((payload: {
    draftId: string
    sourceResumeId: string
    title: string
    previewUrl: string
    draftData: ResumeData
    intent: AIPreviewIntent
  }) => {
    setResolvedDraftId(null)
    setAiPreviewState({
      data: structuredClone(payload.draftData),
      intent: payload.intent,
      draftId: payload.draftId,
      sourceResumeId: payload.sourceResumeId,
      title: payload.title,
      previewUrl: payload.previewUrl,
    })
  }, [])

  const handleCardPreviewRequest = useCallback(
    async (payload: { draftId: string; sourceResumeId?: string; intent?: AIPreviewIntent }) => {
      try {
        const response = await fetch(`/api/resumes/${encodeURIComponent(payload.draftId)}`)
        const result = (await response.json().catch(() => null)) as
          | {
              error?: string
              resume?: {
                id: string
                title?: string
                templateId?: string
                dataSourceId?: string | null
                content?: unknown
              }
            }
          | null

        if (!response.ok || !result?.resume) {
          Message.error(result?.error || '加载草稿预览失败')
          return
        }

        const draftResume = result.resume
        const normalized = normalizeResumeContent(draftResume.content, {
          dataSource: dataSources.find(item => item.id === draftResume.dataSourceId) || null,
          templateId: draftResume.templateId || initialResume.templateId,
          withBackup: true,
        })

        setResolvedDraftId(null)
        setAiPreviewState({
          data: structuredClone(normalized.data),
          intent: payload.intent || 'polish_resume',
          draftId: payload.draftId,
          sourceResumeId: payload.sourceResumeId,
          title: draftResume.title || 'AI 草稿',
          previewUrl: `/resume/editor/${payload.draftId}?panel=ai&previewDraft=1`,
        })
      } catch {
        Message.error('加载草稿预览失败')
      }
    },
    [dataSources, initialResume.templateId],
  )

  const runPreviewDraftAction = useCallback(
    async (action: 'new_version' | 'overwrite' | 'discard') => {
      if (!activeAIDraftId || aiPreviewActionLoading) return
      if (action === 'overwrite' && !aiPreviewState?.sourceResumeId) {
        Message.warning('当前草稿缺少原简历 ID，暂时无法覆盖原版')
        return
      }

      setAiPreviewActionLoading(action)
      try {
        if (action === 'discard') {
          const response = await fetch(`/api/ai/drafts/${encodeURIComponent(activeAIDraftId)}/discard`, {
            method: 'POST',
          })
          const result = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null
          if (!response.ok || !result?.success) {
            Message.error(result?.error || '放弃草稿失败')
            return
          }
          Message.success('草稿已放弃')
        } else {
          const response = await fetch(`/api/ai/drafts/${encodeURIComponent(activeAIDraftId)}/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              saveMode: action,
              sourceResumeId: aiPreviewState?.sourceResumeId,
            }),
          })
          const result = (await response.json().catch(() => null)) as
            | {
                success?: boolean
                error?: string
              }
            | null
          if (!response.ok || !result?.success) {
            Message.error(result?.error || '保存失败')
            return
          }
          Message.success(action === 'overwrite' ? '已覆盖原简历' : '已保存为新版本')
        }

        setResolvedDraftId(activeAIDraftId)
        setAiPreviewState(previous =>
          previous && previous.draftId === activeAIDraftId
            ? {
                ...previous,
                draftId: undefined,
                sourceResumeId: undefined,
              }
            : previous,
        )
      } finally {
        setAiPreviewActionLoading(null)
      }
    },
    [activeAIDraftId, aiPreviewActionLoading, aiPreviewState?.sourceResumeId],
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
    setActiveTool(tool)
  }, [])

  const handleCloseTool = useCallback(() => {
    setActiveTool(null)
  }, [])

  useEffect(() => {
    if (activeTool !== 'ai' && aiPreviewState) {
      setAiPreviewState(null)
      setAiPreviewActionLoading(null)
    }
  }, [activeTool, aiPreviewState])

  useEffect(() => {
    setAiPreviewState(null)
    setAiPreviewActionLoading(null)
    setResolvedDraftId(null)
    setHeightDebugSnapshot(null)
    previewHasInitialFitRef.current = false
    setPreviewAutoFitReady(false)
  }, [initialResume.id])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadingToastId = window.sessionStorage.getItem('resume:editor-loading-toast-id')
    if (loadingToastId) {
      toast.dismiss(loadingToastId)
      window.sessionStorage.removeItem('resume:editor-loading-toast-id')
    }

    const key = 'resume:just-created-id'
    const justCreatedId = window.sessionStorage.getItem(key)
    if (justCreatedId && justCreatedId === initialResume.id) {
      toast.success('简历创建成功')
      window.sessionStorage.removeItem(key)
      return
    }

    const guestEntryKey = 'resume:guest-editor-entry'
    if (window.sessionStorage.getItem(guestEntryKey) === '1' && initialResume.id.startsWith('guest-')) {
      toast.message('当前为游客模式，登录后可保存和管理简历')
      window.sessionStorage.removeItem(guestEntryKey)
    }
  }, [initialResume.id])

  const handleBackFromEditor = useCallback(() => {
    router.push(isGuestDraft ? '/resume/templates' : '/dashboard')
  }, [isGuestDraft, router])

  const cacheDraftBeforeLoginRedirect = useCallback(async () => {
    if (typeof window === 'undefined') return

    const flushPendingInputs = () => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement)) return
      if (!active.matches('input, textarea, [contenteditable="true"]') && !active.closest('[contenteditable="true"]')) {
        return
      }
      active.blur()
    }

    flushPendingInputs()
    await Promise.resolve()
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    try {
      const state = useResumeBuilderStore.getState()
      if (!state.initialized) return

      const payload: AuthRedirectDraftCachePayload = {
        version: 1,
        resumeId: initialResume.id,
        path: `${window.location.pathname}${window.location.search}`,
        savedAt: Date.now(),
        resumeTitle: resumeTitle,
        selectedDataSourceId: state.selectedDataSourceId || '',
        data: state.data,
      }

      window.sessionStorage.setItem(AUTH_REDIRECT_DRAFT_CACHE_KEY, JSON.stringify(payload))
      authRedirectRuntimeDraft = {
        payload,
        cachedAt: Date.now(),
      }
    } catch {
      // ignore caching failures before login redirect
    }
  }, [initialResume.id, resumeTitle])

  const ensureAuthForAction = useCallback(
    async () => {
      if (!isGuestDraft) return true

      if (auth.authenticated) {
        setAuthModalOpen(false)
        return true
      }

      const authed = await ensureAuthenticated()
      if (authed) {
        setAuthModalOpen(false)
        return true
      }

      setAuthModalOpen(true)
      return false
    },
    [auth.authenticated, ensureAuthenticated, isGuestDraft],
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
    void fitPreviewToHeight()
  }, [fitPreviewToHeight])

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
    if (!previewHasInitialFitRef.current) {
      setPreviewAutoFitReady(false)
    }
  }, [previewFitKey])

  useEffect(() => {
    if (!initialized) return
    if (previewHasInitialFitRef.current) return
    if (previewContentHeight <= 0) return

    let cancelled = false

    void (async () => {
      const fitted = await fitPreviewToHeight()
      if (cancelled) return
      previewHasInitialFitRef.current = fitted
      setPreviewAutoFitReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [fitPreviewToHeight, initialized, previewContentHeight, previewFitKey])

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
    if (initialized && storeResumeId === initialResume.id) {
      return
    }

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
  }, [dataSources, initialResume.content, initialResume.dataSourceId, initialResume.id, initialResume.templateId, initialize, initialized, storeResumeId])

  useEffect(() => {
    if (!initialized || restoredAuthDraftRef.current) return
    if (typeof window === 'undefined') return

    const now = Date.now()
    const runtimePayload =
      authRedirectRuntimeDraft && now - authRedirectRuntimeDraft.cachedAt <= AUTH_REDIRECT_RUNTIME_DRAFT_MAX_AGE_MS
        ? authRedirectRuntimeDraft.payload
        : null
    if (authRedirectRuntimeDraft && !runtimePayload) {
      authRedirectRuntimeDraft = null
    }

    const raw = window.sessionStorage.getItem(AUTH_REDIRECT_DRAFT_CACHE_KEY)
    let payload: Partial<AuthRedirectDraftCachePayload> | null = null
    let source: 'storage' | 'runtime' | null = null

    if (raw) {
      try {
        payload = JSON.parse(raw) as Partial<AuthRedirectDraftCachePayload>
        source = 'storage'
      } catch {
        window.sessionStorage.removeItem(AUTH_REDIRECT_DRAFT_CACHE_KEY)
      }
    }

    if (!payload && runtimePayload) {
      payload = runtimePayload
      source = 'runtime'
    }

    if (!payload) return

    const isExpired = typeof payload.savedAt !== 'number' || now - payload.savedAt > AUTH_REDIRECT_DRAFT_MAX_AGE_MS
    if (isExpired) {
      window.sessionStorage.removeItem(AUTH_REDIRECT_DRAFT_CACHE_KEY)
      authRedirectRuntimeDraft = null
      return
    }

    const currentPath = `${window.location.pathname}${window.location.search}`
    const currentPathname = window.location.pathname
    const payloadPathname =
      typeof payload.path === 'string' && payload.path
        ? new URL(payload.path, window.location.origin).pathname
        : ''
    const sameResume = payload.resumeId === initialResume.id
    const samePath = payload.path === currentPath
    const samePathname = payloadPathname === currentPathname
    const guestToAuthedEditorFlow =
      typeof payload.resumeId === 'string' &&
      payload.resumeId.startsWith('guest-') &&
      !initialResume.id.startsWith('guest-') &&
      payloadPathname.startsWith('/resume/editor/') &&
      currentPathname.startsWith('/resume/editor/')

    if ((!sameResume && !samePath && !samePathname && !guestToAuthedEditorFlow) || !payload.data || typeof payload.data !== 'object') {
      return
    }

    restoredAuthDraftRef.current = true
    const restoredData = structuredClone(payload.data as ResumeData)
    const resolvedResumeTitle =
      typeof payload.resumeTitle === 'string' && payload.resumeTitle.trim()
        ? payload.resumeTitle
        : resumeTitleRef.current
    updateResumeData(draft => {
      Object.assign(draft, restoredData)
    })

    if (typeof payload.selectedDataSourceId === 'string') {
      setSelectedDataSourceId(payload.selectedDataSourceId)
    }
    if (resolvedResumeTitle.trim()) {
      setResumeTitle(resolvedResumeTitle)
      resumeTitleRef.current = resolvedResumeTitle
    }

    window.sessionStorage.removeItem(AUTH_REDIRECT_DRAFT_CACHE_KEY)
    if (process.env.NODE_ENV !== 'production' && source === 'storage') {
      authRedirectRuntimeDraft = {
        payload: {
          version: typeof payload.version === 'number' ? payload.version : 1,
          resumeId: typeof payload.resumeId === 'string' ? payload.resumeId : initialResume.id,
          path: typeof payload.path === 'string' && payload.path ? payload.path : currentPath,
          savedAt: typeof payload.savedAt === 'number' ? payload.savedAt : now,
          resumeTitle: resolvedResumeTitle,
          selectedDataSourceId: typeof payload.selectedDataSourceId === 'string' ? payload.selectedDataSourceId : '',
          data: restoredData,
        },
        cachedAt: now,
      }
    } else {
      authRedirectRuntimeDraft = null
    }
  }, [initialResume.id, initialized, setSelectedDataSourceId, updateResumeData])

  useEffect(() => {
    if (typeof document === 'undefined') return
    return () => {
      document.body.classList.remove('resume-editor-panel-resizing')
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', 'dark')
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const stored = window.localStorage.getItem(EDITOR_PANEL_WIDTH_STORAGE_KEY)
    let nextWidth = clampEditorPanelWidth(EDITOR_PANEL_WIDTH_DEFAULT)
    if (stored) {
      const parsed = Number.parseInt(stored, 10)
      if (Number.isFinite(parsed)) {
        nextWidth = clampEditorPanelWidth(parsed)
      }
    }

    editorPanelWidthLiveRef.current = nextWidth
    applyEditorPanelWidthVar(nextWidth)
    setEditorPanelWidth(nextWidth)
    editorPanelWidthHydratedRef.current = true
  }, [applyEditorPanelWidthVar])

  useEffect(() => {
    editorPanelWidthLiveRef.current = editorPanelWidth
    applyEditorPanelWidthVar(editorPanelWidth)
  }, [applyEditorPanelWidthVar, editorPanelWidth])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!editorPanelWidthHydratedRef.current) return

    const nextWidth = clampEditorPanelWidth(editorPanelWidth)
    if (nextWidth !== editorPanelWidth) {
      setEditorPanelWidth(nextWidth)
      return
    }

    window.localStorage.setItem(EDITOR_PANEL_WIDTH_STORAGE_KEY, String(nextWidth))
  }, [editorPanelWidth])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onResize = () => {
      const nextWidth = clampEditorPanelWidth(editorPanelWidthLiveRef.current)
      editorPanelWidthLiveRef.current = nextWidth
      applyEditorPanelWidthVar(nextWidth)
      setEditorPanelWidth(previous => (previous === nextWidth ? previous : nextWidth))
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [applyEditorPanelWidthVar])

  useEffect(() => {
    return () => {
      editorPanelResizingRef.current = false
      if (sidePanelScrollTimerRef.current) {
        window.clearTimeout(sidePanelScrollTimerRef.current)
      }
      if (typeof document !== 'undefined') {
        document.body.classList.remove('resume-editor-panel-resizing')
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

  const handleEditorPanelResizeStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1120) {
      return
    }

    preventDefaultIfCancelable(event)
    event.stopPropagation()
    editorPanelResizingRef.current = true
    editorPanelResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: editorPanelWidthLiveRef.current,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    if (typeof document !== 'undefined') {
      document.body.classList.add('resume-editor-panel-resizing')
    }
  }, [])

  const handleEditorPanelResizeMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = editorPanelResizeRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    preventDefaultIfCancelable(event)
    event.stopPropagation()
    const deltaX = event.clientX - drag.startX
    const nextWidth = clampEditorPanelWidth(drag.startWidth - deltaX)
    if (nextWidth === editorPanelWidthLiveRef.current) return
    editorPanelWidthLiveRef.current = nextWidth
    applyEditorPanelWidthVar(nextWidth)
  }, [applyEditorPanelWidthVar])

  const handleEditorPanelResizeEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = editorPanelResizeRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    editorPanelResizingRef.current = false
    editorPanelResizeRef.current = null
    setEditorPanelWidth(previous => (previous === editorPanelWidthLiveRef.current ? previous : editorPanelWidthLiveRef.current))
    if (typeof document !== 'undefined') {
      document.body.classList.remove('resume-editor-panel-resizing')
    }
  }, [])

  const handleFill = async (strategy: 'overwrite' | 'preserve') => {
    if (!(await ensureAuthForAction())) {
      return
    }

    if (!selectedDataSourceId) {
      Message.warning('请先选择数据源')
      return
    }

    applyDataSource(strategy, selectedDataSourceId)
    Message.success(strategy === 'overwrite' ? '已按数据源覆盖当前简历文案' : '已按数据源补全当前简历空白内容')
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

    if (isGuestDraft) {
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
  }, [initialResume.id, initialResume.title, isGuestDraft, resumeTitle])

  const handleManualSave = useCallback(async () => {
    if (!(await ensureAuthForAction())) {
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

  const exportResumePagesAsImage = async (format: ResumeImageExportFormat) => {
    try {
      await ensureFontsReady()
      const snapdom = await loadSnapdom()
      const previewRoot = previewContentRef.current?.querySelector<HTMLElement>('.resume-preview-root')
      if (!previewRoot) {
        Message.error('预览尚未准备完成，请稍后重试')
        return
      }

      const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>('[data-template]'))
      if (pages.length === 0) {
        Message.error('当前没有可导出的页面')
        return
      }

      const normalizedTitle = (resumeTitleRef.current || initialResume.title || 'resume').trim().replace(/[^\w\u4e00-\u9fa5-]+/g, '-') || 'resume'
      const renderOptions: SnapdomOptions = {
        backgroundColor: '#ffffff',
        scale: IMAGE_EXPORT_RENDER_SCALE,
        embedFonts: true,
        cache: 'auto',
      }
      const renderPageToCanvas = async (page: HTMLElement) => {
        return snapdom.toCanvas(page, renderOptions)
      }

      const { captureHost, captureRoot } = createOffscreenExportCaptureRoot(previewRoot)

      try {
        await nextAnimationFrame()
        await nextAnimationFrame()

        const capturePages = Array.from(captureRoot.querySelectorAll<HTMLElement>('[data-template]'))
        if (capturePages.length === 0) {
          throw new Error('图片生成失败')
        }
        const renderedCanvases: HTMLCanvasElement[] = []
        for (const page of capturePages) {
          const canvas = await renderPageToCanvas(page)
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

        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png'
        const quality = format === 'jpg' ? 0.92 : 1
        const blob = await new Promise<Blob | null>(resolve => stitchedCanvas.toBlob(resolve, mimeType, quality))
        if (!blob) {
          throw new Error('图片生成失败')
        }

        const filename = capturePages.length === 1
          ? `${normalizedTitle}.${format}`
          : `${normalizedTitle}-continuous.${format}`
        downloadBlob(blob, filename)
        const formatLabel = format.toUpperCase()
        Message.success(capturePages.length === 1 ? `已下载 ${formatLabel}` : `已下载 ${formatLabel} 长图`)
      } finally {
        captureHost.remove()
      }
    } catch (error) {
      Message.error(error instanceof Error ? error.message : `下载 ${format.toUpperCase()} 失败`)
    }
  }

  const exportResumePagesAsPdf = async () => {
    const profiler = createExportProfiler('PDF export timing')
    try {
      await profiler.measure('fonts.ready', () => ensureFontsReady())
      const snapdom = await profiler.measure('load snapdom', () => loadSnapdom())
      const previewRoot = previewContentRef.current?.querySelector<HTMLElement>('.resume-preview-root')
      if (!previewRoot) {
        Message.error('预览尚未准备完成，请稍后重试')
        return
      }

      const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>('[data-template]'))
      if (pages.length === 0) {
        Message.error('当前没有可导出的页面')
        return
      }

      const normalizedTitle = (resumeTitleRef.current || initialResume.title || 'resume').trim().replace(/[^\w\u4e00-\u9fa5-]+/g, '-') || 'resume'
      const renderOptions: SnapdomOptions = {
        backgroundColor: '#ffffff',
        scale: PDF_EXPORT_RENDER_SCALE,
        embedFonts: true,
        cache: 'auto',
      }
      const renderPageToCanvas = async (page: HTMLElement) => {
        return snapdom.toCanvas(page, renderOptions)
      }

      const { captureHost, captureRoot } = await profiler.measure('clone preview root', () => createOffscreenExportCaptureRoot(previewRoot))
      try {
        await profiler.measure('wait 2 animation frames', async () => {
          await nextAnimationFrame()
          await nextAnimationFrame()
        })

        const capturePages = await profiler.measure(
          'query capture pages',
          () => Array.from(captureRoot.querySelectorAll<HTMLElement>('[data-template]')),
        )
        if (capturePages.length === 0) {
          throw new Error('PDF 生成失败')
        }

        const renderedCanvases: HTMLCanvasElement[] = []
        const pageStats: PdfExportPageStat[] = []
        for (const [index, page] of capturePages.entries()) {
          const canvas = await profiler.measure(`page ${index + 1} toCanvas`, () => renderPageToCanvas(page))
          renderedCanvases.push(canvas)
        }
        if (renderedCanvases.length === 0) {
          throw new Error('PDF 生成失败')
        }

        const workerPages: ResumePdfWorkerPagePayload[] = []
        const pageFormat = previewRenderData.metadata.page.format
        for (const [index, canvas] of renderedCanvases.entries()) {
          const imageBlob = await profiler.measure(`page ${index + 1} toBlob(${PDF_EXPORT_IMAGE_FORMAT})`, () =>
            canvasToBlob(canvas, PDF_EXPORT_IMAGE_MIME, PDF_EXPORT_IMAGE_QUALITY),
          )
          if (!imageBlob) {
            throw new Error(`第 ${index + 1} 页图片编码失败`)
          }
          const imageBuffer = await profiler.measure(`page ${index + 1} blob.arrayBuffer`, () => imageBlob.arrayBuffer())
          const pageSizeMm = resolvePdfPageSizeMm(canvas, pageFormat)
          pageStats.push({
            page: index + 1,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            pixelCount: canvas.width * canvas.height,
            blobBytes: imageBlob.size,
            pageWidthMm: pageSizeMm.widthMm,
            pageHeightMm: pageSizeMm.heightMm,
          })
          workerPages.push({
            width: canvas.width,
            height: canvas.height,
            widthMm: pageSizeMm.widthMm,
            heightMm: pageSizeMm.heightMm,
            format: PDF_EXPORT_IMAGE_FORMAT,
            buffer: imageBuffer,
          })
        }

        const workerResult = await profiler.measure('worker build pdf', () => {
          return buildPdfInWorker({
            filename: `${normalizedTitle}.pdf`,
            pages: workerPages,
          })
        })
        workerResult.timings.forEach(entry => {
          profiler.record(`worker ${entry.step}`, entry.durationMs)
        })
        await profiler.measure('trigger browser download', () => {
          downloadBlob(workerResult.blob, workerResult.filename)
        })
        const totalDurationMs = profiler.flush({
          pageCount: workerPages.length,
          filename: workerResult.filename,
          pageStats,
          workerPdfBytes: workerResult.size,
          pdfImage: {
            format: PDF_EXPORT_IMAGE_FORMAT,
            quality: PDF_EXPORT_IMAGE_QUALITY,
            renderScale: PDF_EXPORT_RENDER_SCALE,
          },
        })
        Message.success(`已下载 PDF（${renderedCanvases.length} 页，${formatDurationMs(totalDurationMs)}，详情见控制台）`)
      } finally {
        captureHost.remove()
      }
    } catch (error) {
      profiler.flush({
        status: 'failed',
        error: error instanceof Error ? error.message : 'unknown',
      })
      Message.error(error instanceof Error ? error.message : '下载 PDF 失败')
    }
  }

  const handleDownloadImage = async (format: ResumeImageExportFormat) => {
    if (exporting) return
    if (!(await ensureAuthForAction())) {
      return
    }

    setExporting(true)
    try {
      await exportResumePagesAsImage(format)
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (exporting) return
    if (!(await ensureAuthForAction())) {
      return
    }

    setExporting(true)
    try {
      await exportResumePagesAsPdf()
    } finally {
      setExporting(false)
    }
  }

  const toolPanelContent =
    activeTool === null ? null : activeTool === 'fill' ? (
      <div className="resume-workbench-stack">
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
      </div>
    ) : activeTool === 'ai' ? (
      <AIChatPanel
        resumeId={initialResume.id}
        resumeTitle={resumeTitle}
        isGuestDraft={isGuestDraft}
        resolvedDraftId={resolvedDraftId}
        onClose={handleCloseTool}
        onPreviewDraftInCanvas={handlePreviewDraftInCanvas}
        onCardPreviewRequest={payload => {
          void handleCardPreviewRequest(payload)
        }}
      />
    ) : activeTool === 'height-debug' ? (
      <div className="resume-workbench-stack">
        <HeightDebugPanel snapshot={heightDebugSnapshot} />
      </div>
    ) : (
      <div className="resume-workbench-stack">
        <LayoutAndStylePanel pane={activeTool} smartOnePage={baseSmartOnePage} />
      </div>
    )

  const resumeCompleteness = useMemo(() => computeResumeCompleteness(data), [data])
  const editorPanelContent = (
    <IntegratedSectionsEditor
      focusRequest={editorFocusRequest}
      completeness={resumeCompleteness}
      scrollContainerRef={sidePanelScrollRef}
      onOpenAIDiagnosis={() => handleSelectTool('ai')}
    />
  )

  return (
    <div className="h-full overflow-hidden">
      <div ref={builderScopeRef} className="resume-builder-scope h-full flex flex-col overflow-hidden">
        <ResumeBuilderToolbar
          resumeTitle={resumeTitle}
          saveStatus={<SaveStatusTag />}
          saveLoading={isSavingTitle || saveState.status === 'saving'}
          onBack={() => void handleBackFromEditor()}
          onResumeTitleChange={setResumeTitle}
          onResumeTitleBlur={() => void saveResumeTitle()}
          downloadLoading={exporting}
          onDownloadPng={() => void handleDownloadImage('png')}
          onDownloadJpg={() => void handleDownloadImage('jpg')}
          onDownloadPdf={() => void handleDownloadPdf()}
          onSave={() => void handleManualSave()}
        />
        <ResumeOverlayWorkbench
          activeTool={activeTool}
          sidePanelScrolling={sidePanelScrolling}
          onSelectTool={handleSelectTool}
          onCloseTool={handleCloseTool}
          onSidePanelScroll={handleSidePanelScroll}
          toolPanelContent={toolPanelContent}
          editorContent={editorPanelContent}
          onEditorPanelResizeStart={handleEditorPanelResizeStart}
          onEditorPanelResizeMove={handleEditorPanelResizeMove}
          onEditorPanelResizeEnd={handleEditorPanelResizeEnd}
          previewContent={previewDocument}
          previewContentRef={previewContentRef}
          previewViewportRef={previewViewportRef}
          previewScale={previewScale}
          previewScrollSpaceHeight={previewScrollSpaceHeight}
          verticalPadding={PREVIEW_SCROLL_VERTICAL_PADDING}
          previewReady={previewAutoFitReady}
          aiPreviewVisible={activeTool === 'ai' && Boolean(activeAIDraftId)}
          aiPreviewActionLoading={aiPreviewActionLoading}
          onRunPreviewDraftAction={action => {
            void runPreviewDraftAction(action)
          }}
          onPreviewPointerEnter={() => setPreviewInteractionActive(true)}
          onPreviewPointerDown={() => setPreviewInteractionActive(true)}
          onPreviewPointerLeave={() => {
            setPreviewInteractionActive(false)
            setSpaceZoomActive(false)
          }}
          onZoomIn={handlePreviewZoomIn}
          onZoomOut={handlePreviewZoomOut}
          onCenter={handlePreviewCenter}
          onFit={() => {
            void fitPreviewToHeight()
          }}
        />
        <AuthRequiredModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          redirectPath={typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/resume/templates'}
          onBeforeLogin={cacheDraftBeforeLoginRedirect}
        />
      </div>
    </div>
  )
}
