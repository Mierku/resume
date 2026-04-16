import { isRenderableSkillItem } from '@/lib/resume/skills'
import type { SkillVariantEstimateProps, SkillVariantRenderProps } from '../types'
import styles from '../styles/composed-template-renderer.module.scss'

const SKILLS_TAG_ROW_GAP_PX = 8
const SKILLS_TAG_COLUMN_GAP_PX = 10
const SKILLS_TAG_PADDING_X_PX = 14
const SKILLS_TAG_MIN_HEIGHT_PX = 28
const SKILLS_TAG_LINE_HEIGHT = 1.1
const SKILLS_TAG_FONT_WEIGHT = 500

function collectSkillTokenEntries(
  items: SkillVariantRenderProps['items'],
  sectionId: string,
) {
  const entries: Array<{
    id: string
    label: string
    target: { sectionId: string; itemId: string; fieldKey: 'name' | 'keywords' }
  }> = []

  items.forEach((item, index) => {
    if (!isRenderableSkillItem(item)) return
    const itemId = String(item.id || `${sectionId}-${index}`)
    const name = String(item.name || '').trim()
    if (name) {
      entries.push({
        id: `${itemId}:name`,
        label: name,
        target: { sectionId, itemId, fieldKey: 'name' },
      })
    }

    ;(Array.isArray(item.keywords) ? item.keywords : []).forEach((keyword, keywordIndex) => {
      const label = String(keyword || '').trim()
      if (!label) return

      entries.push({
        id: `${itemId}:keyword-${keywordIndex}`,
        label,
        target: { sectionId, itemId, fieldKey: 'keywords' },
      })
    })
  })

  return entries
}

export function renderSkills1({ items, sectionId, onNavigate, helpers }: SkillVariantRenderProps) {
  const tokenEntries = collectSkillTokenEntries(items, sectionId)
  if (tokenEntries.length === 0) return null

  return (
    <div className={styles.skillsTagGrid}>
      {tokenEntries.map((entry) => (
        <span
          key={entry.id}
          {...helpers.getPreviewActionProps(onNavigate, entry.target, styles.skillsTagToken)}
        >
          {entry.label}
        </span>
      ))}
    </div>
  )
}

export function estimateSkills1Height({
  items,
  contentWidthPx,
  style,
  fontFamily,
  measureSingleLineWidth,
}: SkillVariantEstimateProps) {
  const tokenEntries = collectSkillTokenEntries(items, 'skills')
  if (tokenEntries.length === 0) return 0

  const chipHorizontalPadding = SKILLS_TAG_PADDING_X_PX * 2
  // Keep the estimate aligned with `.skillsTagToken`:
  // min-height: 28px; padding: 0 14px; line-height: 1.1.
  const chipHeight = Math.max(SKILLS_TAG_MIN_HEIGHT_PX, style.bodyFontSize * SKILLS_TAG_LINE_HEIGHT)
  const maxWidth = Math.max(80, contentWidthPx)

  let rowCount = 1
  let currentRowWidth = 0

  tokenEntries.forEach(({ label }) => {
    const tokenWidth = Math.min(
      maxWidth,
      Math.max(
        chipHorizontalPadding,
        Math.ceil(
          measureSingleLineWidth({
            text: label,
            fontFamily,
            fontSizePx: style.bodyFontSize,
            fontWeight: SKILLS_TAG_FONT_WEIGHT,
          }),
        ) + chipHorizontalPadding,
      ),
    )

    if (currentRowWidth === 0) {
      currentRowWidth = tokenWidth
      return
    }

    if (currentRowWidth + SKILLS_TAG_COLUMN_GAP_PX + tokenWidth <= maxWidth) {
      currentRowWidth += SKILLS_TAG_COLUMN_GAP_PX + tokenWidth
      return
    }

    rowCount += 1
    currentRowWidth = tokenWidth
  })

  return rowCount * chipHeight + (rowCount - 1) * SKILLS_TAG_ROW_GAP_PX
}
