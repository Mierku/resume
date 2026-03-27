import { Form, Input, Button, Card } from '@/components/ui/radix-adapter'
import { IconPlus, IconDelete } from '@/components/ui/radix-icons'
import { MonthPickerField } from '@/components/ui/month-picker'
import { DATA_SOURCE_SECTION_IDS } from './section-meta'

const FormItem = Form.Item
const TextArea = Input.TextArea

export interface Project {
  id: string
  startDate?: string
  endDate?: string
  role?: string
  name: string
  description: string
  responsibilities?: string
  achievements?: string
  url?: string
  technologies?: string
}

interface Props {
  data: Project[]
  onChange: (index: number, field: string, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

export default function ProjectSection({ data, onChange, onAdd, onRemove }: Props) {
  return (
    <Card 
      id={DATA_SOURCE_SECTION_IDS.projects}
      title="项目经历" 
      layout="editor-section"
      extra={
        <Button type="text" size="small" className="px-2" icon={<IconPlus />} onClick={onAdd} aria-label="添加项目经历" />
      }
    >
      {data.map((p, index) => (
        <div key={p.id} style={{ border: '1px solid var(--color-border)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <Button type="text" status="danger" icon={<IconDelete />} onClick={() => onRemove(index)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <FormItem label="开始时间">
              <MonthPickerField
                value={p.startDate || ''}
                showLabel={false}
                placeholder="选择开始时间"
                onChange={value => onChange(index, 'startDate', value)}
              />
            </FormItem>
            <FormItem label="结束时间">
              <MonthPickerField
                value={p.endDate || ''}
                showLabel={false}
                allowPresent
                placeholder="选择结束时间"
                onChange={value => onChange(index, 'endDate', value)}
              />
            </FormItem>
            <FormItem label="职位">
              <Input value={p.role || ''} onChange={value => onChange(index, 'role', value)} placeholder="前端负责人" />
            </FormItem>
            <FormItem label="项目名称" style={{ gridColumn: 'span 3' }}>
              <Input value={p.name} onChange={value => onChange(index, 'name', value)} placeholder="沉浸式网申" />
            </FormItem>
            <FormItem label="项目内容" style={{ gridColumn: 'span 3' }}>
              <TextArea value={p.description} onChange={value => onChange(index, 'description', value)} placeholder="描述项目内容..." rows={3} />
            </FormItem>
            <FormItem label="本人职责" style={{ gridColumn: 'span 3' }}>
              <TextArea value={p.responsibilities || ''} onChange={value => onChange(index, 'responsibilities', value)} placeholder="描述您的职责..." rows={2} />
            </FormItem>
            <FormItem label="项目成果" style={{ gridColumn: 'span 3' }}>
              <TextArea value={p.achievements || ''} onChange={value => onChange(index, 'achievements', value)} placeholder="描述项目成果..." rows={2} />
            </FormItem>
            <FormItem label="项目链接" style={{ gridColumn: 'span 3' }}>
              <Input value={p.url || ''} onChange={value => onChange(index, 'url', value)} placeholder="https://..." />
            </FormItem>
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-3)' }}>
          暂无项目经历
        </div>
      )}
    </Card>
  )
}
