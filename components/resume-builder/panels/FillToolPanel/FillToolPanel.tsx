'use client'

import { useState } from 'react'
import { Button, IconRefresh, Option, Select } from '../../primitives'

type FillMode = 'data-source' | 'resume-parse' | 'ai-fill'

const FILL_MODE_OPTIONS: Array<{
  id: FillMode
  title: string
  status: string
  available: boolean
}> = [
  {
    id: 'data-source',
    title: '数据源',
    status: '已就绪',
    available: true,
  },
  {
    id: 'resume-parse',
    title: '简历解析',
    status: '即将开放',
    available: false,
  },
  {
    id: 'ai-fill',
    title: 'AI 填充',
    status: '即将开放',
    available: false,
  },
]

interface FillToolPanelProps {
  dataSources: Array<{ id: string; name: string }>
  selectedDataSourceId: string
  fillStrategy: 'overwrite' | 'preserve'
  onDataSourceChange: (value: string) => void
  onFillStrategyChange: (value: 'overwrite' | 'preserve') => void
  onFill: (strategy: 'overwrite' | 'preserve') => void
}

export function FillToolPanel({
  dataSources,
  selectedDataSourceId,
  fillStrategy,
  onDataSourceChange,
  onFillStrategyChange,
  onFill,
}: FillToolPanelProps) {
  const [activeMode, setActiveMode] = useState<FillMode>('data-source')
  const activeModeMeta = FILL_MODE_OPTIONS.find(option => option.id === activeMode) ?? FILL_MODE_OPTIONS[0]

  return (
    <div className="resume-fill-panel space-y-4">
      <div className="resume-fill-mode-toolbar">
        <div className="resume-fill-mode-toolbar-control">
          <Select
            value={activeMode}
            onChange={value => setActiveMode((Array.isArray(value) ? value[0] : value) as FillMode)}
            style={{ width: '100%' }}
          >
            {FILL_MODE_OPTIONS.map(option => (
              <Option key={option.id} value={option.id}>
                {option.title}
              </Option>
            ))}
          </Select>
        </div>
      </div>

      <section className="resume-auto-fill-panel" aria-label={`${activeModeMeta.title}设置`}>
        <div className="resume-auto-fill-panel-head">
          <h3 className="resume-auto-fill-panel-title">{activeModeMeta.title}</h3>
          <span className={`resume-auto-fill-state${activeModeMeta.available ? ' is-available' : ''}`}>
            {activeModeMeta.status}
          </span>
        </div>

        {activeMode === 'data-source' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">数据源</label>
              <Select
                value={selectedDataSourceId}
                placeholder="选择数据源"
                onChange={value => onDataSourceChange(Array.isArray(value) ? value[0] || '' : value)}
                style={{ width: '100%' }}
                allowClear
              >
                {dataSources.map(source => (
                  <Option key={source.id} value={source.id}>
                    {source.name}
                  </Option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">写入方式</label>
              <Select
                value={fillStrategy}
                onChange={value => onFillStrategyChange((Array.isArray(value) ? value[0] : value) as 'overwrite' | 'preserve')}
                style={{ width: '100%' }}
              >
                <Option value="overwrite">覆盖现有文案</Option>
                <Option value="preserve">优先补空白</Option>
              </Select>
            </div>

            <Button
              type="secondary"
              icon={<IconRefresh />}
              onClick={() => onFill(fillStrategy)}
              disabled={!selectedDataSourceId}
              style={{ width: '100%' }}
            >
              开始自动填充
            </Button>
          </div>
        ) : (
          <div className="resume-auto-fill-empty">功能开发中</div>
        )}
      </section>
    </div>
  )
}
