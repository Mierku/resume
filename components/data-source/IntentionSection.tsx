import { Form, Input, Card } from '@/components/ui/radix-adapter'
import { DATA_SOURCE_SECTION_IDS } from './section-meta'

const FormItem = Form.Item

interface Intention {
  expectedJoinDate?: string
  expectedCity?: string
  expectedSalary?: string
  position?: string
  location?: string
  salaryMin?: string
  salaryMax?: string
  availableDate?: string
}

interface Props {
  data: Intention
  onChange: (field: string, value: string) => void
}

export default function IntentionSection({ data, onChange }: Props) {
  return (
    <Card id={DATA_SOURCE_SECTION_IDS.intention} title="求职意向" layout="editor-section">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <FormItem label="预计入职时间">
          <Input
            value={data.expectedJoinDate || ''}
            onChange={value => onChange('expectedJoinDate', value)}
            placeholder="随时到岗"
          />
        </FormItem>
        <FormItem label="期望工作城市">
          <Input
            value={data.expectedCity || ''}
            onChange={value => onChange('expectedCity', value)}
            placeholder="北京、上海"
          />
        </FormItem>
        <FormItem label="期望薪资">
          <Input
            value={data.expectedSalary || ''}
            onChange={value => onChange('expectedSalary', value)}
            placeholder="15-20K"
          />
        </FormItem>
      </div>
    </Card>
  )
}
