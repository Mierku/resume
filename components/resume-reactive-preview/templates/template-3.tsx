import {
  BadgeCheck,
  BriefcaseBusiness,
  Cake,
  CalendarDays,
  Globe,
  Heart,
  Mail,
  MapPin,
  Phone,
  Ruler,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { PreviewNavigationTarget, TemplateModuleRenderer } from './types'
import templateStyles from './styles/template-3.module.scss'

const renderTemplate3: TemplateModuleRenderer = ({ data, sectionIds, onNavigate }, helpers) => {
  const Avatar = helpers.Avatar
  const styles = { ...helpers.styles, ...templateStyles }
  const facts = helpers.extractResumeFacts(data)
  const personalLocation = helpers.resolvePersonalLocation(facts)
  const headline = String(data.basics.headline || '').trim()

  const intentionItems: Array<{ key: string; value: string; target: PreviewNavigationTarget }> = [
    { key: 'position', value: facts.position, target: { sectionId: 'intention', fieldKey: 'intentionPosition' } },
    { key: 'target-city', value: facts.targetCity, target: { sectionId: 'intention', fieldKey: 'intentionCity' } },
    { key: 'salary', value: facts.salary, target: { sectionId: 'intention', fieldKey: 'intentionSalary' } },
    { key: 'availability', value: facts.availability, target: { sectionId: 'intention', fieldKey: 'intentionAvailability' } },
  ]

  const infoItems: Array<{ icon: LucideIcon; label: string; value: string; fieldKey: string }> = [
    { icon: Cake, label: '出生年月', value: facts.birthDate, fieldKey: 'birthDate' },
    { icon: CalendarDays, label: '年 龄', value: facts.age, fieldKey: 'birthDate' },
    { icon: UserRound, label: '性 别', value: facts.gender, fieldKey: 'gender' },
    { icon: Heart, label: '婚姻状况', value: facts.maritalStatus, fieldKey: 'maritalStatus' },
    { icon: Users, label: '民 族', value: facts.ethnicity, fieldKey: 'ethnicity' },
    { icon: BadgeCheck, label: '政治面貌', value: facts.politicalStatus, fieldKey: 'politicalStatus' },
    { icon: MapPin, label: '籍 贯', value: personalLocation, fieldKey: helpers.resolveLocationFieldKey(data) },
    { icon: Ruler, label: '身 高', value: facts.height, fieldKey: 'heightCm' },
    { icon: Ruler, label: '体 重', value: facts.weight, fieldKey: 'weightKg' },
    { icon: BriefcaseBusiness, label: '工作年限', value: facts.experience, fieldKey: 'workYears' },
    { icon: Phone, label: '电 话', value: data.basics.phone, fieldKey: 'phone' },
    { icon: Mail, label: '邮 箱', value: data.basics.email, fieldKey: 'email' },
    { icon: Globe, label: '网 站', value: facts.website, fieldKey: helpers.resolveWebsiteFieldKey(data) },
  ].filter(item => helpers.hasMeaningfulText(item.value))

  return (
    <div className={styles.template3}>
      <div className={styles.t3Header}>
        <div className={styles.t3HeaderMain}>
          <h1 {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '沉浸式网申'}</h1>
          {headline ? (
            <p {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: 'intentionPosition' }, styles.t3Subtitle)}>
              {headline}
            </p>
          ) : null}
          {intentionItems.some(item => helpers.hasMeaningfulText(item.value)) ? (
            <p className={styles.t3IntentLine}>
              <span>求职意向：</span>
              <strong>{helpers.renderInlineTargetList(intentionItems, onNavigate)}</strong>
            </p>
          ) : null}

          {infoItems.length > 0 ? (
            <div className={styles.t3InfoGrid}>
              {infoItems.map(item => (
                <div
                  key={item.label}
                  {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey }, styles.t3InfoItem)}
                >
                  <item.icon size={12} />
                  <span>{item.label}：</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t3Avatar} square sizePt={64} />
        </div>
      </div>

      <div className={styles.t3Body}>
        {helpers.renderSectionList(data, sectionIds, {
          headingVariant: 'icon-line',
          itemVariant: 'timeline',
          sectionHeadingClassName: styles.t3Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

export default renderTemplate3
