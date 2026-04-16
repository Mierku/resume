import { Fragment } from 'react'
import { isRenderableSkillItem } from '@/lib/resume/skills'
import type { SkillVariantEstimateProps, SkillVariantRenderProps } from '../types'
import styles from '../styles/composed-template-renderer.module.scss'

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

export function renderSkills3({ items, sectionId, onNavigate, helpers }: SkillVariantRenderProps) {
  const tokenEntries = collectSkillTokenEntries(items, sectionId)
  if (tokenEntries.length === 0) return null

  return (
    <p className={styles.skillsInlineList}>
      {tokenEntries.map((entry, index) => (
        <Fragment key={entry.id}>
          <span
            {...helpers.getPreviewActionProps(onNavigate, entry.target, styles.skillsInlineToken)}
          >
            {entry.label}
          </span>
          {index < tokenEntries.length - 1 ? ', ' : null}
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
  measureTextHeight,
}: SkillVariantEstimateProps) {
  const tokenEntries = collectSkillTokenEntries(items, 'skills')
  if (tokenEntries.length === 0) return 0

  return measureTextHeight({
    text: tokenEntries.map((entry) => entry.label).join(', '),
    widthPx: Math.max(1, contentWidthPx),
    lineHeightPx: style.bodyFontSize * 1.48,
    fontFamily,
    fontSizePx: style.bodyFontSize,
    fontWeight: 400,
  })
}
