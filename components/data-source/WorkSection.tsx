import { Form, Input, Select, Button, Card } from '@/components/ui/radix-adapter'
import { IconPlus, IconDelete } from '@/components/ui/radix-icons'
import { MonthPickerField } from '@/components/ui/month-picker'
import { DATA_SOURCE_SECTION_IDS } from './section-meta'
import { RichTextEditor } from '@/components/resume-builder/controls/RichTextEditor/RichTextEditor'

const FormItem = Form.Item
const { Option } = Select

export interface Work {
  id: string
  startDate: string
  endDate: string
  workType?: string
  company: string
  department?: string
  salary?: string
  position: string
  description: string
  achievements?: string
  referenceName?: string
  referencePosition?: string
  referenceContact?: string
  leavingReason?: string
  subordinates?: string
}

interface Props {
  data: Work[]
  onChange: (index: number, field: string, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

export default function WorkSection({ data, onChange, onAdd, onRemove }: Props) {
  return (
    <Card 
      id={DATA_SOURCE_SECTION_IDS.work}
      title="工作经历" 
      layout="editor-section"
      extra={
        <Button type="text" size="small" className="px-2" icon={<IconPlus />} onClick={onAdd} aria-label="添加工作经历" />
      }
    >
      {data.map((w, index) => (
        <div key={w.id} style={{ border: '1px solid var(--color-border)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <Button type="text" status="danger" icon={<IconDelete />} onClick={() => onRemove(index)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <FormItem label="开始时间">
              <MonthPickerField
                value={w.startDate}
                showLabel={false}
                placeholder="选择开始时间"
                onChange={value => onChange(index, 'startDate', value)}
              />
            </FormItem>
            <FormItem label="结束时间">
              <MonthPickerField
                value={w.endDate}
                showLabel={false}
                allowPresent
                placeholder="选择结束时间"
                onChange={value => onChange(index, 'endDate', value)}
              />
            </FormItem>
            <FormItem label="工作类型">
              <Select value={w.workType || ''} onChange={value => onChange(index, 'workType', value)} placeholder="请选择">
                <Option value="全职">全职</Option>
                <Option value="兼职">兼职</Option>
                <Option value="实习">实习</Option>
              </Select>
            </FormItem>
            <FormItem label="公司">
              <Input value={w.company} onChange={value => onChange(index, 'company', value)} placeholder="字节跳动" />
            </FormItem>
            <FormItem label="部门">
              <Input value={w.department || ''} onChange={value => onChange(index, 'department', value)} placeholder="技术部" />
            </FormItem>
            <FormItem label="工资">
              <Input value={w.salary || ''} onChange={value => onChange(index, 'salary', value)} placeholder="15K" />
            </FormItem>
            <FormItem label="职位">
              <Input value={w.position} onChange={value => onChange(index, 'position', value)} placeholder="前端工程师" />
            </FormItem>
            <FormItem label="证明人姓名">
              <Input value={w.referenceName || ''} onChange={value => onChange(index, 'referenceName', value)} placeholder="证明人" />
            </FormItem>
            <FormItem label="证明人职位">
              <Input value={w.referencePosition || ''} onChange={value => onChange(index, 'referencePosition', value)} placeholder="主管" />
            </FormItem>
            <FormItem label="证明人联系方式">
              <Input value={w.referenceContact || ''} onChange={value => onChange(index, 'referenceContact', value)} placeholder="联系方式" />
            </FormItem>
            <FormItem label="离职原因">
              <Input value={w.leavingReason || ''} onChange={value => onChange(index, 'leavingReason', value)} placeholder="个人发展" />
            </FormItem>
            <FormItem label="下属人数">
              <Input value={w.subordinates || ''} onChange={value => onChange(index, 'subordinates', value)} placeholder="5" />
            </FormItem>
            <FormItem label="工作内容" style={{ gridColumn: 'span 3' }}>
              <RichTextEditor
                value={String(w.description || '')}
                onChange={value => onChange(index, 'description', value)}
                placeholder="描述您的工作职责..."
                minHeight={120}
              />
            </FormItem>
            <FormItem label="工作成果" style={{ gridColumn: 'span 3' }}>
              <RichTextEditor
                value={String(w.achievements || '')}
                onChange={value => onChange(index, 'achievements', value)}
                placeholder="描述您的工作成果..."
                minHeight={120}
              />
            </FormItem>
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-3)' }}>
          暂无工作经历
        </div>
      )}
    </Card>
  )
}
