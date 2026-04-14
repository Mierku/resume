import type { CSSProperties } from 'react'
import { isRenderableSkillItem, resolveSkillPercent, resolveSkillTitle } from '@/lib/resume/skills'
import type { SkillVariantEstimateProps, SkillVariantRenderProps } from '../types'
import { isCompactSkillGrid, resolveSkillGridColumnLayout } from './estimate-utils'
import styles from '../styles/composed-template-renderer.module.scss'

export function renderSkills2({ items, sectionId, onNavigate, helpers }: SkillVariantRenderProps) {
  const visibleItems = items.filter(isRenderableSkillItem)
  if (visibleItems.length === 0) return null
  const compact = isCompactSkillGrid(visibleItems.length)
  const gridStyle = compact
    ? ({ ['--skills-grid-columns' as string]: String(visibleItems.length) } as CSSProperties)
    : undefined

  return (
    <div className={styles.skillsProgressGrid} data-compact={compact ? 'true' : undefined} style={gridStyle}>
      {visibleItems.map(item => {
        const title = resolveSkillTitle(item)
        const percent = resolveSkillPercent(item.level, item.proficiency)

        return (
          <div key={item.id} className={styles.skillsProgressItem}>
            <div className={styles.skillsProgressHead}>
              <span
                {...helpers.getPreviewActionProps(onNavigate, { sectionId, itemId: item.id, fieldKey: 'name' }, styles.skillsProgressName)}
              >
                {title || '技能项'}
              </span>
            </div>
            <div className={styles.skillsProgressTrack}>
              <span
                {...helpers.getPreviewActionProps(onNavigate, { sectionId, itemId: item.id, fieldKey: item.level ? 'level' : 'proficiency' }, styles.skillsProgressFill)}
                style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function estimateSkills2Height({
  items,
  contentWidthPx,
  style,
  fontFamily,
  measureTextHeight,
}: SkillVariantEstimateProps) {
  const visibleItems = items.filter(isRenderableSkillItem)
  if (visibleItems.length === 0) return 0

  const minColumnWidth = 210
  const columnGap = 24
  const rowGap = 16
  const { columns, columnWidth } = resolveSkillGridColumnLayout({
    contentWidthPx,
    minColumnWidthPx: minColumnWidth,
    columnGapPx: columnGap,
    itemCount: visibleItems.length,
  })
  const trackGap = 8
  const trackHeight = 8
  const titleLineHeightPx = style.bodyFontSize * 1.22

  let totalHeight = 0

  for (let index = 0; index < visibleItems.length; index += columns) {
    const rowItems = visibleItems.slice(index, index + columns)
    const rowHeight = Math.max(
      ...rowItems.map(item => {
        const title = resolveSkillTitle(item) || '技能项'
        const titleHeight = measureTextHeight({
          text: title,
          widthPx: Math.max(1, columnWidth),
          lineHeightPx: titleLineHeightPx,
          fontFamily,
          fontSizePx: style.bodyFontSize,
          fontWeight: 700,
        })
        return titleHeight + trackGap + trackHeight
      }),
    )

    totalHeight += rowHeight
    if (index + columns < visibleItems.length) {
      totalHeight += rowGap
    }
  }

  return totalHeight
}
