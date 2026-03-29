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
import type { TemplateModuleRenderer } from './types'
import templateStyles from './styles/template-7.module.scss'

const renderTemplate7: TemplateModuleRenderer = ({ data, sectionIds, onNavigate }, helpers) => {
  const Avatar = helpers.Avatar
  const styles = { ...helpers.styles, ...templateStyles }
  const facts = helpers.extractResumeFacts(data)
  const personalLocation = helpers.resolvePersonalLocation(facts)

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
    <div className={styles.template7}>
      <div className={styles.t7Header}>
        <div {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'picture' })}>
          <Avatar data={data} className={styles.t7Avatar} square sizePt={54} />
        </div>

        <div className={styles.t7HeaderMain}>
          <h1 {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: 'name' })}>{data.basics.name || '沉浸式网申'}</h1>
          {helpers.hasMeaningfulText(facts.position) ? (
            <p {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'intention', fieldKey: 'intentionPosition' })}>求职岗位：{facts.position}</p>
          ) : null}
          {infoItems.length > 0 ? (
            <div className={styles.t7InfoGrid}>
              {infoItems.map(item => (
                <div
                  key={item.label}
                  {...helpers.getPreviewActionProps(onNavigate, { sectionId: 'basics', fieldKey: item.fieldKey }, styles.t7InfoItem)}
                >
                  <item.icon size={11} />
                  <span>{item.label}：</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.t7Badge}>个人简历</div>
      </div>

      <div className={styles.t7Separator} />

      <div className={styles.t7Body}>
        {helpers.renderSectionList(data, sectionIds, {
          headingVariant: 'gray-tab',
          itemVariant: 'compact',
          sectionHeadingClassName: styles.t7Heading,
          onNavigate,
        })}
      </div>
    </div>
  )
}

export default renderTemplate7
