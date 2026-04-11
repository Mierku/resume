import { Fragment } from 'react'
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

export function renderSkills3({ items, sectionId, onNavigate, helpers }: SkillVariantRenderProps) {
  const tokens = collectUniqueSkillTokens(items.filter(isRenderableSkillItem))
  if (tokens.length === 0) return null

  return (
    <p className={styles.skillsInlineList}>
      {tokens.map((token, index) => (
        <Fragment key={token}>
          <span
            {...helpers.getPreviewActionProps(onNavigate, resolveTokenTarget(items, token, sectionId), styles.skillsInlineToken)}
          >
            {token}
          </span>
          {index < tokens.length - 1 ? ', ' : null}
        </Fragment>
      ))}
    </p>
  )
}

export function estimateSkills3Height({
  items,
  contentWidthPx,
  style,
  fontFamily,
  locale,
  measureTextHeight,
}: SkillVariantEstimateProps) {
  const tokens = collectUniqueSkillTokens(items.filter(isRenderableSkillItem))
  if (tokens.length === 0) return 0

  return measureTextHeight({
    text: tokens.join(', '),
    widthPx: Math.max(1, contentWidthPx),
    lineHeightPx: style.bodyFontSize * 1.48,
    fontFamily,
    fontSizePx: style.bodyFontSize,
    fontWeight: 400,
    locale,
  })
}
