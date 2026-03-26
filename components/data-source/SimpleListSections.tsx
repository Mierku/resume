import { Form, Input, Select, Button, Card } from '@/components/ui/radix-adapter'
import { IconPlus, IconDelete } from '@/components/ui/radix-icons'
import { DATA_SOURCE_SECTION_IDS } from './section-meta'

const FormItem = Form.Item
const TextArea = Input.TextArea
const { Option } = Select

// 在校经历
export interface CampusExperience {
  id: string
  startDate: string
  endDate: string
  type?: string
  position?: string
  description: string
}

export function CampusExperienceSection({ data, onChange, onAdd, onRemove }: {
  data: CampusExperience[]
  onChange: (index: number, field: string, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <Card id={DATA_SOURCE_SECTION_IDS.campusExperience} title="在校经历" layout="editor-section" extra={<Button type="text" size="small" className="px-2" icon={<IconPlus />} onClick={onAdd} aria-label="添加在校经历" />}>
      {data.map((exp, index) => (
        <div key={exp.id} style={{ border: '1px solid var(--color-border)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <Button type="text" status="danger" icon={<IconDelete />} onClick={() => onRemove(index)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <FormItem label="开始时间">
              <Input value={exp.startDate} onChange={value => onChange(index, 'startDate', value)} placeholder="2020-09" />
            </FormItem>
            <FormItem label="结束时间">
              <Input value={exp.endDate} onChange={value => onChange(index, 'endDate', value)} placeholder="2021-06" />
            </FormItem>
            <FormItem label="经历类型">
              <Input value={exp.type || ''} onChange={value => onChange(index, 'type', value)} placeholder="学生会、社团" />
            </FormItem>
            <FormItem label="职位">
              <Input value={exp.position || ''} onChange={value => onChange(index, 'position', value)} placeholder="主席、部长" />
            </FormItem>
            <FormItem label="工作内容" style={{ gridColumn: 'span 3' }}>
              <TextArea value={exp.description} onChange={value => onChange(index, 'description', value)} placeholder="描述工作内容..." rows={3} />
            </FormItem>
          </div>
        </div>
      ))}
      {data.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-3)' }}>暂无在校经历</div>}
    </Card>
  )
}

// 获奖情况
export interface Award {
  id: string
  awardDate: string
  awardName: string
  awardLevel?: string
  awardDescription?: string
}

export function AwardsSection({ data, onChange, onAdd, onRemove }: {
  data: Award[]
  onChange: (index: number, field: string, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <Card id={DATA_SOURCE_SECTION_IDS.awards} title="获奖情况" layout="editor-section" extra={<Button type="text" size="small" className="px-2" icon={<IconPlus />} onClick={onAdd} aria-label="添加获奖情况" />}>
      {data.map((award, index) => (
        <div key={award.id} style={{ border: '1px solid var(--color-border)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <Button type="text" status="danger" icon={<IconDelete />} onClick={() => onRemove(index)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <FormItem label="获奖时间">
              <Input value={award.awardDate} onChange={value => onChange(index, 'awardDate', value)} placeholder="2021-06" />
            </FormItem>
            <FormItem label="奖励名称">
              <Input value={award.awardName} onChange={value => onChange(index, 'awardName', value)} placeholder="优秀学生" />
            </FormItem>
            <FormItem label="奖励等级">
              <Input value={award.awardLevel || ''} onChange={value => onChange(index, 'awardLevel', value)} placeholder="国家级、省级" />
            </FormItem>
            <FormItem label="奖励描述" style={{ gridColumn: 'span 3' }}>
              <TextArea value={award.awardDescription || ''} onChange={value => onChange(index, 'awardDescription', value)} placeholder="描述获奖情况..." rows={2} />
            </FormItem>
          </div>
        </div>
      ))}
      {data.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-3)' }}>暂无获奖情况</div>}
    </Card>
  )
}

// 外语能力
export interface Language {
  id: string
  language: string
  certificateName?: string
  level?: string
  score?: string
  proficiency?: string
  listening?: string
  reading?: string
}

export function LanguagesSection({ data, onChange, onAdd, onRemove }: {
  data: Language[]
  onChange: (index: number, field: string, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <Card id={DATA_SOURCE_SECTION_IDS.languages} title="外语能力" layout="editor-section" extra={<Button type="text" size="small" className="px-2" icon={<IconPlus />} onClick={onAdd} aria-label="添加外语能力" />}>
      {data.map((lang, index) => (
        <div key={lang.id} style={{ border: '1px solid var(--color-border)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <Button type="text" status="danger" icon={<IconDelete />} onClick={() => onRemove(index)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <FormItem label="外语语种">
              <Input value={lang.language} onChange={value => onChange(index, 'language', value)} placeholder="英语" />
            </FormItem>
            <FormItem label="证书名称">
              <Input value={lang.certificateName || ''} onChange={value => onChange(index, 'certificateName', value)} placeholder="CET-6" />
            </FormItem>
            <FormItem label="英语水平">
              <Select value={lang.level || ''} onChange={value => onChange(index, 'level', value)} placeholder="请选择">
                <Option value="一般">一般</Option>
                <Option value="良好">良好</Option>
                <Option value="熟练">熟练</Option>
                <Option value="精通">精通</Option>
              </Select>
            </FormItem>
            <FormItem label="成绩">
              <Input value={lang.score || ''} onChange={value => onChange(index, 'score', value)} placeholder="550" />
            </FormItem>
            <FormItem label="掌握程度">
              <Input value={lang.proficiency || ''} onChange={value => onChange(index, 'proficiency', value)} placeholder="熟练" />
            </FormItem>
            <FormItem label="听说能力">
              <Input value={lang.listening || ''} onChange={value => onChange(index, 'listening', value)} placeholder="良好" />
            </FormItem>
            <FormItem label="读写能力">
              <Input value={lang.reading || ''} onChange={value => onChange(index, 'reading', value)} placeholder="熟练" />
            </FormItem>
          </div>
        </div>
      ))}
      {data.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-3)' }}>暂无外语能力</div>}
    </Card>
  )
}

// 计算机技能
export interface ComputerSkill {
  id: string
  skillType: string
  proficiency?: string
}

export function ComputerSkillsSection({ data, onChange, onAdd, onRemove }: {
  data: ComputerSkill[]
  onChange: (index: number, field: string, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <Card id={DATA_SOURCE_SECTION_IDS.computerSkills} title="计算机技能" layout="editor-section" extra={<Button type="text" size="small" className="px-2" icon={<IconPlus />} onClick={onAdd} aria-label="添加计算机技能" />}>
      {data.map((skill, index) => (
        <div key={skill.id} style={{ border: '1px solid var(--color-border)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <Button type="text" status="danger" icon={<IconDelete />} onClick={() => onRemove(index)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <FormItem label="技能类型">
              <Input value={skill.skillType} onChange={value => onChange(index, 'skillType', value)} placeholder="JavaScript, React" />
            </FormItem>
            <FormItem label="掌握程度">
              <Select value={skill.proficiency || ''} onChange={value => onChange(index, 'proficiency', value)} placeholder="请选择">
                <Option value="一般">一般</Option>
                <Option value="良好">良好</Option>
                <Option value="熟练">熟练</Option>
                <Option value="精通">精通</Option>
              </Select>
            </FormItem>
          </div>
        </div>
      ))}
      {data.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-3)' }}>暂无计算机技能</div>}
    </Card>
  )
}

// 资格证书
export interface Certificate {
  id: string
  obtainDate: string
  certificateName: string
  certificateNumber?: string
  certificateDescription?: string
}

export function CertificatesSection({ data, onChange, onAdd, onRemove }: {
  data: Certificate[]
  onChange: (index: number, field: string, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  return (
    <Card id={DATA_SOURCE_SECTION_IDS.certificates} title="资格证书" layout="editor-section" extra={<Button type="text" size="small" className="px-2" icon={<IconPlus />} onClick={onAdd} aria-label="添加资格证书" />}>
      {data.map((cert, index) => (
        <div key={cert.id} style={{ border: '1px solid var(--color-border)', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <Button type="text" status="danger" icon={<IconDelete />} onClick={() => onRemove(index)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <FormItem label="获得时间">
              <Input value={cert.obtainDate} onChange={value => onChange(index, 'obtainDate', value)} placeholder="2021-06" />
            </FormItem>
            <FormItem label="证书名称">
              <Input value={cert.certificateName} onChange={value => onChange(index, 'certificateName', value)} placeholder="PMP" />
            </FormItem>
            <FormItem label="证书编号">
              <Input value={cert.certificateNumber || ''} onChange={value => onChange(index, 'certificateNumber', value)} placeholder="证书编号" />
            </FormItem>
            <FormItem label="证书说明" style={{ gridColumn: 'span 3' }}>
              <TextArea value={cert.certificateDescription || ''} onChange={value => onChange(index, 'certificateDescription', value)} placeholder="证书说明..." rows={2} />
            </FormItem>
          </div>
        </div>
      ))}
      {data.length === 0 && <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-3)' }}>暂无资格证书</div>}
    </Card>
  )
}
