import { collectUniqueSkillTokens, isRenderableSkillItem, normalizeSkillToken } from '@/lib/resume/skills'
import type { SkillVariantEstimateProps, SkillVariantRenderProps } from '../types'
import styles from '../styles/composed-template-renderer.module.scss'

const SKILLS_TAG_ROW_GAP_PX = 8
const SKILLS_TAG_COLUMN_GAP_PX = 10
const SKILLS_TAG_PADDING_X_PX = 14
const SKILLS_TAG_MIN_HEIGHT_PX = 28
const SKILLS_TAG_LINE_HEIGHT = 1.1
const SKILLS_TAG_FONT_WEIGHT = 500

function resolveTokenTarget(
  items: SkillVariantRenderProps['items'],
  token: string,
  sectionId: string,
) {
  const normalizedToken = normalizeSkillToken(token)

  for (const item of items) {
    if (!isRenderableSkillItem(item)) continue
    if (normalizeSkillToken(String(item.name || '')) === normalizedToken) {
      return {
        sectionId,
        itemId: item.id,
        fieldKey: 'name',
      }
    }

    if ((item.keywords || []).some(keyword => normalizeSkillToken(String(keyword || '')) === normalizedToken)) {
      return {
        sectionId,
        itemId: item.id,
        fieldKey: 'keywords',
      }
    }
  }

  return { sectionId }
}

export function renderSkills1({ items, sectionId, onNavigate, helpers }: SkillVariantRenderProps) {
  const tokens = collectUniqueSkillTokens(items.filter(isRenderableSkillItem))
  if (tokens.length === 0) return null

  return (
    <div className={styles.skillsTagGrid}>
      {tokens.map(token => (
        <span
          key={token}
          {...helpers.getPreviewActionProps(onNavigate, resolveTokenTarget(items, token, sectionId), styles.skillsTagToken)}
        >
          {token}
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
  const tokens = collectUniqueSkillTokens(items.filter(isRenderableSkillItem))
  if (tokens.length === 0) return 0

  const chipHorizontalPadding = SKILLS_TAG_PADDING_X_PX * 2
  // Keep the estimate aligned with `.skillsTagToken`:
  // min-height: 28px; padding: 0 14px; line-height: 1.1.
  const chipHeight = Math.max(SKILLS_TAG_MIN_HEIGHT_PX, style.bodyFontSize * SKILLS_TAG_LINE_HEIGHT)
  const maxWidth = Math.max(80, contentWidthPx)

  let rowCount = 1
  let currentRowWidth = 0

  tokens.forEach(token => {
    const tokenWidth = Math.min(
      maxWidth,
      Math.max(
        chipHorizontalPadding,
        Math.ceil(
          measureSingleLineWidth({
            text: token,
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
