'use client'

import dynamic from 'next/dynamic'
import {
  type ComponentProps,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DateRangePickerField } from '@/components/ui/date-range-picker'
import { MonthPickerField } from '@/components/ui/month-picker'
import { dateToYearMonth, joinPeriodValue, splitPeriodValue } from '@/lib/date-fields'
import {
  clampToRange,
  formatNumericValue,
  parseNumericInput,
  type NumericLimitConfig,
} from '@/lib/resume/editor-limits'
import { STANDARD_SECTION_IDS, type CustomSectionType, type ResumeData, type StandardSectionType } from '@/lib/resume/types'
import {
  BASICS_HEIGHT_LIMIT,
  BASICS_WEIGHT_LIMIT,
  createNestedPatch,
  DEFAULT_SKILL_PROFICIENCY,
  GENDER_OPTIONS,
  getNestedValue,
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
} from '@/components/resume-builder/editor/section-editor-shared'
import { Button, Checkbox, IconChevronRight, IconDelete, IconEye, Input, Message, Option, Select, Space } from '@/components/resume-builder/primitives'
import { useResumeBuilderStore } from '@/components/resume-builder/store/useResumeBuilderStore'
import { SectionFormField, SectionFormGrid } from './SectionFormLayout'

const RichTextEditor = dynamic(
  () =>
    import('@/components/resume-builder/controls/RichTextEditor/RichTextEditor').then(
      (module) => module.RichTextEditor,
    ),
  { ssr: false },
)

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(' ')
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
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startValue: number
  } | null>(null)

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
          onKeyDown={(event) => {
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

interface EditorAnchorProps {
  sectionId: string
  itemId?: string
  fieldKey?: string
  className?: string
  children: ReactNode
}

function EditorAnchor({ sectionId, itemId, fieldKey, className, children }: EditorAnchorProps) {
  return (
    <div
      className={joinClassNames('resume-focus-target', className)}
      data-editor-section-id={sectionId}
      data-editor-item-id={itemId}
      data-editor-field-key={fieldKey}
    >
      {children}
    </div>
  )
}

function resolveEditorItemId(rawId: unknown, fallback: string) {
  const normalized = typeof rawId === 'string' ? rawId : String(rawId ?? '')
  return normalized.trim() || fallback
}

const STANDARD_SECTION_EXPANDED_ITEM_STATE: Partial<
  Record<StandardSectionType, string | null>
> = {}

export function setStandardSectionExpandedItem(
  sectionId: StandardSectionType,
  expandedItemId: string | null,
) {
  STANDARD_SECTION_EXPANDED_ITEM_STATE[sectionId] = expandedItemId
}

function getStandardSectionExpandedItem(sectionId: StandardSectionType) {
  return STANDARD_SECTION_EXPANDED_ITEM_STATE[sectionId] ?? null
}

interface CollapseMotionProps {
  open: boolean
  className?: string
  children: ReactNode
}

function CollapseMotion({ open, className, children }: CollapseMotionProps) {
  return (
    <div
      className={joinClassNames('resume-collapse-motion', className)}
      style={{ display: open ? 'block' : 'none' }}
      aria-hidden={!open}
    >
      <div className="resume-collapse-motion-inner">
        {children}
      </div>
    </div>
  )
}

type BasicInfoExtraFieldKey =
  | 'intentionCity'
  | 'birthDate'
  | 'workYears'
  | 'email'
  | 'maritalStatus'
  | 'nativePlace'
  | 'politicalStatus'
  | 'heightWeight'
  | 'location'
  | 'websiteUrl'
  | 'websiteLabel'

const BASIC_INFO_EXTRA_FIELDS: Array<{ key: BasicInfoExtraFieldKey; label: string }> = [
  { key: 'intentionCity', label: '意向城市' },
  { key: 'birthDate', label: '出生年月' },
  { key: 'workYears', label: '工作年限' },
  { key: 'email', label: '邮箱' },
  { key: 'maritalStatus', label: '婚姻状况' },
  { key: 'nativePlace', label: '籍贯' },
  { key: 'politicalStatus', label: '政治面貌' },
  { key: 'heightWeight', label: '身高 / 体重' },
  { key: 'location', label: '当前所在地' },
  { key: 'websiteUrl', label: '网站链接' },
  { key: 'websiteLabel', label: '网站显示文本' },
]

function hasNonEmptyText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

type PanelInputProps = ComponentProps<typeof Input>

function PanelInput(props: PanelInputProps) {
  return <Input {...props} allowClear />
}

export function BasicInfoSectionEditor() {
  const basics = useResumeBuilderStore((state) => state.data.basics)
  const picture = useResumeBuilderStore((state) => state.data.picture)
  const updateResumeData = useResumeBuilderStore((state) => state.updateResumeData)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const photoFloatingRef = useRef<HTMLDivElement | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoExpanded, setPhotoExpanded] = useState(false)
  const [enabledExtraFields, setEnabledExtraFields] = useState<BasicInfoExtraFieldKey[]>([])

  const updateField = (field: keyof ResumeData['basics'], value: string) => {
    updateResumeData((draft) => {
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

      updateResumeData((draft) => {
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
    updateResumeData((draft) => {
      draft.picture.url = ''
    })
    Message.success('已删除证件照')
  }

  const setPictureVisible = (visible: boolean) => {
    updateResumeData((draft) => {
      draft.picture.hidden = !visible
    })
  }

  useEffect(() => {
    if (!photoExpanded) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!photoFloatingRef.current) return
      const target = event.target
      if (target instanceof Node && !photoFloatingRef.current.contains(target)) {
        setPhotoExpanded(false)
      }
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPhotoExpanded(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [photoExpanded])

  const extraFieldHasValue = useMemo<Record<BasicInfoExtraFieldKey, boolean>>(
    () => ({
      intentionCity: hasNonEmptyText(basics.intentionCity),
      birthDate: hasNonEmptyText(basics.birthDate),
      workYears: hasNonEmptyText(basics.workYears),
      email: hasNonEmptyText(basics.email),
      maritalStatus: hasNonEmptyText(basics.maritalStatus),
      nativePlace: hasNonEmptyText(basics.nativePlace),
      politicalStatus: hasNonEmptyText(basics.politicalStatus),
      heightWeight: hasNonEmptyText(basics.heightCm) || hasNonEmptyText(basics.weightKg),
      location: hasNonEmptyText(basics.location),
      websiteUrl: hasNonEmptyText(basics.website.url),
      websiteLabel: hasNonEmptyText(basics.website.label),
    }),
    [
      basics.birthDate,
      basics.email,
      basics.heightCm,
      basics.intentionCity,
      basics.location,
      basics.maritalStatus,
      basics.nativePlace,
      basics.politicalStatus,
      basics.website.label,
      basics.website.url,
      basics.weightKg,
      basics.workYears,
    ],
  )

  const isExtraFieldVisible = (fieldKey: BasicInfoExtraFieldKey) =>
    enabledExtraFields.includes(fieldKey) || extraFieldHasValue[fieldKey]

  const hiddenExtraFields = BASIC_INFO_EXTRA_FIELDS.filter((field) => !isExtraFieldVisible(field.key))

  const showExtraField = (fieldKey: BasicInfoExtraFieldKey) => {
    setEnabledExtraFields((prev) => (prev.includes(fieldKey) ? prev : [...prev, fieldKey]))
  }

  return (
    <div className="space-y-4">
      <SectionFormGrid className="resume-basics-grid">
        <SectionFormField>
          <EditorAnchor sectionId="basics" fieldKey="name">
            <label className="text-xs text-muted-foreground block mb-2">姓名</label>
            <PanelInput value={basics.name} onChange={(value) => updateField('name', value)} placeholder="请输入姓名" />
          </EditorAnchor>
        </SectionFormField>

        <SectionFormField className="resume-basics-photo-field">
          <EditorAnchor sectionId="basics" fieldKey="picture">
            <label className="text-xs text-muted-foreground block mb-2">证件照</label>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void handleUploadPhoto(file)
                }
                event.target.value = ''
              }}
            />

            <div className="resume-basics-photo-control-wrap">
              <div className="resume-basics-photo-placeholder-slot" aria-hidden />
              <div
                ref={photoFloatingRef}
                className={joinClassNames('resume-basics-photo-floating', photoExpanded && 'is-expanded')}
              >
                <button
                  type="button"
                  className="resume-basics-photo-trigger"
                  onClick={() => setPhotoExpanded((prev) => !prev)}
                  aria-expanded={photoExpanded}
                  aria-label="证件照设置"
                >
                  <span className="resume-basics-photo-trigger-value">
                    {photoUploading
                      ? '上传中...'
                      : picture.url
                        ? '已上传证件照，点击管理'
                        : '点击上传证件照'}
                  </span>
                  <span className="resume-basics-photo-trigger-icon" aria-hidden>
                    <IconChevronRight />
                  </span>
                </button>

                <div className="resume-basics-photo-expand-panel">
                  <div className="resume-basics-photo-head">
                    <div className="resume-basics-inline-checkbox">
                      <Checkbox
                        checked={!picture.hidden}
                        onChange={(checked) => setPictureVisible(Boolean(checked))}
                      />
                      <button
                        type="button"
                        className="resume-basics-inline-checkbox-button"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setPictureVisible(picture.hidden)
                        }}
                      >
                        展示照片
                      </button>
                    </div>
                  </div>

                  <div
                    className={joinClassNames(
                      'resume-basics-photo-preview-shell',
                      picture.url && 'has-image',
                    )}
                  >
                    <button
                      type="button"
                      className={joinClassNames(
                        'resume-basics-photo-preview',
                        !picture.url && 'is-empty',
                      )}
                      onClick={() => {
                        setPhotoExpanded(true)
                        photoInputRef.current?.click()
                      }}
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
                          onClick={(event) => {
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
                          onClick={(event) => {
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
                </div>
              </div>
            </div>
          </EditorAnchor>
        </SectionFormField>

        <SectionFormField>
          <EditorAnchor sectionId="basics" fieldKey="intentionPosition headline">
            <label className="text-xs text-muted-foreground block mb-2">求职意向</label>
            <PanelInput
              value={basics.intentionPosition || basics.headline}
              onChange={(value) =>
                updateResumeData((draft) => {
                  draft.basics.intentionPosition = value
                  draft.basics.headline = value
                })
              }
              placeholder="例如：前端开发工程师"
            />
          </EditorAnchor>
        </SectionFormField>

        <SectionFormField>
          <EditorAnchor sectionId="basics" fieldKey="gender">
            <label className="text-xs text-muted-foreground block mb-2">性别</label>
            <Select
              value={basics.gender}
              onChange={(value) => updateField('gender', Array.isArray(value) ? value[0] || '' : value)}
              style={{ width: '100%' }}
            >
              {GENDER_OPTIONS.map((option) => (
                <Option key={option.value || 'empty-gender'} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </EditorAnchor>
        </SectionFormField>

        <SectionFormField>
          <EditorAnchor sectionId="basics" fieldKey="ethnicity">
            <label className="text-xs text-muted-foreground block mb-2">民族</label>
            <PanelInput value={basics.ethnicity} onChange={(value) => updateField('ethnicity', value)} placeholder="请输入民族" />
          </EditorAnchor>
        </SectionFormField>

        <SectionFormField>
          <EditorAnchor sectionId="basics" fieldKey="phone">
            <label className="text-xs text-muted-foreground block mb-2">电话</label>
            <PanelInput value={basics.phone} onChange={(value) => updateField('phone', value)} placeholder="请输入电话" />
          </EditorAnchor>
        </SectionFormField>

        <SectionFormField>
          <EditorAnchor sectionId="basics" fieldKey="intentionAvailability">
            <label className="text-xs text-muted-foreground block mb-2">当前状态</label>
            <Select
              value={basics.intentionAvailability}
              onChange={(value) => updateField('intentionAvailability', toSingleSelectValue(value))}
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
        </SectionFormField>

        <SectionFormField>
          <EditorAnchor sectionId="basics" fieldKey="intentionSalary">
            <label className="text-xs text-muted-foreground block mb-2">期望薪资</label>
            <PanelInput value={basics.intentionSalary} onChange={(value) => updateField('intentionSalary', value)} placeholder="例如：25k-35k" />
          </EditorAnchor>
        </SectionFormField>

        {isExtraFieldVisible('intentionCity') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="intentionCity">
              <label className="text-xs text-muted-foreground block mb-2">意向城市</label>
              <PanelInput value={basics.intentionCity} onChange={(value) => updateField('intentionCity', value)} placeholder="例如：上海" />
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('birthDate') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="birthDate convertBirthToAge">
              <div className="resume-basics-label-row">
                <label className="text-xs text-muted-foreground block">出生年月</label>
                <label className="resume-basics-inline-checkbox">
                  <Checkbox
                    checked={basics.convertBirthToAge}
                    onChange={(checked) =>
                      updateResumeData((draft) => {
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
                onChange={(nextValue) => updateField('birthDate', nextValue)}
              />
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('workYears') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="workYears">
              <label className="text-xs text-muted-foreground block mb-2">工作年限</label>
              <Select
                value={basics.workYears}
                onChange={(value) => updateField('workYears', Array.isArray(value) ? value[0] || '' : value)}
                style={{ width: '100%' }}
              >
                {WORK_YEAR_OPTIONS.map((option) => (
                  <Option key={option.value || 'empty-work-years'} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('email') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="email">
              <label className="text-xs text-muted-foreground block mb-2">联系邮箱</label>
              <PanelInput value={basics.email} onChange={(value) => updateField('email', value)} placeholder="请输入邮箱" />
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('maritalStatus') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="maritalStatus">
              <label className="text-xs text-muted-foreground block mb-2">婚姻状况</label>
              <Select
                value={basics.maritalStatus}
                onChange={(value) => updateField('maritalStatus', Array.isArray(value) ? value[0] || '' : value)}
                style={{ width: '100%' }}
              >
                {MARITAL_STATUS_OPTIONS.map((option) => (
                  <Option key={option.value || 'empty-marital'} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('nativePlace') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="nativePlace">
              <label className="text-xs text-muted-foreground block mb-2">籍贯</label>
              <PanelInput value={basics.nativePlace} onChange={(value) => updateField('nativePlace', value)} placeholder="请输入籍贯" />
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('politicalStatus') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="politicalStatus">
              <label className="text-xs text-muted-foreground block mb-2">政治面貌</label>
              <Select
                value={basics.politicalStatus}
                onChange={(value) => updateField('politicalStatus', Array.isArray(value) ? value[0] || '' : value)}
                style={{ width: '100%' }}
              >
                {POLITICAL_STATUS_OPTIONS.map((option) => (
                  <Option key={option.value || 'empty-politics'} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('heightWeight') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="heightCm weightKg">
              <label className="text-xs text-muted-foreground block mb-2">身高 / 体重</label>
              <div className="grid grid-cols-2 gap-2">
                <ScrubbableNumberInput
                  value={basics.heightCm}
                  placeholder="身高"
                  suffix="cm"
                  config={BASICS_HEIGHT_LIMIT}
                  onChange={(nextValue) => updateField('heightCm', nextValue)}
                />
                <ScrubbableNumberInput
                  value={basics.weightKg}
                  placeholder="体重"
                  suffix="kg"
                  config={BASICS_WEIGHT_LIMIT}
                  onChange={(nextValue) => updateField('weightKg', nextValue)}
                />
              </div>
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('location') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="location">
              <label className="text-xs text-muted-foreground block mb-2">当前所在地</label>
              <PanelInput value={basics.location} onChange={(value) => updateField('location', value)} placeholder="请输入当前城市" />
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('websiteUrl') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="website.url">
              <label className="text-xs text-muted-foreground block mb-2">个人网站链接</label>
              <PanelInput
                value={basics.website.url}
                onChange={(value) =>
                  updateResumeData((draft) => {
                    draft.basics.website.url = value
                  })
                }
                placeholder="https://example.com"
              />
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {isExtraFieldVisible('websiteLabel') ? (
          <SectionFormField>
            <EditorAnchor sectionId="basics" fieldKey="website.label">
              <label className="text-xs text-muted-foreground block mb-2">网站显示文本</label>
              <PanelInput
                value={basics.website.label}
                onChange={(value) =>
                  updateResumeData((draft) => {
                    draft.basics.website.label = value
                  })
                }
                placeholder="个人主页"
              />
            </EditorAnchor>
          </SectionFormField>
        ) : null}

        {hiddenExtraFields.length > 0 ? (
          <SectionFormField wide className="resume-basics-extra-field">
            <section className="resume-basics-extra-section" aria-label="其他信息">
              <div className="resume-basics-extra">
                <p className="resume-basics-extra-title">其他信息</p>
                <div className="resume-basics-extra-tags">
                  {hiddenExtraFields.map((field) => (
                    <button
                      key={field.key}
                      type="button"
                      className="resume-basics-extra-tag"
                      onClick={() => showExtraField(field.key)}
                    >
                      + {field.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </SectionFormField>
        ) : null}
      </SectionFormGrid>
    </div>
  )
}

function SummaryEditor() {
  const summary = useResumeBuilderStore((state) => state.data.summary)
  const updateResumeData = useResumeBuilderStore((state) => state.updateResumeData)

  return (
    <div className="space-y-3">
      <EditorAnchor sectionId="summary" fieldKey="content">
        <RichTextEditor
          value={summary.content}
          onChange={(value) =>
            updateResumeData((draft) => {
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
  const section = useResumeBuilderStore((state) => state.data.sections.skills)
  const updateResumeData = useResumeBuilderStore((state) => state.updateResumeData)
  const updateItem = useResumeBuilderStore((state) => state.updateStandardSectionItem)
  const removeItem = useResumeBuilderStore((state) => state.removeStandardSectionItem)

  return (
    <div className="space-y-3">
      <EditorAnchor sectionId="skills" fieldKey="intro">
        <RichTextEditor
          value={section.intro}
          onChange={(value) =>
            updateResumeData((draft) => {
              draft.sections.skills.intro = value
            })
          }
          placeholder="输入技能说明，例如技术栈、擅长方向、项目经验和方法论..."
          minHeight={180}
        />
      </EditorAnchor>

      {section.items.length > 0 ? (
        <div className="resume-skill-inline-list">
          {section.items.map((item, index) => {
            const itemId = resolveEditorItemId(item.id, `skills-${index}`)

            return (
              <div key={itemId} className="resume-soft-card resume-skill-inline-card">
                <div className="resume-skill-inline-content">
                  <EditorAnchor
                    sectionId="skills"
                    itemId={itemId}
                    fieldKey="name"
                    className="resume-skill-inline-field is-name"
                  >
                    <PanelInput
                      value={item.name}
                      onChange={(value) => updateItem('skills', index, { name: value })}
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
                      onChange={(value) =>
                        updateItem('skills', index, {
                          proficiency: toSingleSelectValue(value) || DEFAULT_SKILL_PROFICIENCY,
                        })
                      }
                      placeholder="选择熟练度"
                      style={{ width: '100%' }}
                    >
                      {SKILL_PROFICIENCY_OPTIONS.map((option) => (
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
            )
          })}
        </div>
      ) : (
        <div className="resume-skill-inline-empty text-xs text-muted-foreground">点击下方“新增条目”添加技能词条</div>
      )}
    </div>
  )
}

function StandardSectionEditor({ sectionId }: { sectionId: StandardSectionType }) {
  const section = useResumeBuilderStore((state) => state.data.sections[sectionId])
  const updateItem = useResumeBuilderStore((state) => state.updateStandardSectionItem)
  const removeItem = useResumeBuilderStore((state) => state.removeStandardSectionItem)
  const [, forceCollapseStateVersion] = useState(0)
  const collapseEnabled = supportsStandardSectionItemSummary(sectionId)
  const itemIds = useMemo(
    () =>
      section.items.map((item, index) =>
        resolveEditorItemId(item.id, `${sectionId}-${index}`),
      ),
    [section.items, sectionId],
  )
  const rememberedExpandedItemId = getStandardSectionExpandedItem(sectionId)
  const expandedItemId =
    rememberedExpandedItemId && itemIds.includes(rememberedExpandedItemId)
      ? rememberedExpandedItemId
      : null

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {section.items.map((item, index) => {
          const record = item as unknown as Record<string, unknown>
          const fields = SECTION_FIELD_CONFIG[sectionId]
          const itemId = resolveEditorItemId(item.id, `${sectionId}-${index}`)
          const summary = resolveStandardSectionItemSummary(sectionId, record)
          const collapsed = collapseEnabled ? expandedItemId !== itemId : false
          const toggleCollapsed = () => {
            if (!collapseEnabled) return
            setStandardSectionExpandedItem(
              sectionId,
              expandedItemId === itemId ? null : itemId,
            )
            forceCollapseStateVersion((version) => version + 1)
          }

          return (
            <EditorAnchor
              key={itemId}
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
                onKeyDown={(event) => {
                  if (!collapseEnabled) return
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleCollapsed()
                  }
                }}
              >
                <div className="resume-standard-item-head-main">
                  {collapseEnabled ? (
                    <span
                      className={joinClassNames('resume-standard-item-head-toggle', !collapsed && 'is-expanded')}
                    >
                      <IconChevronRight />
                    </span>
                  ) : null}
                  {summary ? (
                    <div
                      className="resume-standard-item-summary"
                      title={`${summary.primary} / ${summary.secondary}`}
                    >
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
                      onClick={(event) => {
                        event.stopPropagation()
                        removeItem(sectionId, index)
                      }}
                    />
                  </Space>
                </div>
              </div>

              <CollapseMotion open={!collapsed} className="resume-standard-item-collapse">
                <SectionFormGrid className="resume-standard-item-content">
                          {fields.map((field) => {
                            const currentValue = getNestedValue(record, field.key)
                            const isWideField = field.type === 'rich' || field.type === 'keywords'

                            if (field.type === 'rich') {
                              return (
                                <SectionFormField key={field.key} className="resume-standard-item-field" wide={isWideField}>
                                  <EditorAnchor sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                                    <label className="text-xs text-muted-foreground block mb-2">{field.label}</label>
                                    <RichTextEditor
                                      value={String(currentValue || '')}
                                      onChange={(value) =>
                                        updateItem(sectionId, index, createNestedPatch(record, field.key, value))
                                      }
                                      minHeight={110}
                                    />
                                  </EditorAnchor>
                                </SectionFormField>
                              )
                            }

                            if (field.type === 'keywords') {
                              return (
                                <SectionFormField key={field.key} className="resume-standard-item-field" wide={isWideField}>
                                  <EditorAnchor sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                                    <label className="text-xs text-muted-foreground block mb-2">{field.label}</label>
                                    <PanelInput
                                      value={Array.isArray(currentValue) ? currentValue.join(', ') : ''}
                                      onChange={(value) => {
                                        const keywords = value
                                          .split(/[,，]/)
                                          .map((item) => item.trim())
                                          .filter(Boolean)
                                        updateItem(sectionId, index, createNestedPatch(record, field.key, keywords))
                                      }}
                                      placeholder="逗号分隔"
                                    />
                                  </EditorAnchor>
                                </SectionFormField>
                              )
                            }

                            if (field.type === 'number') {
                              return (
                                <SectionFormField key={field.key} className="resume-standard-item-field" wide={isWideField}>
                                  <EditorAnchor sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                                    <label className="text-xs text-muted-foreground block mb-2">{field.label}</label>
                                    <PanelInput
                                      type="number"
                                      value={String(currentValue || '')}
                                      onChange={(value) =>
                                        updateItem(
                                          sectionId,
                                          index,
                                          createNestedPatch(record, field.key, Number(value || 0)),
                                        )
                                      }
                                    />
                                  </EditorAnchor>
                                </SectionFormField>
                              )
                            }

                            if (field.key === 'period') {
                              const { start, end } = splitPeriodValue(String(currentValue || ''))

                              return (
                                <SectionFormField key={field.key} className="resume-standard-item-field" wide={isWideField}>
                                  <EditorAnchor sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                                    <DateRangePickerField
                                      label={field.label}
                                      start={start}
                                      end={end}
                                      onChange={(nextStart, nextEnd) => {
                                        updateItem(
                                          sectionId,
                                          index,
                                          createNestedPatch(record, field.key, joinPeriodValue(nextStart, nextEnd)),
                                        )
                                      }}
                                    />
                                  </EditorAnchor>
                                </SectionFormField>
                              )
                            }

                            if (field.key.toLowerCase().includes('date')) {
                              return (
                                <SectionFormField key={field.key} className="resume-standard-item-field" wide={isWideField}>
                                  <EditorAnchor sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                                    <MonthPickerField
                                      label={field.label}
                                      value={String(currentValue || '')}
                                      placeholder="不填"
                                      onChange={(nextValue) =>
                                        updateItem(sectionId, index, createNestedPatch(record, field.key, nextValue))
                                      }
                                    />
                                  </EditorAnchor>
                                </SectionFormField>
                              )
                            }

                            return (
                              <SectionFormField key={field.key} className="resume-standard-item-field" wide={isWideField}>
                                <EditorAnchor sectionId={sectionId} itemId={itemId} fieldKey={field.key}>
                                  <label className="text-xs text-muted-foreground block mb-2">{field.label}</label>
                                  <PanelInput
                                    value={String(currentValue || '')}
                                    onChange={(value) =>
                                      updateItem(sectionId, index, createNestedPatch(record, field.key, value))
                                    }
                                  />
                                </EditorAnchor>
                              </SectionFormField>
                            )
                          })}
                        </SectionFormGrid>
                      </CollapseMotion>
                    </EditorAnchor>
                  )
                })}
      </div>
    </div>
  )
}

function CustomSectionInlineEditor({ sectionId }: { sectionId: string }) {
  const section = useResumeBuilderStore((state) =>
    state.data.customSections.find((item) => item.id === sectionId),
  )
  const updateCustomSection = useResumeBuilderStore((state) => state.updateCustomSection)
  const updateCustomItem = useResumeBuilderStore((state) => state.updateCustomSectionItem)
  const removeCustomItem = useResumeBuilderStore((state) => state.removeCustomSectionItem)

  if (!section) {
    return <div className="text-xs text-muted-foreground">该自定义板块不存在</div>
  }

  return (
    <div className="space-y-3">
      <EditorAnchor sectionId={section.id}>
        <Select
          value={section.type}
          onChange={(value) => {
            const nextValue = Array.isArray(value) ? value[0] || 'summary' : value
            updateCustomSection(section.id, {
              type: nextValue as CustomSectionType,
            })
          }}
        >
          <Option value="summary">文本摘要</Option>
          <Option value="cover-letter">求职信</Option>
          {STANDARD_SECTION_IDS.map((id) => (
            <Option key={id} value={id}>
              {STANDARD_SECTION_LABELS[id]}
            </Option>
          ))}
        </Select>
      </EditorAnchor>

      <div className="space-y-3">
        {section.items.map((item, index) => {
          const itemId = resolveEditorItemId(item.id, `${section.id}-${index}`)

          return (
            <EditorAnchor key={itemId} sectionId={section.id} itemId={itemId} className="resume-soft-card p-2">
              <div className="resume-custom-inline-item-head">
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
                      onChange={(value) =>
                        updateCustomItem(section.id, index, {
                          recipient: value,
                        })
                      }
                      minHeight={80}
                    />
                  </EditorAnchor>

                  <EditorAnchor sectionId={section.id} itemId={itemId} fieldKey="content">
                    <label className="block text-xs text-muted-foreground">正文</label>
                    <RichTextEditor
                      value={String((item as unknown as { content?: string }).content || '')}
                      onChange={(value) =>
                        updateCustomItem(section.id, index, {
                          content: value,
                        })
                      }
                      minHeight={120}
                    />
                  </EditorAnchor>
                </div>
              ) : (
                <EditorAnchor sectionId={section.id} itemId={itemId} fieldKey="content">
                  <RichTextEditor
                    value={String((item as unknown as { content?: string }).content || '')}
                    onChange={(value) =>
                      updateCustomItem(section.id, index, {
                        content: value,
                      })
                    }
                    minHeight={120}
                  />
                </EditorAnchor>
              )}
            </EditorAnchor>
          )
        })}
      </div>
    </div>
  )
}

export function SectionEditorBody({ sectionId }: { sectionId: string }) {
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
