import { collectUniqueSkillTokens, isRenderableSkillItem, normalizeSkillToken } from '@/lib/resume/skills'
import type { SkillVariantEstimateProps, SkillVariantRenderProps } from '../types'
import styles from '../styles/composed-template-renderer.module.scss'

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
  locale,
  measureSingleLineWidth,
}: SkillVariantEstimateProps) {
  const tokens = collectUniqueSkillTokens(items.filter(isRenderableSkillItem))
  if (tokens.length === 0) return 0

  const rowGap = 8
  const columnGap = 10
  const chipHorizontalPadding = 28
  const chipHeight = Math.max(28, Math.round(style.bodyFontSize * 2.05))
  const maxWidth = Math.max(80, contentWidthPx)

  let rowCount = 1
  let currentRowWidth = 0

  tokens.forEach(token => {
    const tokenWidth = Math.min(
      maxWidth,
      Math.max(
        48,
        Math.ceil(
          measureSingleLineWidth({
            text: token,
            fontFamily,
            fontSizePx: style.bodyFontSize,
            fontWeight: 500,
            locale,
          }),
        ) + chipHorizontalPadding,
      ),
    )

    if (currentRowWidth === 0) {
      currentRowWidth = tokenWidth
      return
    }

    if (currentRowWidth + columnGap + tokenWidth <= maxWidth) {
      currentRowWidth += columnGap + tokenWidth
      return
    }

    rowCount += 1
    currentRowWidth = tokenWidth
  })

  return rowCount * chipHeight + (rowCount - 1) * rowGap
}
