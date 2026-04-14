'use client'

import styles from './ResumeStructurePanel.module.css'

interface ResumeStructureItem {
  id: string
  title: string
  meta: string
  muted?: boolean
}

interface ResumeStructurePanelProps {
  templateName: string
  pageCount: number
  totalSections: number
  customSectionCount: number
  items: ResumeStructureItem[]
  onJumpToSection: (sectionId: string) => void
}

export function ResumeStructurePanel({
  templateName,
  pageCount,
  totalSections,
  customSectionCount,
  items,
  onJumpToSection,
}: ResumeStructurePanelProps) {
  return (
    <div className={`resume-workbench-stack ${styles.panel}`}>
      <div className="resume-workbench-hero">
        <strong className="resume-workbench-hero-title">{templateName}</strong>
      </div>

      <div className="resume-workbench-metrics">
        <div className="resume-workbench-metric">
          <strong>{pageCount}</strong>
          <span>页面</span>
        </div>
        <div className="resume-workbench-metric">
          <strong>{totalSections}</strong>
          <span>区块</span>
        </div>
        <div className="resume-workbench-metric">
          <strong>{customSectionCount}</strong>
          <span>自定义</span>
        </div>
      </div>

      <div className="resume-workbench-section-list">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            className={`resume-workbench-section-pill${item.muted ? ' is-muted' : ''}`}
            onClick={() => onJumpToSection(item.id)}
          >
            <span className="resume-workbench-section-pill-title">{item.title}</span>
            <span className="resume-workbench-section-pill-meta">{item.meta}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
