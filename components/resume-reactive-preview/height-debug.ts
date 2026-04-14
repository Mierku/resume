export interface HeightDebugMetricBreakdown {
  textHeightPx: number
  paddingPx: number
  borderPx: number
  marginPx: number
  totalHeightPx: number
}

export interface HeightDebugBlockRow {
  id: string
  sectionId: string
  predicted: HeightDebugMetricBreakdown
  actual: HeightDebugMetricBreakdown | null
}

export interface HeightDebugSnapshot {
  available: boolean
  pageCount: number
  reason?: 'unsupported-template' | 'multi-page'
  predictedHeightPx: number | null
  actualContentHeightPx: number
  heightDeltaPx: number | null
  pageViewportHeightPx: number
  contentMaxHeightPx: number | null
  overflowPx: number | null
  contentMaxOverflowPx: number | null
  scaleX: number
  scaleY: number
  blockCount: number
  measuredBlocks: number
  textDeltaPx: number
  paddingDeltaPx: number
  borderDeltaPx: number
  marginDeltaPx: number
  rows: HeightDebugBlockRow[]
}
