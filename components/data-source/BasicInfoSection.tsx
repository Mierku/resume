import { useEffect } from 'react'
import { Form, Input, Select, DatePicker, Card } from '@/components/ui/radix-adapter'
import { DATA_SOURCE_SECTION_IDS } from './section-meta'

const FormItem = Form.Item
const { Option } = Select

const ETHNIC_GROUPS = [
  '汉族',
  '蒙古族',
  '回族',
  '藏族',
  '维吾尔族',
  '苗族',
  '彝族',
  '壮族',
  '布依族',
  '朝鲜族',
  '满族',
  '侗族',
  '瑶族',
  '白族',
  '土家族',
  '哈尼族',
  '哈萨克族',
  '傣族',
  '黎族',
  '傈僳族',
  '佤族',
  '畲族',
  '高山族',
  '拉祜族',
  '水族',
  '东乡族',
  '纳西族',
  '景颇族',
  '柯尔克孜族',
  '土族',
  '达斡尔族',
  '仫佬族',
  '羌族',
  '布朗族',
  '撒拉族',
  '毛南族',
  '仡佬族',
  '锡伯族',
  '阿昌族',
  '普米族',
  '塔吉克族',
  '怒族',
  '乌孜别克族',
  '俄罗斯族',
  '鄂温克族',
  '德昂族',
  '保安族',
  '裕固族',
  '京族',
  '塔塔尔族',
  '独龙族',
  '鄂伦春族',
  '赫哲族',
  '门巴族',
  '珞巴族',
  '基诺族',
] as const

interface BasicInfo {
  nameZh?: string
  nameEn?: string
  nationality?: string
  phone?: string
  email?: string
  idType?: string
  idNumber?: string
  birthDate?: string
  gender?: string
  wechat?: string
  qq?: string
  politicalStatus?: string
  maritalStatus?: string
  householdRegistration?: string
  nativePlace?: string
  birthplace?: string
  height?: string
  weight?: string
  healthStatus?: string
  specialty?: string
  workYears?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  country?: string
  currentResidence?: string
  mailingAddress?: string
  location?: string
  website?: string
  linkedin?: string
  github?: string
}

interface Props {
  data: BasicInfo
  onChange: (field: string, value: string) => void
}

export default function BasicInfoSection({ data, onChange }: Props) {
  useEffect(() => {
    if (data.idType !== '身份证') {
      onChange('idType', '身份证')
    }
  }, [data.idType, onChange])

  return (
    <Card id={DATA_SOURCE_SECTION_IDS.basics} title="基本信息" layout="editor-section">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <FormItem label="姓名">
          <Input
            value={data.nameZh || ''}
            onChange={value => onChange('nameZh', value)}
            placeholder="张三"
          />
        </FormItem>
        <FormItem label="民族">
          <Select
            value={data.nationality || ''}
            onChange={value => onChange('nationality', value)}
            placeholder="请选择民族"
            showSearch
            allowClear
          >
            {ETHNIC_GROUPS.map(group => (
              <Option key={group} value={group}>
                {group}
              </Option>
            ))}
          </Select>
        </FormItem>
        <FormItem label="电话">
          <Input
            value={data.phone || ''}
            onChange={value => onChange('phone', value)}
            placeholder="13800138000"
          />
        </FormItem>
        <FormItem label="邮箱">
          <Input
            value={data.email || ''}
            onChange={value => onChange('email', value)}
            placeholder="your@email.com"
          />
        </FormItem>
        <FormItem label="身份证号码" style={{ gridColumn: 'span 2' }}>
          <Input
            value={data.idNumber || ''}
            onChange={value => onChange('idNumber', value)}
            placeholder="请输入身份证号码"
          />
        </FormItem>
        <FormItem label="出生日期">
          <DatePicker
            value={data.birthDate || ''}
            onChange={(dateString) => onChange('birthDate', dateString)}
            placeholder="请选择出生日期"
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        </FormItem>
        <FormItem label="性别">
          <Select
            value={data.gender || ''}
            onChange={value => onChange('gender', value)}
            placeholder="请选择"
          >
            <Option value="男">男</Option>
            <Option value="女">女</Option>
            <Option value="保密">保密</Option>
          </Select>
        </FormItem>
        <FormItem label="微信号">
          <Input
            value={data.wechat || ''}
            onChange={value => onChange('wechat', value)}
            placeholder="微信号"
          />
        </FormItem>
        <FormItem label="QQ">
          <Input
            value={data.qq || ''}
            onChange={value => onChange('qq', value)}
            placeholder="QQ号"
          />
        </FormItem>
        <FormItem label="政治面貌">
          <Select
            value={data.politicalStatus || ''}
            onChange={value => onChange('politicalStatus', value)}
            placeholder="请选择"
          >
            <Option value="群众">群众</Option>
            <Option value="团员">团员</Option>
            <Option value="党员">党员</Option>
            <Option value="民主党派">民主党派</Option>
          </Select>
        </FormItem>
        <FormItem label="婚姻状况">
          <Select
            value={data.maritalStatus || ''}
            onChange={value => onChange('maritalStatus', value)}
            placeholder="请选择"
          >
            <Option value="未婚">未婚</Option>
            <Option value="已婚">已婚</Option>
            <Option value="离异">离异</Option>
          </Select>
        </FormItem>
        <FormItem label="户籍">
          <Input
            value={data.householdRegistration || ''}
            onChange={value => onChange('householdRegistration', value)}
            placeholder="户籍所在地"
          />
        </FormItem>
        <FormItem label="籍贯">
          <Input
            value={data.nativePlace || ''}
            onChange={value => onChange('nativePlace', value)}
            placeholder="请选择籍贯"
          />
        </FormItem>
        <FormItem label="生源地">
          <Input
            value={data.birthplace || ''}
            onChange={value => onChange('birthplace', value)}
            placeholder="请选择生源地"
          />
        </FormItem>
        <FormItem label="身高(cm)">
          <Input
            value={data.height || ''}
            onChange={value => onChange('height', value)}
            placeholder="170"
          />
        </FormItem>
        <FormItem label="体重(kg)">
          <Input
            value={data.weight || ''}
            onChange={value => onChange('weight', value)}
            placeholder="65"
          />
        </FormItem>
        <FormItem label="健康状况">
          <Input
            value={data.healthStatus || ''}
            onChange={value => onChange('healthStatus', value)}
            placeholder="健康"
          />
        </FormItem>
        <FormItem label="特长">
          <Input
            value={data.specialty || ''}
            onChange={value => onChange('specialty', value)}
            placeholder="特长"
          />
        </FormItem>
        <FormItem label="工作年限">
          <Input
            value={data.workYears || ''}
            onChange={value => onChange('workYears', value)}
            placeholder="3年"
          />
        </FormItem>
        <FormItem label="紧急联系人姓名">
          <Input
            value={data.emergencyContactName || ''}
            onChange={value => onChange('emergencyContactName', value)}
            placeholder="紧急联系人"
          />
        </FormItem>
        <FormItem label="紧急联系人电话">
          <Input
            value={data.emergencyContactPhone || ''}
            onChange={value => onChange('emergencyContactPhone', value)}
            placeholder="联系电话"
          />
        </FormItem>
        <FormItem label="国家/地区">
          <Input
            value={data.country || ''}
            onChange={value => onChange('country', value)}
            placeholder="中国"
          />
        </FormItem>
        <FormItem label="现居住地">
          <Input
            value={data.currentResidence || ''}
            onChange={value => onChange('currentResidence', value)}
            placeholder="北京市朝阳区"
          />
        </FormItem>
        <FormItem label="通信地址" style={{ gridColumn: 'span 3' }}>
          <Input
            value={data.mailingAddress || ''}
            onChange={value => onChange('mailingAddress', value)}
            placeholder="详细通信地址"
          />
        </FormItem>
      </div>
    </Card>
  )
}
