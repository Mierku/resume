import type { CSSProperties } from 'react'
import { isRenderableSkillItem, resolveSkillPercent, resolveSkillProficiencyLabel, resolveSkillTitle } from '@/lib/resume/skills'
import type { SkillVariantEstimateProps, SkillVariantRenderProps } from '../types'
import { isCompactSkillGrid, resolveSkillGridColumnLayout } from './estimate-utils'
import styles from '../styles/composed-template-renderer.module.scss'

export function renderSkills4({ items, sectionId, onNavigate, helpers }: SkillVariantRenderProps) {
  const visibleItems = items.filter(isRenderableSkillItem)
  if (visibleItems.length === 0) return null
  const compact = isCompactSkillGrid(visibleItems.length)
  const gridStyle = compact
    ? ({ ['--skills-grid-columns' as string]: String(visibleItems.length) } as CSSProperties)
    : undefined

  return (
    <div className={styles.skillsLeaderGrid} data-compact={compact ? 'true' : undefined} style={gridStyle}>
      {visibleItems.map(item => {
        const title = resolveSkillTitle(item)
        const percent = resolveSkillPercent(item.level, item.proficiency)
        const label = resolveSkillProficiencyLabel(item.proficiency, percent) || '--'

        return (
          <div key={item.id} className={styles.skillsLeaderItem}>
            <span
              {...helpers.getPreviewActionProps(onNavigate, { sectionId, itemId: item.id, fieldKey: 'name' }, styles.skillsLeaderName)}
            >
              {title || '技能项'}
            </span>
            <span className={styles.skillsLeaderLine} />
            <span
              {...helpers.getPreviewActionProps(onNavigate, { sectionId, itemId: item.id, fieldKey: item.proficiency ? 'proficiency' : 'level' }, styles.skillsLeaderValue)}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function estimateSkills4Height({
  items,
  contentWidthPx,
  style,
  fontFamily,
  locale,
  measureTextHeight,
  measureSingleLineWidth,
}: SkillVariantEstimateProps) {
  const visibleItems = items.filter(isRenderableSkillItem)
  if (visibleItems.length === 0) return 0

  const minColumnWidth = 230
  const columnGap = 26
  const rowGap = 12
  const { columns, columnWidth } = resolveSkillGridColumnLayout({
    contentWidthPx,
    minColumnWidthPx: minColumnWidth,
    columnGapPx: columnGap,
    itemCount: visibleItems.length,
  })
  const leaderLineMinWidth = 18
  const leaderColumnGap = 24
  const lineHeightPx = style.bodyFontSize * 1.28

  let totalHeight = 0

  for (let index = 0; index < visibleItems.length; index += columns) {
    const rowItems = visibleItems.slice(index, index + columns)
    const rowHeight = Math.max(
      ...rowItems.map(item => {
        const title = resolveSkillTitle(item) || '技能项'
        const percent = resolveSkillPercent(item.level, item.proficiency)
        const label = resolveSkillProficiencyLabel(item.proficiency, percent) || '--'
        const valueWidth = Math.max(
          24,
          Math.ceil(
            measureSingleLineWidth({
              text: label,
              fontFamily,
              fontSizePx: style.bodyFontSize,
              fontWeight: 500,
              locale,
            }),
          ),
        )
        const titleHeight = measureTextHeight({
          text: title,
          widthPx: Math.max(1, columnWidth - valueWidth - leaderLineMinWidth - leaderColumnGap),
          lineHeightPx,
          fontFamily,
          fontSizePx: style.bodyFontSize,
          fontWeight: 600,
          locale,
        })
        const valueHeight = measureTextHeight({
          text: label,
          widthPx: valueWidth,
          lineHeightPx,
          fontFamily,
          fontSizePx: style.bodyFontSize,
          fontWeight: 500,
          locale,
        })
        return Math.max(lineHeightPx, titleHeight, valueHeight)
      }),
    )

    totalHeight += rowHeight
    if (index + columns < visibleItems.length) {
      totalHeight += rowGap
    }
  }

  return totalHeight
}
