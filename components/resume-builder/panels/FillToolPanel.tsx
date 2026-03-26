'use client'

import { Button, IconRefresh, Option, Select } from '../primitives'

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
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-muted-foreground">数据填充</div>
        <div className="mt-1 text-[11px] text-muted-foreground">选择数据源后，将内容填充到当前简历。</div>
      </div>

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
        <label className="text-xs text-muted-foreground block mb-1">填充策略</label>
        <Select
          value={fillStrategy}
          onChange={value => onFillStrategyChange((Array.isArray(value) ? value[0] : value) as 'overwrite' | 'preserve')}
          style={{ width: '100%' }}
        >
          <Option value="overwrite">覆盖填充</Option>
          <Option value="preserve">补空填充</Option>
        </Select>
      </div>

      <Button
        type="secondary"
        icon={<IconRefresh />}
        onClick={() => onFill(fillStrategy)}
        disabled={!selectedDataSourceId}
        style={{ width: '100%' }}
      >
        执行填充
      </Button>
    </div>
  )
}

