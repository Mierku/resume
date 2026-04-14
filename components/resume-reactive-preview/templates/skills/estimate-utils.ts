const COMPACT_SKILL_GRID_MAX_ITEMS = 2

export function isCompactSkillGrid(itemCount: number) {
  return itemCount > 0 && itemCount <= COMPACT_SKILL_GRID_MAX_ITEMS
}

function resolveAutoFitColumnCount({
  contentWidthPx,
  minColumnWidthPx,
  columnGapPx,
  itemCount,
}: {
  contentWidthPx: number
  minColumnWidthPx: number
  columnGapPx: number
  itemCount: number
}) {
  if (itemCount <= 1) return Math.max(1, itemCount)

  const safeWidth = Math.max(1, contentWidthPx)
  const maxColumns = Math.max(1, Math.floor((safeWidth + columnGapPx) / (minColumnWidthPx + columnGapPx)))
  return Math.max(1, Math.min(itemCount, maxColumns))
}

export function resolveSkillGridColumnLayout({
  contentWidthPx,
  minColumnWidthPx,
  columnGapPx,
  itemCount,
}: {
  contentWidthPx: number
  minColumnWidthPx: number
  columnGapPx: number
  itemCount: number
}) {
  if (itemCount <= 0) {
    return {
      compact: false,
      columns: 0,
      columnWidth: 0,
    }
  }

  const compact = isCompactSkillGrid(itemCount)
  const columns = compact
    ? itemCount
    : resolveAutoFitColumnCount({
        contentWidthPx,
        minColumnWidthPx,
        columnGapPx,
        itemCount,
      })
  const columnWidth = compact
    ? minColumnWidthPx
    : Math.max(1, (Math.max(1, contentWidthPx) - columnGapPx * (columns - 1)) / columns)

  return {
    compact,
    columns,
    columnWidth,
  }
}
