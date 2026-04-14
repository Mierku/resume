'use client'

import type { HeightDebugSnapshot } from '@/components/resume-reactive-preview/height-debug'
import styles from './HeightDebugPanel.module.css'

interface HeightDebugPanelProps {
  snapshot: HeightDebugSnapshot | null
}

function formatPx(value: number | null | undefined) {
  return Number.isFinite(value) ? `${(value as number).toFixed(1)}px` : '--'
}

function formatDeltaPx(value: number | null | undefined) {
  return Number.isFinite(value) ? `${(value as number) >= 0 ? '+' : ''}${(value as number).toFixed(1)}px` : '--'
}

function getUnavailableMessage(snapshot: HeightDebugSnapshot | null) {
  if (!snapshot) {
    return '正在等待当前预览的高度测量结果。'
  }

  if (snapshot.reason === 'multi-page') {
    return `当前预览共有 ${snapshot.pageCount} 页，Height Debug 仅在单页预览时开放。`
  }

  if (snapshot.reason === 'unsupported-template') {
    return '当前模板还没有接入可测量的高度估算链路。'
  }

  return '当前预览暂时没有可用的高度调试数据。'
}

export function HeightDebugPanel({ snapshot }: HeightDebugPanelProps) {
  if (!snapshot || !snapshot.available) {
    return (
      <div className={`resume-workbench-stack ${styles.panel}`}>
        <div className={styles.hero}>
          <strong className={styles.heroTitle}>Height Debug</strong>
          <p className={styles.heroText}>把页面预测高度、实际高度和区块偏差收进工作台里，方便和左侧其他工具一起看。</p>
        </div>

        <div className={styles.emptyCard}>
          <div className={styles.emptyTitle}>当前不可用</div>
          <p className={styles.emptyText}>{getUnavailableMessage(snapshot)}</p>
        </div>
      </div>
    )
  }

  const summaryCards = [
    {
      label: '内容总高',
      value: formatDeltaPx(snapshot.heightDeltaPx),
      meta: `${formatPx(snapshot.predictedHeightPx)} / ${formatPx(snapshot.actualContentHeightPx)}`,
    },
    {
      label: '页面溢出',
      value: formatDeltaPx(snapshot.overflowPx),
      meta: `page ${formatPx(snapshot.pageViewportHeightPx)}`,
    },
    {
      label: '内容上限',
      value: formatDeltaPx(snapshot.contentMaxOverflowPx),
      meta: `max ${formatPx(snapshot.contentMaxHeightPx)}`,
    },
    {
      label: '测量块',
      value: `${snapshot.measuredBlocks}/${snapshot.blockCount}`,
      meta: `scale ${snapshot.scaleX.toFixed(3)} / ${snapshot.scaleY.toFixed(3)}`,
    },
  ]

  const componentDeltas = [
    { label: 'Text Δ', value: formatDeltaPx(snapshot.textDeltaPx) },
    { label: 'Padding Δ', value: formatDeltaPx(snapshot.paddingDeltaPx) },
    { label: 'Border Δ', value: formatDeltaPx(snapshot.borderDeltaPx) },
    { label: 'Margin Δ', value: formatDeltaPx(snapshot.marginDeltaPx) },
  ]

  return (
    <div className={`resume-workbench-stack ${styles.panel}`}>
      <div className={styles.hero}>
        <strong className={styles.heroTitle}>Height Debug</strong>
        <p className={styles.heroText}>只保留一条调试链路：预览负责产出测量结果，这里统一查看偏差和 block 明细。</p>
      </div>

      <div className={styles.metricGrid}>
        {summaryCards.map(card => (
          <article key={card.label} className={styles.metricCard}>
            <span className={styles.metricLabel}>{card.label}</span>
            <strong className={styles.metricValue}>{card.value}</strong>
            <span className={styles.metricMeta}>{card.meta}</span>
          </article>
        ))}
      </div>

      <div className={styles.summaryCard}>
        {componentDeltas.map(item => (
          <div key={item.label} className={styles.summaryRow}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <div className={styles.blockList}>
        {snapshot.rows.map(row => (
          <article key={row.id} className={styles.blockCard}>
            <div className={styles.blockTitle}>
              <strong>{row.id}</strong>
              <span>{row.sectionId}</span>
            </div>
            <div className={styles.blockMetrics}>
              <div className={styles.blockMetric}>
                <span>total</span>
                <strong>{formatDeltaPx(row.actual ? row.predicted.totalHeightPx - row.actual.totalHeightPx : null)}</strong>
              </div>
              <div className={styles.blockMetric}>
                <span>text</span>
                <strong>{formatDeltaPx(row.actual ? row.predicted.textHeightPx - row.actual.textHeightPx : null)}</strong>
              </div>
              <div className={styles.blockMetric}>
                <span>padding</span>
                <strong>{formatDeltaPx(row.actual ? row.predicted.paddingPx - row.actual.paddingPx : null)}</strong>
              </div>
              <div className={styles.blockMetric}>
                <span>border</span>
                <strong>{formatDeltaPx(row.actual ? row.predicted.borderPx - row.actual.borderPx : null)}</strong>
              </div>
              <div className={styles.blockMetric}>
                <span>margin</span>
                <strong>{formatDeltaPx(row.actual ? row.predicted.marginPx - row.actual.marginPx : null)}</strong>
              </div>
            </div>
            <div className={styles.blockDetailGrid}>
              <div className={styles.detailColumn}>
                <span className={styles.detailLabel}>Predicted</span>
                <span>{formatPx(row.predicted.totalHeightPx)}</span>
                <span>{formatPx(row.predicted.textHeightPx)}</span>
                <span>{formatPx(row.predicted.paddingPx)}</span>
                <span>{formatPx(row.predicted.borderPx)}</span>
                <span>{formatPx(row.predicted.marginPx)}</span>
              </div>
              <div className={styles.detailColumn}>
                <span className={styles.detailLabel}>Actual</span>
                <span>{formatPx(row.actual?.totalHeightPx)}</span>
                <span>{formatPx(row.actual?.textHeightPx)}</span>
                <span>{formatPx(row.actual?.paddingPx)}</span>
                <span>{formatPx(row.actual?.borderPx)}</span>
                <span>{formatPx(row.actual?.marginPx)}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
