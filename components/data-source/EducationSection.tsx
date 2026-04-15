import { Form, Input, Select, Button, Card } from '@/components/ui/radix-adapter'
import { IconPlus, IconDelete } from '@/components/ui/radix-icons'
import { MonthPickerField } from '@/components/ui/month-picker'
import { DATA_SOURCE_SECTION_IDS } from './section-meta'
import { RichTextEditor } from '@/components/resume-builder/controls/RichTextEditor/RichTextEditor'

const FormItem = Form.Item
const { Option } = Select

export interface Education {
  id: string
  startDate: string
  endDate: string
  degree: string
  school: string
  college?: string
  major: string
  academicDegree?: string
  learningForm?: string
  courses?: string
  researchDirection?: string
  thesis?: string
  gpa?: string
  ranking?: string
  isOverseas?: string
  minorMajor?: string
  supervisor?: string
  description?: string
}

interface Props {
  data: Education[]
  onChange: (index: number, field: string, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}

export default function EducationSection({ data, onChange, onAdd, onRemove }: Props) {
  return (
    <Card 
      id={DATA_SOURCE_SECTION_IDS.education}
      title="教育经历" 
      layout="editor-section"
      extra={
        <Button type="text" size="small" className="px-2" icon={<IconPlus />} onClick={onAdd} aria-label="添加教育经历" />
      }
    >
      {data.map((edu, index) => (
        <div key={edu.id} style={{ border: '1px solid var(--color-border)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <Button type="text" status="danger" icon={<IconDelete />} onClick={() => onRemove(index)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <FormItem label="开始时间">
              <MonthPickerField
                value={edu.startDate}
                showLabel={false}
                placeholder="选择开始时间"
                onChange={value => onChange(index, 'startDate', value)}
              />
            </FormItem>
            <FormItem label="结束时间">
              <MonthPickerField
                value={edu.endDate}
                showLabel={false}
                allowPresent
                placeholder="选择结束时间"
                onChange={value => onChange(index, 'endDate', value)}
              />
            </FormItem>
            <FormItem label="学历">
              <Select value={edu.degree} onChange={value => onChange(index, 'degree', value)} placeholder="请选择" showSearch>
                <Option value="高中">高中</Option>
                <Option value="中专">中专</Option>
                <Option value="大专">大专</Option>
                <Option value="专科">专科</Option>
                <Option value="本科">本科</Option>
                <Option value="大学本科">大学本科</Option>
                <Option value="硕士">硕士</Option>
                <Option value="硕士研究生">硕士研究生</Option>
                <Option value="博士">博士</Option>
                <Option value="博士研究生">博士研究生</Option>
              </Select>
            </FormItem>
            <FormItem label="学校">
              <Input value={edu.school} onChange={value => onChange(index, 'school', value)} placeholder="北京大学" />
            </FormItem>
            <FormItem label="学院（院系）">
              <Input value={edu.college || ''} onChange={value => onChange(index, 'college', value)} placeholder="计算机学院" />
            </FormItem>
            <FormItem label="专业">
              <Input value={edu.major} onChange={value => onChange(index, 'major', value)} placeholder="计算机科学与技术" />
            </FormItem>
            <FormItem label="学位">
              <Select value={edu.academicDegree || ''} onChange={value => onChange(index, 'academicDegree', value)} placeholder="请选择" showSearch allowClear>
                <Option value="学士">学士</Option>
                <Option value="学士学位">学士学位</Option>
                <Option value="硕士">硕士</Option>
                <Option value="硕士学位">硕士学位</Option>
                <Option value="博士">博士</Option>
                <Option value="博士学位">博士学位</Option>
                <Option value="无">无</Option>
              </Select>
            </FormItem>
            <FormItem label="学习形式">
              <Select value={edu.learningForm || ''} onChange={value => onChange(index, 'learningForm', value)} placeholder="请选择">
                <Option value="全日制">全日制</Option>
                <Option value="非全日制">非全日制</Option>
              </Select>
            </FormItem>
            <FormItem label="专业课程">
              <Input value={edu.courses || ''} onChange={value => onChange(index, 'courses', value)} placeholder="数据结构、算法" />
            </FormItem>
            <FormItem label="研究方向">
              <Input value={edu.researchDirection || ''} onChange={value => onChange(index, 'researchDirection', value)} placeholder="人工智能" />
            </FormItem>
            <FormItem label="毕业论文">
              <Input value={edu.thesis || ''} onChange={value => onChange(index, 'thesis', value)} placeholder="论文题目" />
            </FormItem>
            <FormItem label="成绩（GPA）">
              <Input value={edu.gpa || ''} onChange={value => onChange(index, 'gpa', value)} placeholder="3.8/4.0" />
            </FormItem>
            <FormItem label="专业排名">
              <Input value={edu.ranking || ''} onChange={value => onChange(index, 'ranking', value)} placeholder="5/100" />
            </FormItem>
            <FormItem label="是否为海外教育经历">
              <Select value={edu.isOverseas || ''} onChange={value => onChange(index, 'isOverseas', value)} placeholder="请选择">
                <Option value="是">是</Option>
                <Option value="否">否</Option>
              </Select>
            </FormItem>
            <FormItem label="辅修/双学位专业">
              <Input value={edu.minorMajor || ''} onChange={value => onChange(index, 'minorMajor', value)} placeholder="金融学" />
            </FormItem>
            <FormItem label="导师姓名">
              <Input value={edu.supervisor || ''} onChange={value => onChange(index, 'supervisor', value)} placeholder="导师姓名" />
            </FormItem>
            <FormItem label="教育内容" style={{ gridColumn: 'span 3' }}>
              <RichTextEditor
                value={String(edu.description || '')}
                onChange={value => onChange(index, 'description', value)}
                placeholder="描述课程重点、学术成果、实践经历..."
                minHeight={120}
              />
            </FormItem>
          </div>
        </div>
      ))}
      {data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-3)' }}>
          暂无教育经历
        </div>
      )}
    </Card>
  )
}
